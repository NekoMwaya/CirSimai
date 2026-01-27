import React from 'react';
import { Group, Rect, Line, Circle, Text } from 'react-konva';
import { getTextPos, getLabelPos, snap } from '../utils/math';
import { useCircuit } from '../context/CircuitContext';

const CircuitComponent = ({ data }) => {
    // 1. Get stagePos and stageScale from context
    const { 
        theme, setSelectedIds, tool, selectedIds, updateComponent, setComponents,
        stagePos, stageScale, saveState
    } = useCircuit();
    
    const isSelected = selectedIds.includes(data.id);
    const valPos = getTextPos(data.rotation);
    const lblPos = getLabelPos(data.rotation);

    const handleDrag = (e) => {
        updateComponent(data.id, { 
            x: snap(e.target.x()), 
            y: snap(e.target.y()) 
        });
    };

    const handleClick = (e) => {
        e.cancelBubble = true;
        if (tool === 'delete') {
            setComponents(prev => prev.filter(c => c.id !== data.id));
            setSelectedIds(prev => prev.filter(pid => pid !== data.id));
        } else {
            if (isSelected) {
                // If I am already selected, unselect me
                setSelectedIds([]);
            } else {
                // If I am not selected, select me
                setSelectedIds([data.id]);
            }
        }
    };

    return (
        <Group
            x={data.x} y={data.y} rotation={data.rotation}
            draggable={tool === 'select'}
            onDragStart={() => {
                if(!isSelected) setSelectedIds([data.id]);
                
                // --- FIX: SAVE STATE HERE ---
                saveState(); 
                // ----------------------------
            }}
            onDragEnd={handleDrag}
            
            // 2. FIX: Convert Absolute (Screen) -> Relative (Grid) -> Snap -> Absolute
            dragBoundFunc={(pos) => {
                const relativeX = (pos.x - stagePos.x) / stageScale;
                const relativeY = (pos.y - stagePos.y) / stageScale;
                
                return {
                    x: snap(relativeX) * stageScale + stagePos.x,
                    y: snap(relativeY) * stageScale + stagePos.y
                };
            }}

            onMouseEnter={e => { if(tool === 'delete') e.target.getStage().container().style.cursor = 'no-drop'; }}
            onMouseLeave={e => { if(tool === 'delete') e.target.getStage().container().style.cursor = 'not-allowed'; }}
            onClick={handleClick}
        >
            {/* Selection Area - Reduced size to expose pins/nodes for easier wire selection */}
            <Rect x={-30} y={-20} width={60} height={40} fill="transparent" 
                  stroke={isSelected ? "#1890ff" : (tool==='delete'?'#ff4d4f':null)} 
                  dash={[5, 5]} />
            
            {/* Resistor Visuals */}
            {data.type === 'resistor' && (
                <>
                    <Line points={[-40,0, -20,0, -15,-10, -5,10, 5,-10, 15,10, 20,0, 40,0]} 
                          stroke={theme.stroke} strokeWidth={2} lineJoin="round" />
                    <Text x={valPos.x} y={valPos.y} text={data.value} fontSize={14} fill={theme.text} rotation={-data.rotation} />
                    <Text x={lblPos.x} y={lblPos.y} text={data.label} fontSize={14} fill={theme.text} rotation={-data.rotation} />
                </>
            )}

            {/* Capacitor Visuals */}
            {data.type === 'capacitor' && (
                <>
                    <Line points={[-40,0, -5,0]} stroke={theme.stroke} strokeWidth={2} />
                    <Line points={[-5,-15, -5,15]} stroke={theme.stroke} strokeWidth={2} />
                    <Line points={[5,-15, 5,15]} stroke={theme.stroke} strokeWidth={2} />
                    <Line points={[5,0, 40,0]} stroke={theme.stroke} strokeWidth={2} />
                    <Text x={valPos.x} y={valPos.y} text={data.value} fontSize={14} fill={theme.text} rotation={-data.rotation} />
                    <Text x={lblPos.x} y={lblPos.y} text={data.label} fontSize={14} fill={theme.text} rotation={-data.rotation} />
                </>
            )}

            {/* Source Visuals - Note: Left pin (pin1) is negative, Right pin (pin2) is positive */}
            {data.type === 'source' && (
                <>
                    <Line points={[-40,0, -15,0]} stroke={theme.stroke} strokeWidth={2} />
                    <Line points={[15,0, 40,0]} stroke={theme.stroke} strokeWidth={2} />
                    <Circle radius={15} stroke={theme.stroke} strokeWidth={2} fill={theme.fill} />
                    <Text text="-" x={-10} y={-7} fontSize={14} fontStyle="bold" fill={theme.text} />
                    <Text text="+" x={4} y={-6} fontSize={12} fontStyle="bold" fill={theme.text} />
                    <Text x={valPos.x} y={valPos.y} text={data.value} fontSize={14} fill={theme.text} rotation={-data.rotation} />
                    <Text x={lblPos.x} y={lblPos.y} text={data.label} fontSize={14} fill={theme.text} rotation={-data.rotation} />
                </>
            )}

            {/* Ground Visuals */}
            {data.type === 'ground' && (
                <>
                     {/* Connection from pin to top of symbol */}
                     <Line points={[0,-20, 0,0]} stroke={theme.stroke} strokeWidth={2} />
                     {/* Horizontal lines */}
                     <Line points={[-20,0, 20,0]} stroke={theme.stroke} strokeWidth={2} />
                     <Line points={[-12,6, 12,6]} stroke={theme.stroke} strokeWidth={2} />
                     <Line points={[-4,12, 4,12]} stroke={theme.stroke} strokeWidth={2} />
                </>
            )}

        </Group>
    );
};
export default CircuitComponent;