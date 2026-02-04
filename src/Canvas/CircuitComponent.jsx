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

            {/* Ideal Diode Visuals (Theoretical 0.7V) - Anode on left, Cathode on right */}
            {data.type === 'diode_ideal' && (
                <>
                    {/* Lead wires */}
                    <Line points={[-40,0, -10,0]} stroke={theme.stroke} strokeWidth={2} />
                    <Line points={[10,0, 40,0]} stroke={theme.stroke} strokeWidth={2} />
                    {/* Triangle (anode side) - pointing right */}
                    <Line points={[-10,-12, -10,12, 10,0]} stroke={theme.stroke} strokeWidth={2} fill={theme.fill} closed />
                    {/* Cathode bar */}
                    <Line points={[10,-12, 10,12]} stroke={theme.stroke} strokeWidth={3} />
                    {/* Ideal indicator - small "0.7V" text */}
                    <Text x={-8} y={-3} text="0.7" fontSize={8} fill={theme.text} fontStyle="bold" scaleX={flipScale} />
                    <Text x={valPos.x} y={valPos.y} text={data.value} fontSize={14} fill={theme.text} rotation={-data.rotation} scaleX={flipScale} />
                    <Text x={lblPos.x} y={lblPos.y} text={data.label} fontSize={14} fill={theme.text} rotation={-data.rotation} scaleX={flipScale} />
                </>
            )}

            {/* Model Diode Visuals - Anode on left, Cathode on right */}
            {data.type === 'diode_model' && (
                <>
                    {/* Lead wires */}
                    <Line points={[-40,0, -10,0]} stroke={theme.stroke} strokeWidth={2} />
                    <Line points={[10,0, 40,0]} stroke={theme.stroke} strokeWidth={2} />
                    {/* Triangle (anode side) - pointing right */}
                    <Line points={[-10,-12, -10,12, 10,0]} stroke={theme.stroke} strokeWidth={2} fill={theme.fill} closed />
                    {/* Cathode bar */}
                    <Line points={[10,-12, 10,12]} stroke={theme.stroke} strokeWidth={3} />
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
                    {/* Component label and value */}
                    <Text x={-15} y={-45} text={data.label} fontSize={12} fill={theme.text} />
                    <Text x={-20} y={35} text={data.value} fontSize={9} fill={theme.text} />
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
                    {/* Component label and value */}
                    <Text x={-15} y={-45} text={data.label} fontSize={12} fill={theme.text} />
                    <Text x={-20} y={35} text={data.value} fontSize={9} fill={theme.text} />
                </>
            )}

            {/* NMOS MOSFET Visuals */}
            {data.type === 'nmos' && (
                <>
                    {/* Gate line from left */}
                    <Line points={[-40,0, -10,0]} stroke={theme.stroke} strokeWidth={2} />
                    {/* Gate vertical line (with gap to channel) */}
                    <Line points={[-10,-15, -10,15]} stroke={theme.stroke} strokeWidth={2} />
                    {/* Channel vertical line */}
                    <Line points={[-3,-15, -3,15]} stroke={theme.stroke} strokeWidth={3} />
                    {/* Drain line (top-right) */}
                    <Line points={[-3,-10, 15,-10]} stroke={theme.stroke} strokeWidth={2} />
                    <Line points={[15,-10, 15,-20, 40,-20]} stroke={theme.stroke} strokeWidth={2} />
                    {/* Source line (bottom-right) */}
                    <Line points={[-3,10, 15,10]} stroke={theme.stroke} strokeWidth={2} />
                    <Line points={[15,10, 15,20, 40,20]} stroke={theme.stroke} strokeWidth={2} />
                    {/* Body connection line */}
                    <Line points={[-3,0, 15,0]} stroke={theme.stroke} strokeWidth={2} />
                    {/* Arrow pointing toward channel (NMOS) */}
                    <Line points={[7,-4, 1,0, 7,4]} stroke={theme.stroke} strokeWidth={2} fill={theme.stroke} closed />
                    {/* Component label and value */}
                    <Text x={-15} y={-45} text={data.label} fontSize={12} fill={theme.text} />
                    <Text x={-20} y={35} text={data.value} fontSize={9} fill={theme.text} />
                </>
            )}

            {/* PMOS MOSFET Visuals */}
            {data.type === 'pmos' && (
                <>
                    {/* Gate line from left */}
                    <Line points={[-40,0, -15,0]} stroke={theme.stroke} strokeWidth={2} />
                    {/* Bubble for PMOS */}
                    <Circle x={-12} y={0} radius={3} stroke={theme.stroke} strokeWidth={1.5} fill={theme.fill} />
                    {/* Gate vertical line (with gap to channel) */}
                    <Line points={[-8,-15, -8,15]} stroke={theme.stroke} strokeWidth={2} />
                    {/* Channel vertical line */}
                    <Line points={[-1,-15, -1,15]} stroke={theme.stroke} strokeWidth={3} />
                    {/* Drain line (top-right) */}
                    <Line points={[-1,-10, 15,-10]} stroke={theme.stroke} strokeWidth={2} />
                    <Line points={[15,-10, 15,-20, 40,-20]} stroke={theme.stroke} strokeWidth={2} />
                    {/* Source line (bottom-right) */}
                    <Line points={[-1,10, 15,10]} stroke={theme.stroke} strokeWidth={2} />
                    <Line points={[15,10, 15,20, 40,20]} stroke={theme.stroke} strokeWidth={2} />
                    {/* Body connection line */}
                    <Line points={[-1,0, 15,0]} stroke={theme.stroke} strokeWidth={2} />
                    {/* Arrow pointing away from channel (PMOS) */}
                    <Line points={[9,-4, 15,0, 9,4]} stroke={theme.stroke} strokeWidth={2} fill={theme.stroke} closed />
                    {/* Component label and value */}
                    <Text x={-15} y={-45} text={data.label} fontSize={12} fill={theme.text} />
                    <Text x={-20} y={35} text={data.value} fontSize={9} fill={theme.text} />
                </>
            )}

            {/* N-Channel JFET Visuals */}
            {data.type === 'njfet' && (
                <>
                    {/* Gate line from left */}
                    <Line points={[-40,0, -5,0]} stroke={theme.stroke} strokeWidth={2} />
                    {/* Channel vertical bar */}
                    <Line points={[-5,-15, -5,15]} stroke={theme.stroke} strokeWidth={3} />
                    {/* Drain line (top-right) */}
                    <Line points={[-5,-10, 15,-10]} stroke={theme.stroke} strokeWidth={2} />
                    <Line points={[15,-10, 15,-20, 40,-20]} stroke={theme.stroke} strokeWidth={2} />
                    {/* Source line (bottom-right) */}
                    <Line points={[-5,10, 15,10]} stroke={theme.stroke} strokeWidth={2} />
                    <Line points={[15,10, 15,20, 40,20]} stroke={theme.stroke} strokeWidth={2} />
                    {/* Arrow pointing inward (N-channel) on gate */}
                    <Line points={[-25,-4, -19,0, -25,4]} stroke={theme.stroke} strokeWidth={2} fill={theme.stroke} closed />
                    {/* Component label and value */}
                    <Text x={-15} y={-45} text={data.label} fontSize={12} fill={theme.text} />
                    <Text x={-20} y={35} text={data.value} fontSize={9} fill={theme.text} />
                </>
            )}

            {/* P-Channel JFET Visuals */}
            {data.type === 'pjfet' && (
                <>
                    {/* Gate line from left */}
                    <Line points={[-40,0, -5,0]} stroke={theme.stroke} strokeWidth={2} />
                    {/* Channel vertical bar */}
                    <Line points={[-5,-15, -5,15]} stroke={theme.stroke} strokeWidth={3} />
                    {/* Drain line (top-right) */}
                    <Line points={[-5,-10, 15,-10]} stroke={theme.stroke} strokeWidth={2} />
                    <Line points={[15,-10, 15,-20, 40,-20]} stroke={theme.stroke} strokeWidth={2} />
                    {/* Source line (bottom-right) */}
                    <Line points={[-5,10, 15,10]} stroke={theme.stroke} strokeWidth={2} />
                    <Line points={[15,10, 15,20, 40,20]} stroke={theme.stroke} strokeWidth={2} />
                    {/* Arrow pointing outward (P-channel) on gate */}
                    <Line points={[-13,-4, -19,0, -13,4]} stroke={theme.stroke} strokeWidth={2} fill={theme.stroke} closed />
                    {/* Component label and value */}
                    <Text x={-15} y={-45} text={data.label} fontSize={12} fill={theme.text} />
                    <Text x={-20} y={35} text={data.value} fontSize={9} fill={theme.text} />
                </>
            )}

            {/* Op-Amp Visuals (3-pin) */}
            {data.type === 'opamp' && (
                <>
                    {/* Triangle body */}
                    <Line points={[-30,-35, -30,35, 40,0]} stroke={theme.stroke} strokeWidth={2} fill={theme.fill} closed />
                    {/* V+ input (non-inverting) */}
                    <Line points={[-50,-20, -30,-20]} stroke={theme.stroke} strokeWidth={2} />
                    <Text text="+" x={-26} y={-28} fontSize={12} fontStyle="bold" fill={theme.text} />
                    {/* V- input (inverting) */}
                    <Line points={[-50,20, -30,20]} stroke={theme.stroke} strokeWidth={2} />
                    <Text text="−" x={-26} y={12} fontSize={14} fontStyle="bold" fill={theme.text} />
                    {/* Output */}
                    <Line points={[40,0, 50,0]} stroke={theme.stroke} strokeWidth={2} />
                    {/* Labels - rotate with component */}
                    <Text x={-10} y={-50} text={data.label} fontSize={12} fill={theme.text} />
                    <Text x={-15} y={40} text={data.value} fontSize={10} fill={theme.text} />
                </>
            )}

            {/* Op-Amp with Power Supply Pins (5-pin) */}
            {data.type === 'opamp5' && (
                <>
                    {/* Triangle body */}
                    <Line points={[-30,-35, -30,35, 40,0]} stroke={theme.stroke} strokeWidth={2} fill={theme.fill} closed />
                    {/* V+ input (non-inverting) */}
                    <Line points={[-50,-20, -30,-20]} stroke={theme.stroke} strokeWidth={2} />
                    <Text text="+" x={-26} y={-28} fontSize={12} fontStyle="bold" fill={theme.text} />
                    {/* V- input (inverting) */}
                    <Line points={[-50,20, -30,20]} stroke={theme.stroke} strokeWidth={2} />
                    <Text text="−" x={-26} y={12} fontSize={14} fontStyle="bold" fill={theme.text} />
                    {/* Output */}
                    <Line points={[40,0, 50,0]} stroke={theme.stroke} strokeWidth={2} />
                    {/* VCC+ (positive supply) - top */}
                    <Line points={[0,-25, 0,-40]} stroke={theme.stroke} strokeWidth={2} />
                    <Text text="V+" x={5} y={-45} fontSize={8} fill={theme.text} />
                    {/* VCC- (negative supply) - bottom */}
                    <Line points={[0,25, 0,40]} stroke={theme.stroke} strokeWidth={2} />
                    <Text text="V−" x={5} y={35} fontSize={8} fill={theme.text} />
                    {/* Labels - rotate with component */}
                    <Text x={-10} y={-55} text={data.label} fontSize={12} fill={theme.text} />
                    <Text x={45} y={-10} text={data.value} fontSize={9} fill={theme.text} />
                </>
            )}

        </Group>
    );
};
export default CircuitComponent;