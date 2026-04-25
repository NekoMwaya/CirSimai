import { getPins, snap } from './math';
import {
  AI_LAYOUT_GRID_WIDTH,
  AI_LAYOUT_GRID_HEIGHT,
  AI_LAYOUT_OFFSET_X,
  AI_LAYOUT_OFFSET_Y,
  canvasFromLayoutCell
} from './aiLayoutGrid';

function parseValue(valueTokens, fallback = '') {
  if (!valueTokens?.length) return fallback;
  return valueTokens.join(' ');
}

function mapSourceNodesForCanvas(nPos, nNeg) {
  const positiveNode = String(nPos || '').trim();
  const negativeNode = String(nNeg || '').trim();

  // Keep node 0 on pin 0 (the visual negative terminal) for intuitive grounding.
  if (positiveNode === '0' && negativeNode !== '0') {
    return ['0', negativeNode];
  }

  // Standard source definition: V n+ n- value, where n- is commonly node 0.
  return [negativeNode, positiveNode];
}

function createComponent(type, label, value, x, y, extra = {}) {
  return {
    id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    label,
    value,
    x: snap(x),
    y: snap(y),
    rotation: 0,
    flip: false,
    ...extra
  };
}

function parseSpiceLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('*') || trimmed.startsWith('.') || trimmed.startsWith(';')) {
    return null;
  }

  const tokens = trimmed.split(/\s+/);
  if (tokens.length < 3) return null;

  const name = tokens[0];
  const prefix = name[0].toUpperCase();

  if (prefix === 'R') {
    return { type: 'resistor', label: name, nodes: [tokens[1], tokens[2]], value: parseValue(tokens.slice(3), '1k') };
  }
  if (prefix === 'C') {
    return { type: 'capacitor', label: name, nodes: [tokens[1], tokens[2]], value: parseValue(tokens.slice(3), '1u') };
  }
  if (prefix === 'L') {
    return { type: 'inductor', label: name, nodes: [tokens[1], tokens[2]], value: parseValue(tokens.slice(3), '1m') };
  }
  if (prefix === 'V') {
    if (name.toUpperCase().startsWith('VAC')) {
      let val = parseValue(tokens.slice(3), '5 1k');
      const sinMatch = val.match(/SIN\s*\(\s*[\d.]+\s+([\d.]+)\s+([\d.]+)/i);
      if (sinMatch) {
        let amp = sinMatch[1];
        let freq = sinMatch[2];
        if (freq === '1000') freq = '1k';
        val = `${amp} ${freq}`;
      }
      return { type: 'acsource', label: name, nodes: mapSourceNodesForCanvas(tokens[1], tokens[2]), value: val };
    }
    
    let val = parseValue(tokens.slice(3), '5V');
    if (val.toUpperCase().startsWith('DC ')) val = val.substring(3).trim();
    return { type: 'source', label: name, nodes: mapSourceNodesForCanvas(tokens[1], tokens[2]), value: val };
  }
  if (prefix === 'D') {
    const model = parseValue(tokens.slice(3), '1N4148');
    return { type: 'diode_model', label: name, nodes: [tokens[1], tokens[2]], value: model };
  }
  if (prefix === 'Q') {
    return {
      type: 'bjt_npn',
      label: name,
      nodes: [tokens[2], tokens[1], tokens[3]],
      value: parseValue(tokens.slice(4), '2N3904')
    };
  }

  return null;
}

function buildNodeHubMap(parsedLines, components) {
  const nodeMap = new Map();

  parsedLines.forEach((line, index) => {
    const comp = components[index];
    if (!comp) return;

    const pins = getPins(comp);
    line.nodes.forEach((nodeName, pinIndex) => {
      if (!nodeMap.has(nodeName)) {
        nodeMap.set(nodeName, []);
      }

      if (pins[pinIndex]) {
        nodeMap.get(nodeName).push({
          componentId: comp.id,
          pinIndex,
          point: pins[pinIndex]
        });
      }
    });
  });

  return nodeMap;
}

function createAnchoredWires(nodeHubMap) {
  const wires = [];

  nodeHubMap.forEach((entries, nodeName) => {
    if (String(nodeName) === '0') return; // Ground is handled separately
    if (!entries || entries.length < 2) return;

    const hubX = snap(entries.reduce((acc, entry) => acc + entry.point.x, 0) / entries.length);
    const hubY = snap(entries.reduce((acc, entry) => acc + entry.point.y, 0) / entries.length);
    const hubKey = `${hubX},${hubY}`;

    entries.forEach((entry) => {
      wires.push({
        id: `ai-wire-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        points: [entry.point.x, entry.point.y, hubX, hubY],
        strictConnectivity: true,
        netlistNode: String(nodeName),
        connectivityGroup: `node:${String(nodeName)}`,
        startAnchor: {
          componentId: entry.componentId,
          pinIndex: entry.pinIndex
        },
        endNodeHub: {
          x: hubX,
          y: hubY,
          key: hubKey
        }
      });
    });
  });

  return wires;
}

function normalizeOrthogonalRotation(rotation) {
  const raw = Number.isFinite(rotation) ? rotation : 0;
  return ((Math.round(raw / 90) * 90) % 360 + 360) % 360;
}

function groundPinOffsetForRotation(rotation) {
  const normalized = normalizeOrthogonalRotation(rotation);
  if (normalized === 90) return { x: 20, y: 0 };
  if (normalized === 180) return { x: 0, y: 20 };
  if (normalized === 270) return { x: -20, y: 0 };
  return { x: 0, y: -20 };
}

function vectorToGroundRotation(dx, dy) {
  const safeDx = Number.isFinite(dx) ? dx : 0;
  const safeDy = Number.isFinite(dy) ? dy : 0;

  // Mapping confirmed by user:
  // up -> 0, down -> 180, right -> 90, left -> 270
  if (Math.abs(safeDx) > Math.abs(safeDy)) {
    return safeDx >= 0 ? 90 : 270;
  }
  return safeDy <= 0 ? 0 : 180;
}

function inferGroundRotation(entry, nodeZeroEntries, componentById) {
  if (!entry?.point) return 0;

  // Primary signal: pin-to-owner direction preserves local component semantics
  // (e.g. for vertical resistor/capacitor with node 0 at bottom, this resolves to rotation 0).
  const owner = componentById.get(entry.componentId);
  if (owner && Number.isFinite(owner.x) && Number.isFinite(owner.y)) {
    const ownerDx = owner.x - entry.point.x;
    const ownerDy = owner.y - entry.point.y;
    if (Math.abs(ownerDx) > 0 || Math.abs(ownerDy) > 0) {
      return vectorToGroundRotation(ownerDx, ownerDy);
    }
  }

  // Fallback: nearest same-net node-0 connection.
  let bestVector = null;
  let bestDistSq = Number.POSITIVE_INFINITY;
  nodeZeroEntries.forEach((candidate) => {
    if (candidate === entry || !candidate?.point) return;
    const dx = candidate.point.x - entry.point.x;
    const dy = candidate.point.y - entry.point.y;
    const distSq = (dx * dx) + (dy * dy);
    if (!Number.isFinite(distSq) || distSq < 1 || distSq >= bestDistSq) return;
    bestDistSq = distSq;
    bestVector = { dx, dy };
  });

  if (bestVector) {
    return vectorToGroundRotation(bestVector.dx, bestVector.dy);
  }

  return 0;
}

export function netlistToDraftSchematic(netlist) {
  const lines = String(netlist || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const layoutMap = new Map();
  const layoutRegex = /^\*\s*\[LAYOUT\]\s+(\w+)\s+C=([+-]?\d+)\s+R=([+-]?\d+)\s+ROT=([+-]?\d+)/i;

  // First Pass: Read layout comments
  lines.forEach(line => {
    const match = line.match(layoutRegex);
    if (match) {
      const compId = match[1];
      const col = parseInt(match[2], 10);
      const row = parseInt(match[3], 10);
      const rot = parseInt(match[4], 10);
      const { x, y } = canvasFromLayoutCell(col, row);

      layoutMap.set(compId.toUpperCase(), {
        x,
        y,
        rotation: rot
      });
    }
  });

  const parsed = lines.map(parseSpiceLine).filter(Boolean);
  if (!parsed.length) {
    return { components: [], wires: [] };
  }

  // Fallback grid logic if [LAYOUT] is missing
  let defaultRow = 0;
  let defaultCol = 0;
  const cols = 3;

  const components = parsed.map((line) => {
    const labelUpper = line.label.toUpperCase();
    let x, y, rotation;
    
    if (layoutMap.has(labelUpper)) {
      const layoutData = layoutMap.get(labelUpper);
      x = layoutData.x;
      y = layoutData.y;
      rotation = layoutData.rotation;
    } else {
      x = snap(AI_LAYOUT_OFFSET_X + defaultCol * AI_LAYOUT_GRID_WIDTH);
      y = snap(AI_LAYOUT_OFFSET_Y + defaultRow * AI_LAYOUT_GRID_HEIGHT);
      rotation = 0;
      defaultCol++;
      if (defaultCol >= cols) {
        defaultCol = 0;
        defaultRow++;
      }
    }

    return createComponent(line.type, line.label, line.value, x, y, { rotation });
  });

  // Euclidean Distance Check for 'flip'
  // Step 1: Build initial node map to find hubs
  let initialNodeMap = buildNodeHubMap(parsed, components);
  let initialNodeHubs = new Map();
  
  initialNodeMap.forEach((entries, nodeName) => {
    if (entries && entries.length > 0) {
      const hubX = entries.reduce((acc, entry) => acc + entry.point.x, 0) / entries.length;
      const hubY = entries.reduce((acc, entry) => acc + entry.point.y, 0) / entries.length;
      initialNodeHubs.set(nodeName, { x: hubX, y: hubY });
    }
  });

  // Step 2: Test if flipping each component reduces total wire distance
  components.forEach((comp, index) => {
    // Prevent auto-flip if LLM provided [LAYOUT] or component has more than 2 pins
    const labelUpper = comp.label.toUpperCase();
    if (layoutMap.has(labelUpper)) return;
    const currentPins = getPins(comp);
    if (currentPins.length !== 2) return;

    const line = parsed[index];
    const nodes = line.nodes; // netlist nodes this component connects to
    
    // Distance with current flip (false)
    let currentDist = 0;
    nodes.forEach((nodeName, pinIndex) => {
      const hub = initialNodeHubs.get(nodeName);
      const pin = currentPins[pinIndex];
      if (hub && pin) {
        currentDist += Math.sqrt(Math.pow(hub.x - pin.x, 2) + Math.pow(hub.y - pin.y, 2));
      }
    });

    // Distance if flipped
    const flippedComp = { ...comp, flip: true };
    const flippedPins = getPins(flippedComp);
    let flippedDist = 0;
    nodes.forEach((nodeName, pinIndex) => {
      const hub = initialNodeHubs.get(nodeName);
      const pin = flippedPins[pinIndex];
      if (hub && pin) {
        flippedDist += Math.sqrt(Math.pow(hub.x - pin.x, 2) + Math.pow(hub.y - pin.y, 2));
      }
    });

    if (flippedDist < currentDist - 1) { // -1 to avoid float equality issues
      comp.flip = true;
    }
  });

  // Step 3: Rebuild final node map and draw wires with updated components
  const finalNodeMap = buildNodeHubMap(parsed, components);
  const wires = createAnchoredWires(finalNodeMap);

  // Step 4: Add explicit ground components for node '0'
  const groundEntries = finalNodeMap.get('0');
  if (groundEntries) {
    const componentById = new Map(components.map(comp => [comp.id, comp]));
    groundEntries.forEach((entry, i) => {
      const rotation = inferGroundRotation(entry, groundEntries, componentById);
      const pinOffset = groundPinOffsetForRotation(rotation);

      components.push({
        id: `ai-gnd-${Date.now()}-${i}`,
        type: 'ground',
        label: '',
        value: '',
        // Position center so rotated ground pin lands exactly on node-0 point.
        x: snap(entry.point.x - pinOffset.x),
        y: snap(entry.point.y - pinOffset.y),
        rotation,
        flip: false
      });
    });
  }

  return { components, wires };
}

