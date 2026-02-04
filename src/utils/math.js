export const GRID = 20;

export const snap = (val) => Math.round(val / GRID) * GRID;

export const getRelativePointerPosition = (node) => {
  const transform = node.getAbsoluteTransform().copy();
  transform.invert();
  const pos = node.getStage().getPointerPosition();
  return transform.point(pos);
};

export const getPins = (comp) => {
  const r = comp.rotation || 0;
  const flip = comp.flip || false; // Mirror horizontally
  const rad = (r * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  
  // Apply flip (mirror) before rotation
  const rot = (x, y) => {
    const fx = flip ? -x : x; // Flip X coordinate if mirrored
    return { 
      x: Math.round(fx * cos - y * sin), 
      y: Math.round(fx * sin + y * cos) 
    };
  };

  if (comp.type === 'resistor' || comp.type === 'source' || comp.type === 'capacitor' || comp.type === 'inductor' || comp.type === 'acsource' || comp.type === 'diode_ideal' || comp.type === 'diode_model') {
    const p1 = rot(-40, 0); // Left Pin (Anode for diodes)
    const p2 = rot(40, 0);  // Right Pin (Cathode for diodes)
    return [
      { x: Math.round(comp.x + p1.x), y: Math.round(comp.y + p1.y) }, 
      { x: Math.round(comp.x + p2.x), y: Math.round(comp.y + p2.y) }
    ];
  } else if (comp.type === 'ground') {
    // Ground has one pin at top (0, -20 relative to center)
    const p1 = rot(0, -20);
    return [{ x: Math.round(comp.x + p1.x), y: Math.round(comp.y + p1.y) }];
  } else if (comp.type === 'bjt_npn' || comp.type === 'bjt_pnp') {
    // BJT has 3 pins: Base (left), Collector (top-right), Emitter (bottom-right)
    // When flipped, left becomes right and vice versa
    const pBase = rot(-40, 0);       // Base pin (left, or right if flipped)
    const pCollector = rot(40, -20); // Collector pin (top-right, or top-left if flipped)
    const pEmitter = rot(40, 20);    // Emitter pin (bottom-right, or bottom-left if flipped)
    return [
      { x: Math.round(comp.x + pBase.x), y: Math.round(comp.y + pBase.y) },
      { x: Math.round(comp.x + pCollector.x), y: Math.round(comp.y + pCollector.y) },
      { x: Math.round(comp.x + pEmitter.x), y: Math.round(comp.y + pEmitter.y) }
    ];
  } else if (comp.type === 'nmos' || comp.type === 'pmos') {
    // MOSFET has 3 pins: Gate (left), Drain (top-right), Source (bottom-right)
    const pGate = rot(-40, 0);      // Gate pin
    const pDrain = rot(40, -20);    // Drain pin
    const pSource = rot(40, 20);    // Source pin
    return [
      { x: Math.round(comp.x + pGate.x), y: Math.round(comp.y + pGate.y) },
      { x: Math.round(comp.x + pDrain.x), y: Math.round(comp.y + pDrain.y) },
      { x: Math.round(comp.x + pSource.x), y: Math.round(comp.y + pSource.y) }
    ];
  } else if (comp.type === 'njfet' || comp.type === 'pjfet') {
    // JFET has 3 pins: Gate (left), Drain (top-right), Source (bottom-right)
    const pGate = rot(-40, 0);      // Gate pin
    const pDrain = rot(40, -20);    // Drain pin
    const pSource = rot(40, 20);    // Source pin
    return [
      { x: Math.round(comp.x + pGate.x), y: Math.round(comp.y + pGate.y) },
      { x: Math.round(comp.x + pDrain.x), y: Math.round(comp.y + pDrain.y) },
      { x: Math.round(comp.x + pSource.x), y: Math.round(comp.y + pSource.y) }
    ];
  } else if (comp.type === 'opamp') {
    // Op-Amp has 3 pins: V+ input, V- input, Output
    const pInPlus = rot(-50, -20);   // Non-inverting input (+)
    const pInMinus = rot(-50, 20);   // Inverting input (-)
    const pOut = rot(50, 0);         // Output
    return [
      { x: Math.round(comp.x + pInPlus.x), y: Math.round(comp.y + pInPlus.y) },
      { x: Math.round(comp.x + pInMinus.x), y: Math.round(comp.y + pInMinus.y) },
      { x: Math.round(comp.x + pOut.x), y: Math.round(comp.y + pOut.y) }
    ];
  } else if (comp.type === 'opamp5') {
    // Op-Amp with 5 pins: V+ input, V- input, Output, VCC+, VCC-
    const pInPlus = rot(-50, -20);   // Non-inverting input (+)
    const pInMinus = rot(-50, 20);   // Inverting input (-)
    const pOut = rot(50, 0);         // Output
    const pVccPlus = rot(0, -40);    // Positive supply
    const pVccMinus = rot(0, 40);    // Negative supply
    return [
      { x: Math.round(comp.x + pInPlus.x), y: Math.round(comp.y + pInPlus.y) },
      { x: Math.round(comp.x + pInMinus.x), y: Math.round(comp.y + pInMinus.y) },
      { x: Math.round(comp.x + pOut.x), y: Math.round(comp.y + pOut.y) },
      { x: Math.round(comp.x + pVccPlus.x), y: Math.round(comp.y + pVccPlus.y) },
      { x: Math.round(comp.x + pVccMinus.x), y: Math.round(comp.y + pVccMinus.y) }
    ];
  }
  return [];
};

export const getTextPos = (rotation) => {
  const r = rotation % 360;
  const DIST = 20; 
  let screenX = 0, screenY = 0;
  if (r === 0 || r === 180) { screenX = -10; screenY = DIST; } 
  else { screenX = DIST; screenY = -5; }
  
  const rad = (-r * Math.PI) / 180;
  return { 
      x: screenX * Math.cos(rad) - screenY * Math.sin(rad), 
      y: screenX * Math.sin(rad) + screenY * Math.cos(rad) 
  };
};

export const getLabelPos = (rotation) => {
  const r = rotation % 360;
  const DIST = 35; 
  let screenX = 0, screenY = 0;
  if (r === 0 || r === 180) { screenX = -10; screenY = -DIST; } 
  else { screenX = -DIST; screenY = -5; }
  
  const rad = (-r * Math.PI) / 180;
  return { 
      x: screenX * Math.cos(rad) - screenY * Math.sin(rad), 
      y: screenX * Math.sin(rad) + screenY * Math.cos(rad) 
  };
};

// Get label positions for 3-terminal components (transistors) based on rotation
// Returns positions for component label and value that don't overlap with pin labels
export const getTransistorLabelPos = (rotation) => {
  const r = ((rotation % 360) + 360) % 360;
  switch (r) {
    case 0:
      return { label: { x: -15, y: -45 }, value: { x: -15, y: 35 } };
    case 90:
      return { label: { x: 35, y: -15 }, value: { x: -55, y: -15 } };
    case 180:
      return { label: { x: -15, y: 35 }, value: { x: -15, y: -55 } };
    case 270:
      return { label: { x: -55, y: -15 }, value: { x: 35, y: -15 } };
    default:
      return { label: { x: -15, y: -45 }, value: { x: -15, y: 35 } };
  }
};

// Get pin label positions for 3-terminal transistors based on rotation
// Returns screen-space positions that stay readable and avoid wire overlap
// Labels are placed OUTSIDE the wire paths
export const getTransistorPinLabelPos = (rotation, flip = false) => {
  const r = ((rotation % 360) + 360) % 360;
  
  // For each rotation, return positions where labels won't overlap wires
  // Pin1 = Gate/Base (left in default), Pin2 = Drain/Collector (top-right), Pin3 = Source/Emitter (bottom-right)
  switch (r) {
    case 0:
      // Default: G left, D top-right, S bottom-right
      return {
        pin1: { x: -38, y: 5 },      // G - below the gate wire
        pin2: { x: 25, y: -38 },     // D - above drain, away from wire  
        pin3: { x: 25, y: 28 }       // S - below source, away from wire
      };
    case 90:
      // Rotated 90° CW: G at top, D at bottom-right, S at bottom-left
      return {
        pin1: { x: 5, y: -38 },      // G - right of gate
        pin2: { x: 28, y: 25 },      // D - right of drain
        pin3: { x: -38, y: 25 }      // S - left of source
      };
    case 180:
      // Rotated 180°: G at right, D at bottom-left, S at top-left
      return {
        pin1: { x: 28, y: 5 },       // G - below gate (now on right)
        pin2: { x: -38, y: 28 },     // D - below drain
        pin3: { x: -38, y: -38 }     // S - above source
      };
    case 270:
      // Rotated 270° CW: G at bottom, D at top-left, S at top-right
      return {
        pin1: { x: 5, y: 28 },       // G - right of gate
        pin2: { x: -38, y: -38 },    // D - left of drain
        pin3: { x: 28, y: -38 }      // S - right of source
      };
    default:
      return {
        pin1: { x: -38, y: 5 },
        pin2: { x: 25, y: -38 },
        pin3: { x: 25, y: 28 }
      };
  }
};

export const getJunctions = (wires) => {
  const candidates = new Set();
  wires.forEach(w => {
    candidates.add(`${w.points[0]},${w.points[1]}`);
    candidates.add(`${w.points[2]},${w.points[3]}`);
  });
  const junctions = [];
  candidates.forEach(coord => {
      const [cx, cy] = coord.split(',').map(Number);
      let degree = 0;
      wires.forEach(w => {
          const [x1, y1, x2, y2] = w.points;
          if ((x1 === cx && y1 === cy) || (x2 === cx && y2 === cy)) degree += 1;
          else {
             const isVertical = x1 === x2 && x1 === cx;
             const isHorizontal = y1 === y2 && y1 === cy;
             if (isVertical && cy > Math.min(y1, y2) && cy < Math.max(y1, y2)) degree += 2;
             else if (isHorizontal && cx > Math.min(x1, x2) && cx < Math.max(x1, x2)) degree += 2;
          }
      });
      if (degree >= 3) junctions.push({ x: cx, y: cy });
  });
  return junctions;
};