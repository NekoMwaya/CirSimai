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

  if (comp.type === 'resistor' || comp.type === 'source' || comp.type === 'capacitor' || comp.type === 'inductor' || comp.type === 'acsource') {
    const p1 = rot(-40, 0); // Left Pin
    const p2 = rot(40, 0);  // Right Pin
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