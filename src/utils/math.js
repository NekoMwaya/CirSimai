export const GRID = 20;

export const snap = (val) => Math.round(val / GRID) * GRID;

export const getRelativePointerPosition = (node) => {
  const transform = node.getAbsoluteTransform().copy();
  transform.invert();
  const pos = node.getStage().getPointerPosition();
  return transform.point(pos);
};

export const getPins = (comp) => {
  const r = comp.rotation;
  const rad = (r * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rot = (x, y) => ({ x: x * cos - y * sin, y: x * sin + y * cos });
  // Offset logic for pins
  if (comp.type === 'resistor' || comp.type === 'source') {
    const p1 = rot(-40, 0);
    const p2 = rot(40, 0);
    return [{ x: comp.x + p1.x, y: comp.y + p1.y }, { x: comp.x + p2.x, y: comp.y + p2.y }];
  }
  return [];
};

export const getTextPos = (rotation) => {
  const r = rotation % 360;
  const DIST = 35; 
  let screenX = 0, screenY = 0;
  if (r === 0 || r === 180) { screenX = -15; screenY = DIST; } 
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
  if (r === 0 || r === 180) { screenX = -15; screenY = -DIST; } 
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