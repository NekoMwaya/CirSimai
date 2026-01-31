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

    // Flip scale for mirroring components
    const flipScale = data.flip ? -1 : 1;

    return (
        <Group
            x={data.x} y={data.y} rotation={data.rotation}
            scaleX={flipScale} // Apply horizontal flip
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
            {/* Selection Area - Dynamic size based on component type */}
            {(data.type === 'bjt_npn' || data.type === 'bjt_pnp') ? (
                <Rect x={-35} y={-30} width={80} height={60} fill="transparent" 
                      stroke={isSelected ? "#1890ff" : (tool==='delete'?'#ff4d4f':null)} 
                      dash={[5, 5]} />
            ) : (
                <Rect x={-30} y={-20} width={60} height={40} fill="transparent" 
                      stroke={isSelected ? "#1890ff" : (tool==='delete'?'#ff4d4f':null)} 
                      dash={[5, 5]} />
            )}
            
            {/* Resistor Visuals */}
            {data.type === 'resistor' && (
                <>
                    <Line points={[-40,0, -20,0, -15,-10, -5,10, 5,-10, 15,10, 20,0, 40,0]} 
                          stroke={theme.stroke} strokeWidth={2} lineJoin="round" />
                    <Text x={valPos.x} y={valPos.y} text={data.value} fontSize={14} fill={theme.text} rotation={-data.rotation} scaleX={flipScale} />
                    <Text x={lblPos.x} y={lblPos.y} text={data.label} fontSize={14} fill={theme.text} rotation={-data.rotation} scaleX={flipScale} />
                </>
            )}

            {/* Capacitor Visuals */}
            {data.type === 'capacitor' && (
                <>
                    <Line points={[-40,0, -5,0]} stroke={theme.stroke} strokeWidth={2} />
                    <Line points={[-5,-15, -5,15]} stroke={theme.stroke} strokeWidth={2} />
                    <Line points={[5,-15, 5,15]} stroke={theme.stroke} strokeWidth={2} />
                    <Line points={[5,0, 40,0]} stroke={theme.stroke} strokeWidth={2} />
                    <Text x={valPos.x} y={valPos.y} text={data.value} fontSize={14} fill={theme.text} rotation={-data.rotation} scaleX={flipScale} />
                    <Text x={lblPos.x} y={lblPos.y} text={data.label} fontSize={14} fill={theme.text} rotation={-data.rotation} scaleX={flipScale} />
                </>
            )}

            {/* Source Visuals - Note: Left pin (pin1) is negative, Right pin (pin2) is positive */}
            {data.type === 'source' && (
                <>
                    <Line points={[-40,0, -15,0]} stroke={theme.stroke} strokeWidth={2} />
                    <Line points={[15,0, 40,0]} stroke={theme.stroke} strokeWidth={2} />
                    <Circle radius={15} stroke={theme.stroke} strokeWidth={2} fill={theme.fill} />
                    <Text text="-" x={-10} y={-7} fontSize={14} fontStyle="bold" fill={theme.text} scaleX={flipScale} />
                    <Text text="+" x={4} y={-6} fontSize={12} fontStyle="bold" fill={theme.text} scaleX={flipScale} />
                    <Text x={valPos.x} y={valPos.y} text={data.value} fontSize={14} fill={theme.text} rotation={-data.rotation} scaleX={flipScale} />
                    <Text x={lblPos.x} y={lblPos.y} text={data.label} fontSize={14} fill={theme.text} rotation={-data.rotation} scaleX={flipScale} />
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

            {/* Inductor Visuals */}
            {data.type === 'inductor' && (
                <>
                    <Line points={[-40,0, -25,0]} stroke={theme.stroke} strokeWidth={2} />
                    {/* Coil loops */}
                    <Line points={[-25,0, -20,-8, -15,0, -10,-8, -5,0, 0,-8, 5,0, 10,-8, 15,0, 20,-8, 25,0]} 
                          stroke={theme.stroke} strokeWidth={2} lineJoin="round" tension={0.4} />
                    <Line points={[25,0, 40,0]} stroke={theme.stroke} strokeWidth={2} />
                    <Text x={valPos.x} y={valPos.y} text={data.value} fontSize={14} fill={theme.text} rotation={-data.rotation} scaleX={flipScale} />
                    <Text x={lblPos.x} y={lblPos.y} text={data.label} fontSize={14} fill={theme.text} rotation={-data.rotation} scaleX={flipScale} />
                </>
            )}

            {/* AC Voltage Source Visuals */}
            {data.type === 'acsource' && (
                <>
                    <Line points={[-40,0, -15,0]} stroke={theme.stroke} strokeWidth={2} />
                    <Line points={[15,0, 40,0]} stroke={theme.stroke} strokeWidth={2} />
                    <Circle radius={15} stroke={theme.stroke} strokeWidth={2} fill={theme.fill} />
                    {/* Sine wave inside circle */}
                    <Line points={[-8,0, -4,-6, 0,0, 4,6, 8,0]} 
                          stroke={theme.stroke} strokeWidth={1.5} tension={0.5} />
                    <Text x={valPos.x} y={valPos.y} text={data.value} fontSize={14} fill={theme.text} rotation={-data.rotation} scaleX={flipScale} />
                    <Text x={lblPos.x} y={lblPos.y} text={data.label} fontSize={14} fill={theme.text} rotation={-data.rotation} scaleX={flipScale} />
                </>
            )}

            {/* NPN BJT Visuals */}
            {data.type === 'bjt_npn' && (
                <>
                    {/* Base line from left */}
                    <Line points={[-40,0, -5,0]} stroke={theme.stroke} strokeWidth={2} />
                    {/* Vertical bar (base region) */}
                    <Line points={[-5,-15, -5,15]} stroke={theme.stroke} strokeWidth={3} />
                    {/* Collector line (top) */}
                    <Line points={[-5,-8, 20,-20]} stroke={theme.stroke} strokeWidth={2} />
                    <Line points={[20,-20, 40,-20]} stroke={theme.stroke} strokeWidth={2} />
                    {/* Emitter line (bottom) with arrow */}
                    <Line points={[-5,8, 20,20]} stroke={theme.stroke} strokeWidth={2} />
                    <Line points={[20,20, 40,20]} stroke={theme.stroke} strokeWidth={2} />
                    {/* Arrow on emitter (pointing outward for NPN) */}
                    <Line points={[10,12, 18,18, 12,22]} stroke={theme.stroke} strokeWidth={2} fill={theme.stroke} closed />
                    {/* Labels - counter-rotate to stay readable, and counter-scale for flip */}
                    <Text text="B" x={-35} y={-15} fontSize={10} fill={theme.text} rotation={-data.rotation} scaleX={flipScale} />
                    <Text text="C" x={30} y={-35} fontSize={10} fill={theme.text} rotation={-data.rotation} scaleX={flipScale} />
                    <Text text="E" x={30} y={22} fontSize={10} fill={theme.text} rotation={-data.rotation} scaleX={flipScale} />
                    <Text x={valPos.x - 10} y={valPos.y + 10} text={data.value} fontSize={12} fill={theme.text} rotation={-data.rotation} scaleX={flipScale} />
                    <Text x={lblPos.x} y={lblPos.y} text={data.label} fontSize={14} fill={theme.text} rotation={-data.rotation} scaleX={flipScale} />
                </>
            )}

            {/* PNP BJT Visuals */}
            {data.type === 'bjt_pnp' && (
                <>
                    {/* Base line from left */}
                    <Line points={[-40,0, -5,0]} stroke={theme.stroke} strokeWidth={2} />
                    {/* Vertical bar (base region) */}
                    <Line points={[-5,-15, -5,15]} stroke={theme.stroke} strokeWidth={3} />
                    {/* Collector line (top) */}
                    <Line points={[-5,-8, 20,-20]} stroke={theme.stroke} strokeWidth={2} />
                    <Line points={[20,-20, 40,-20]} stroke={theme.stroke} strokeWidth={2} />
                    {/* Emitter line (bottom) with arrow */}
                    <Line points={[-5,8, 20,20]} stroke={theme.stroke} strokeWidth={2} />
                    <Line points={[20,20, 40,20]} stroke={theme.stroke} strokeWidth={2} />
                    {/* Arrow on emitter (pointing inward for PNP) */}
                    <Line points={[-3,6, 5,10, 0,14]} stroke={theme.stroke} strokeWidth={2} fill={theme.stroke} closed />
                    {/* Labels - counter-rotate to stay readable, and counter-scale for flip */}
                    <Text text="B" x={-35} y={-15} fontSize={10} fill={theme.text} rotation={-data.rotation} scaleX={flipScale} />
                    <Text text="C" x={30} y={-35} fontSize={10} fill={theme.text} rotation={-data.rotation} scaleX={flipScale} />
                    <Text text="E" x={30} y={22} fontSize={10} fill={theme.text} rotation={-data.rotation} scaleX={flipScale} />
                    <Text x={valPos.x - 10} y={valPos.y + 10} text={data.value} fontSize={12} fill={theme.text} rotation={-data.rotation} scaleX={flipScale} />
                    <Text x={lblPos.x} y={lblPos.y} text={data.label} fontSize={14} fill={theme.text} rotation={-data.rotation} scaleX={flipScale} />
                </>
            )}

        </Group>
    );
};
export default CircuitComponent;