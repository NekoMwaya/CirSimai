import { snap } from './math';

export const AI_LAYOUT_GRID_WIDTH = 150;
export const AI_LAYOUT_GRID_HEIGHT = 120;
export const AI_LAYOUT_OFFSET_X = 200;
export const AI_LAYOUT_OFFSET_Y = 200;

export function canvasFromLayoutCell(col, row) {
  return {
    x: snap(AI_LAYOUT_OFFSET_X + (col * AI_LAYOUT_GRID_WIDTH)),
    y: snap(AI_LAYOUT_OFFSET_Y + (row * AI_LAYOUT_GRID_HEIGHT))
  };
}

export function layoutCellFromCanvas(x, y) {
  return {
    col: Math.round((x - AI_LAYOUT_OFFSET_X) / AI_LAYOUT_GRID_WIDTH),
    row: Math.round((y - AI_LAYOUT_OFFSET_Y) / AI_LAYOUT_GRID_HEIGHT)
  };
}

export function snapCanvasToLayoutGrid(x, y) {
  const { col, row } = layoutCellFromCanvas(x, y);
  const snapped = canvasFromLayoutCell(col, row);
  return { ...snapped, col, row };
}

export function normalizeRotationDegrees(rotation) {
  const raw = Number.isFinite(rotation) ? rotation : 0;
  const normalized = ((Math.round(raw) % 360) + 360) % 360;
  return (Math.round(normalized / 90) * 90) % 360;
}
