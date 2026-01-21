import React from 'react';
import { Group, Rect, Line, Circle, Text } from 'react-konva';
import { getTextPos, getLabelPos, snap } from '../utils/math';
import { useCircuit } from '../context/CircuitContext';

const CircuitComponent = ({ data }) => {
    // Added 'setComponents' for deletion
    const { theme, setSelectedIds, tool, selectedIds, updateComponent, setComponents } = useCircuit();
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
            // --- RESTORED LOGIC ---
            setComponents(prev => prev.filter(c => c.id !== data.id));
            setSelectedIds(prev => prev.filter(pid => pid !== data.id));
        } else {
            setSelectedIds([data.id]);
        }
    };

    return (
        <Group
            x={data.x} y={data.y} rotation={data.rotation}
            draggable={tool === 'select'}
            onDragStart={() => !isSelected && setSelectedIds([data.id])}
            onDragEnd={handleDrag}
            dragBoundFunc={(pos) => ({ x: snap(pos.x), y: snap(pos.y) })}
            onMouseEnter={e => { if(tool === 'delete') e.target.getStage().container().style.cursor = 'no-drop'; }}
            onMouseLeave={e => { if(tool === 'delete') e.target.getStage().container().style.cursor = 'not-allowed'; }}
            onClick={handleClick}
        >
            {/* Selection Area */}
            <Rect x={-40} y={-40} width={80} height={80} fill="transparent" 
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

            {/* Source Visuals */}
            {data.type === 'source' && (
                <>
                    <Line points={[-40,0, -15,0]} stroke={theme.stroke} strokeWidth={2} />
                    <Line points={[15,0, 40,0]} stroke={theme.stroke} strokeWidth={2} />
                    <Circle radius={15} stroke={theme.stroke} strokeWidth={2} fill={theme.fill} />
                     <Text text="+" x={-12} y={-6} fontSize={12} fontStyle="bold" fill={theme.text} />
                    <Text text="-" x={5} y={-7} fontSize={14} fontStyle="bold" fill={theme.text} />
                    <Text x={valPos.x} y={valPos.y} text={data.value} fontSize={14} fill={theme.text} rotation={-data.rotation} />
                    <Text x={lblPos.x} y={lblPos.y} text={data.label} fontSize={14} fill={theme.text} rotation={-data.rotation} />
                </>
            )}
        </Group>
    );
};
export default CircuitComponent;