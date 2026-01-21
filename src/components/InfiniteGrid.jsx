import React from 'react';
import { Shape } from 'react-konva';
import { GRID } from '../utils/math';

const InfiniteGrid = ({ stagePos, stageScale, theme }) => {
    return (
        <Shape
            sceneFunc={(context) => {
                const width = window.innerWidth;
                const height = window.innerHeight;
                
                const startX = Math.floor((-stagePos.x / stageScale) / GRID) * GRID;
                const startY = Math.floor((-stagePos.y / stageScale) / GRID) * GRID;
                const endX = Math.floor(((-stagePos.x + width) / stageScale) / GRID) * GRID;
                const endY = Math.floor(((-stagePos.y + height) / stageScale) / GRID) * GRID;
                
                context.beginPath();
                for (let x = startX; x <= endX + GRID; x += GRID) {
                    for (let y = startY; y <= endY + GRID; y += GRID) {
                        context.moveTo(x + 1, y);
                        context.arc(x, y, 1, 0, Math.PI * 2);
                    }
                }
                context.fillStyle = theme.gridDot;
                context.fill();
            }}
            // Force re-render when view changes
            key={`grid-${stagePos.x}-${stagePos.y}-${stageScale}-${theme.gridDot}`} 
        />
    );
};
export default InfiniteGrid;