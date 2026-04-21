import React, { useState, useRef, useMemo, useEffect, useCallback, memo } from 'react';
import { Stage, Layer, Line, Rect, Group, Circle, Text, Label, Tag } from 'react-konva';
import { CircuitProvider, useCircuit } from '../context/CircuitContext';
import InfiniteGrid from '../components/InfiniteGrid';
import CircuitComponent from '../Canvas/CircuitComponent';
import Sidebar from '../components/Sidebar';
import PropertiesPanel from '../components/PropertiesPanel';
import AIAssistantPanel from '../components/AIAssistantPanel';
import { snap, getRelativePointerPosition, getJunctions, getPins } from '../utils/math';
import { generateNetlist } from '../utils/networkAnalysis';

import { spice } from '../utils/spiceEngine';
import SimulationOutputOriginal from '../components/SimulationOutput';

const SimulationOutput = React.memo(SimulationOutputOriginal);

// Helper for mapping coordinates (replicated from networkAnalysis)
const coordId = (x, y) => `${Math.round(x)},${Math.round(y)}`;

// --- VOLTAGE INDICATOR COMPONENT (Memoized) ---
const VoltageIndicator = memo(({ x, y, voltage, nodeId, onHover, onProbe, isProbed }) => {
    const [hover, setHover] = useState(false);
    const color = isProbed ? '#52c41a' : '#1890ff'; // Green if probed, blue otherwise

    const handleMouseEnter = useCallback(() => { 
        setHover(true); 
        onHover(nodeId); 
    }, [nodeId, onHover]);
    
    const handleMouseLeave = useCallback(() => { 
        setHover(false); 
        onHover(null); 
    }, [onHover]);
    
    const handleClick = useCallback((e) => {
        e.cancelBubble = true;
        if (onProbe) onProbe(nodeId);
    }, [nodeId, onProbe]);

    return (
        <Group 
            x={x} y={y} 
            onMouseEnter={handleMouseEnter} 
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            style={{ cursor: 'pointer' }}
        >
            <Circle 
                radius={8} fill={color} stroke="white" strokeWidth={2} 
                perfectDrawEnabled={false}
            />
            {hover && (
                <Label y={-10} opacity={1}>
                    <Tag fill="rgba(0,0,0,0.8)" pointerDirection="down" pointerWidth={10} pointerHeight={10} cornerRadius={6} />
                    <Text 
                        text={`Node ${nodeId}\n${voltage.toFixed(3)} V\n${isProbed ? '📍 Probed' : '🔍 Click to probe'}`} 
                        fill="white" padding={10} fontSize={14} fontFamily="Arial" align="center"
                    />
                </Label>
            )}
            {!hover && (
                <Text 
                    text={String(nodeId)} fontSize={11} fill="white" x={-3.5} y={-5} 
                    fontStyle="bold" listening={false} perfectDrawEnabled={false}
                />
            )}
        </Group>
    );
});

// --- COMPONENT INFO OVERLAY (Shows current and voltage on hover) ---
const ComponentInfoOverlay = memo(({ x, y, current, voltageDrop, label }) => {
    const [hover, setHover] = useState(false);

    const formatA = (amp) => {
        if (amp === undefined || amp === null) return null;
        if (Math.abs(amp) < 1e-9) return '0 A';
        if (Math.abs(amp) < 1e-6) return `${(amp * 1e9).toFixed(1)} nA`;
        if (Math.abs(amp) < 1e-3) return `${(amp * 1e6).toFixed(1)} µA`;
        if (Math.abs(amp) < 1) return `${(amp * 1e3).toFixed(2)} mA`;
        return `${amp.toFixed(2)} A`;
    };

    const formatV = (volt) => {
        if (volt === undefined || volt === null) return null;
        if (Math.abs(volt) < 1e-9) return '0 V';
        if (Math.abs(volt) < 1e-3) return `${(volt * 1e3).toFixed(2)} mV`;
        return `${volt.toFixed(3)} V`;
    };

    const currentText = formatA(current !== undefined ? Math.abs(current) : null);
    const voltageText = formatV(voltageDrop !== undefined ? Math.abs(voltageDrop) : null);

    // Build info lines
    const lines = [];
    if (label) lines.push(label);
    if (voltageText) lines.push(`ΔV: ${voltageText}`);
    if (currentText) lines.push(`I: ${currentText}`);

    if (lines.length === 0) return null;

    const handleMouseEnter = useCallback(() => setHover(true), []);
    const handleMouseLeave = useCallback(() => setHover(false), []);

    return (
        <Group x={x} y={y}>
            {/* Invisible hit area for hover detection - Reduced size to expose pins/nodes */}
            <Rect 
                x={-30} y={-20} width={60} height={40} 
                fill="transparent"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            />
            {hover && (
                <Label y={-45}>
                    <Tag 
                        fill="rgba(0,0,0,0.85)" 
                        pointerDirection="down" 
                        pointerWidth={10} 
                        pointerHeight={6} 
                        cornerRadius={6}
                    />
                    <Text 
                        text={lines.join('\n')}
                        fill="white" 
                        padding={8} 
                        fontSize={12} 
                        fontFamily="Arial" 
                        align="center"
                        lineHeight={1.4}
                    />
                </Label>
            )}
        </Group>
    );
});

// --- WIRE COMPONENT (Memoized) ---
const Wire = memo(({ wire, isHighlighted, strokeColor, onClick }) => {
    return (
        <Group onClick={onClick}>
            {isHighlighted && (
                <Line points={wire.points} stroke="rgba(255, 215, 0, 0.6)" strokeWidth={14} lineCap="round" lineJoin="round" perfectDrawEnabled={false} />
            )}
            <Line points={wire.points} stroke="transparent" strokeWidth={10} perfectDrawEnabled={false} />
            <Line points={wire.points} stroke={strokeColor} strokeWidth={2} lineCap="round" perfectDrawEnabled={false} />
        </Group>
    );
});

const CircuitEditor = () => {
    const { 
        stagePos, setStagePos, stageScale, setStageScale,
        tool, setTool,
        wires, setWires,
        theme,
        components, setComponents,
        selectedIds,
        setSelectedIds,
        spawnComponent,
        undo, redo,
        saveState
    } = useCircuit();

    const [isDrawingWire, setIsDrawingWire] = useState(false);
    const [wirePoints, setWirePoints] = useState([]);
    const [cursorPos, setCursorPos] = useState({x:0, y:0});
    const [cutRect, setCutRect] = useState(null);
    const dragStart = useRef(null);

    // --- STATE FOR SIMULATION RESULTS ---
    const [simOutput, setSimOutput] = useState(null);
    const [showSim, setShowSim] = useState(false);
    const [simNodeLocations, setSimNodeLocations] = useState({}); 
    const [simNodeValues, setSimNodeValues] = useState({}); 
    const [simComponentMap, setSimComponentMap] = useState({}); 
    const [simCurrentValues, setSimCurrentValues] = useState({}); 
    const [simVoltageDrops, setSimVoltageDrops] = useState({});
    const [simNodeMap, setSimNodeMap] = useState(null);
    const [highlightNode, setHighlightNode] = useState(null);
    const [probeNodeIds, setProbeNodeIds] = useState([]); // Array for multiple wire probing during transient
    const [tranEndTime, setTranEndTime] = useState(0.01); // Transient analysis end time in seconds (default 10ms)
    const [parsedSimData, setParsedSimData] = useState(null); // Store full parsed data for probing
    const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);

    const nodes = useMemo(() => getJunctions(wires), [wires]);

    const assistantNetlist = useMemo(() => {
        try {
            return generateNetlist(components, wires, { tranEndTime }).netlist;
        } catch {
            return '* Simple Circuit Simulation\n.OP\n.TRAN 1m 100m\n.END';
        }
    }, [components, wires, tranEndTime]);

    // Pre-compute wire node mapping for highlight (avoid recalc on every render)
    const wireNodeMapping = useMemo(() => {
        if (!simNodeMap) return new Map();
        const mapping = new Map();
        wires.forEach(w => {
            const nodeId = simNodeMap.get(coordId(w.points[0], w.points[1]));
            mapping.set(w.id, nodeId);
        });
        return mapping;
    }, [wires, simNodeMap]);

    // Stable callback for hover to avoid re-creating on every render
    const handleNodeHover = useCallback((nodeId) => {
        setHighlightNode(nodeId);
    }, []);

    const handleCloseSim = useCallback(() => setShowSim(false), []);

    // Keyboard handling
    useEffect(() => {
        const handleKey = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
            if (e.ctrlKey) {
                if (e.key === 'z') { e.preventDefault(); undo(); return; }
                if (e.key === 'y') { e.preventDefault(); redo(); return; }
                if (e.key === 'r') { 
                    e.preventDefault(); 
                    setComponents(prev => prev.map(c => 
                        selectedIds.includes(c.id) ? { ...c, rotation: (c.rotation + 90) % 360 } : c
                    ));
                }
                return; 
            }
            switch(e.key.toLowerCase()) {
                case 'escape': setIsDrawingWire(false); setWirePoints([]); setCutRect(null); setTool('select'); break;
                case 'm': setIsDrawingWire(false); setWirePoints([]); setCutRect(null); setTool('select'); break;
                case 'backspace': setTool(p => p === 'delete' ? 'select' : 'delete'); setSelectedIds([]); break;
                case 'w': setTool('wire'); setSelectedIds([]); break;
                case 'r': spawnComponent('resistor'); break;
                case 'c': spawnComponent('capacitor'); break;
                case 'v': spawnComponent('source'); break;
                case 'g': spawnComponent('ground'); break;
                case 'f': // Flip/Mirror selected components
                    if (selectedIds.length > 0) {
                        e.preventDefault();
                        setComponents(prev => prev.map(c => 
                            selectedIds.includes(c.id) ? { ...c, flip: !c.flip } : c
                        ));
                    }
                    break;
                default: break;
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [tool, setTool, setComponents, selectedIds, spawnComponent]);

    // Mouse handlers
    const getSnappedPos = (x, y) => {
        let closest = null;
        let minDst = 15;
        if (tool === 'wire') {
            components.forEach(c => {
                getPins(c).forEach(p => {
                    const dx = Math.abs(p.x - x);
                    const dy = Math.abs(p.y - y);
                    if (dx < minDst && dy < minDst) { closest = p; minDst = Math.max(dx, dy); }
                });
            });
            if (closest) return closest;
        }
        return { x: snap(x), y: snap(y) };
    };
    const handleWheel = (e) => {
        e.evt.preventDefault();
        const scaleBy = 1.1;
        const stage = e.target.getStage();
        const oldScale = stage.scaleX();
        const pointer = stage.getPointerPosition();
        const mousePointTo = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale };
        let newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
        newScale = Math.max(0.5, Math.min(newScale, 2.0));
        setStageScale(newScale);
        setStagePos({ x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale });
    };
    const handleMouseDown = (e) => {
        if (tool === 'delete' && e.evt.button === 0) {
           const stage = e.target.getStage();
           const pos = getRelativePointerPosition(stage.getLayers()[0]);
           dragStart.current = pos;
           setCutRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
           return;
        }
        if (tool === 'wire') {
            const stage = e.target.getStage();
            const pos = getRelativePointerPosition(stage.getLayers()[0]);
            const snapped = getSnappedPos(pos.x, pos.y);
            if (!isDrawingWire) {
                setIsDrawingWire(true);
                setWirePoints([snapped.x, snapped.y, snapped.x, snapped.y]);
            } else {
                setIsDrawingWire(false);
                if (wirePoints[0] !== snapped.x || wirePoints[1] !== snapped.y) {
                  saveState();
                  setWires(prev => [...prev, { id: `wire-${Date.now()}`, points: wirePoints }]);
                }
                setWirePoints([]);
            }
        }
    };
    const handleMouseMove = (e) => {
        const stage = e.target.getStage();
        const layer = stage.getLayers()[0];
        const pos = getRelativePointerPosition(layer);
        if (tool === 'delete' && dragStart.current) {
            const sx = dragStart.current.x;
            const sy = dragStart.current.y;
            setCutRect({ x: Math.min(sx, pos.x), y: Math.min(sy, pos.y), width: Math.abs(pos.x - sx), height: Math.abs(pos.y - sy) });
            return;
        }
        if (tool === 'wire') {
           const snapped = getSnappedPos(pos.x, pos.y);
           if (cursorPos.x !== snapped.x || cursorPos.y !== snapped.y) setCursorPos(snapped);
           if (isDrawingWire) setWirePoints(prev => [prev[0], prev[1], snapped.x, snapped.y]);
        }
    };
    const handleMouseUp = () => {
         if (tool === 'delete' && dragStart.current && cutRect) {
             const box = cutRect;
             const inBox = (x, y) => x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;
             setComponents(prev => prev.filter(c => !inBox(c.x, c.y)));
             setWires(prev => prev.filter(w => !inBox(w.points[0], w.points[1]) && !inBox(w.points[2], w.points[3])));
             setSelectedIds([]);
         }
         dragStart.current = null;
         setCutRect(null);
    };
    const handleWireClick = (id, e) => {
        e.cancelBubble = true; 
        if(tool === 'delete'){ 
            setWires(prev => prev.filter(w => w.id !== id)); 
        } else { 
            setSelectedIds([id]); 
            // If simulation is running, toggle probe for this wire's node
            if (showSim && simNodeMap) {
                const wire = wires.find(w => w.id === id);
                if (wire) {
                    const nodeId = simNodeMap.get(coordId(wire.points[0], wire.points[1]));
                    if (nodeId !== undefined) {
                        setProbeNodeIds(prev => {
                            const index = prev.indexOf(nodeId);
                            if (index === -1) {
                                // Add probe
                                return [...prev, nodeId];
                            } else {
                                // Remove probe
                                return prev.filter(n => n !== nodeId);
                            }
                        });
                    }
                }
            }
        }
    };

    // --- SIMULATION LOGIC ---
    const handleRunSimulation = async (overrideTranEndTime) => {
        console.log("--- STARTING SIMULATION ---");
        
        // Use override time if provided (for re-run with new time)
        const effectiveTranEndTime = overrideTranEndTime !== undefined ? overrideTranEndTime : tranEndTime;
        console.log("Transient End Time:", effectiveTranEndTime, "seconds");
        
        // Reset probe nodes for fresh simulation
        setProbeNodeIds([]);
        
        const { netlist: rawNetlist, nodeLocations, componentMap, nodeMap } = generateNetlist(components, wires, { tranEndTime: effectiveTranEndTime });
        setSimNodeMap(nodeMap);
        setSimNodeLocations(nodeLocations);
        setSimComponentMap(componentMap);
        setSimNodeValues({'0': 0});
        setSimCurrentValues({});

        let netlist = rawNetlist;
        
        // Check if circuit has diodes (need relaxed convergence options)
        const hasDiodes = components.some(c => c.type === 'diode_ideal' || c.type === 'diode_model');
        
        const titleLine = "* Simple Circuit Simulation\n";
        if (netlist.startsWith(titleLine)) {
            // Add SPICE options for better convergence
            let optionsLine = ".options width=1024";
            if (hasDiodes) {
                // Relaxed convergence options for diode circuits
                optionsLine += " abstol=1e-9 reltol=0.01 vntol=1e-4 gmin=1e-12 method=gear";
            }
            netlist = netlist.replace(titleLine, `${titleLine}${optionsLine}\n`);
        } else {
             // Fallback if title changed
             netlist = `.options width=1024\n${netlist}`;
        }

        console.log("Netlist:", netlist);

        setShowSim(true);
        setSimOutput(["Initializing Simulator...", "Please wait..."]);

        try {
            const result = await spice.run(netlist);
            setSimOutput(result);
        } catch (error) {
            console.error(error);
            setSimOutput(["Simulation Error:", error.message]);
        }
    };

    const handleParsedData = useCallback((parsed) => {
        if (!parsed) return;

        // Store full parsed data for probing
        setParsedSimData(parsed);

        let voltageMap = { '0': 0 };
        let dcVoltageMap = { '0': 0 }; // Separate map for DC OP values

        // 1. Extract DC Operating Point values (from .OP analysis)
        // These are the steady-state DC bias values and should be used for the overlay
        if (parsed.nodes && parsed.nodes.length > 0) {
            parsed.nodes.forEach(n => { 
                // Only extract node voltages, not branch currents
                if (!n.name.includes('#branch') && !n.name.includes('[')) {
                    dcVoltageMap[n.name] = n.value; 
                }
            });
        }

        // 2. Extract transient table values (for reference, but don't use for DC overlay)
        if (parsed.table && parsed.table.rows.length > 0) {
            const lastRow = parsed.table.rows[parsed.table.rows.length - 1]; 

            // Extract currents from transient data
            if (simComponentMap) {
                const currentMap = {};
                Object.entries(simComponentMap).forEach(([compId, info]) => {
                    if (info.probe) {
                        const probeKey = info.probe.toLowerCase();
                        if (lastRow[probeKey] !== undefined) {
                            currentMap[compId] = lastRow[probeKey];
                        }
                    }
                });
                setSimCurrentValues(currentMap);
            }
        }

        // 3. Use DC OP values for the voltage overlay
        // DC OP gives the true steady-state operating point
        // For nodes not in DC OP, use 0 (ground reference)
        voltageMap = { ...dcVoltageMap };

        // Set voltage values
        setSimNodeValues(voltageMap);

        // Calculate voltage drops for each component using DC values
        if (simComponentMap) {
            const voltageDropMap = {};
            Object.entries(simComponentMap).forEach(([compId, info]) => {
                const v1 = voltageMap[String(info.node1)] ?? 0;
                const v2 = voltageMap[String(info.node2)] ?? 0;
                voltageDropMap[compId] = v1 - v2;
            });
            setSimVoltageDrops(voltageDropMap);
        }
    }, [simComponentMap]);

    return (
        <div style={{width: '100vw', height: '100vh', overflow: 'hidden', background: theme.bg }}>
            <Sidebar
                onToggleAIAssistant={() => setIsAIAssistantOpen(prev => !prev)}
                isAIAssistantOpen={isAIAssistantOpen}
                onRunSimulation={() => handleRunSimulation()}
            />

            <PropertiesPanel />

            <AIAssistantPanel
                isVisible={isAIAssistantOpen}
                onClose={() => setIsAIAssistantOpen(false)}
                theme={theme}
                currentNetlist={assistantNetlist}
            />
            
            <SimulationOutput 
                isVisible={showSim}
                data={simOutput}
                onClose={() => setShowSim(false)}
                onParsedData={handleParsedData}
                probeNodeIds={probeNodeIds}
                onProbeNodeChange={setProbeNodeIds}
                tranEndTime={tranEndTime}
                onTranEndTimeChange={setTranEndTime}
                onRerunSimulation={handleRunSimulation}
            />
            
            <Stage
                width={window.innerWidth}
                height={window.innerHeight}
                onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onWheel={handleWheel}
                draggable={tool === 'select'}
                x={stagePos.x} y={stagePos.y}
                scaleX={stageScale} scaleY={stageScale}
                onDragEnd={(e) => { if(e.target === e.target.getStage()){ setStagePos({ x: e.target.x(), y: e.target.y() }); } }}
                style={{ cursor: tool === 'select' ? 'grab' : (tool === 'delete' ? 'not-allowed' : 'crosshair') }}
            >
                <Layer>
                    <InfiniteGrid stagePos={stagePos} stageScale={stageScale} theme={theme} />

                    {/* WIRES - Using memoized component */}
                    {wires.map((w) => {
                        const wireNode = wireNodeMapping.get(w.id);
                        const isHighlighted = highlightNode !== null && wireNode === highlightNode;
                        
                        return (
                            <Wire 
                                key={w.id}
                                wire={w}
                                isHighlighted={isHighlighted}
                                strokeColor={theme.stroke}
                                onClick={(e) => handleWireClick(w.id, e)}
                            />
                        );
                    })}

                    {/* JUNCTIONS (NODES) */}
                    {nodes.map((n, i) => (
                        <Rect key={`node-${i}`} x={n.x - 3} y={n.y - 3} width={6} height={6} fill={theme.node} perfectDrawEnabled={false} />
                    ))}

                    {/* COMPONENTS */}
                    {components.map(comp => (
                        <CircuitComponent key={comp.id} data={comp} />
                    ))}

                    {/* TOOLS UI */}
                    {isDrawingWire && <Line points={wirePoints} stroke="#1890ff" strokeWidth={2} dash={[5, 5]} perfectDrawEnabled={false} />}
                    {tool === 'wire' && <Rect x={cursorPos.x - 2} y={cursorPos.y - 2} width={4} height={4} fill="red" perfectDrawEnabled={false} />}
                    {cutRect && <Rect x={cutRect.x} y={cutRect.y} width={cutRect.width} height={cutRect.height} fill="rgba(255, 77, 79, 0.3)" stroke="#ff4d4f" perfectDrawEnabled={false} />}
                    
                    {/* COMPONENT INFO OVERLAY (Current & Voltage Drop on hover) */}
                    {showSim && components.filter(c => c.type !== 'ground').map(c => (
                        <ComponentInfoOverlay 
                            key={`info-${c.id}`} 
                            x={c.x}
                            y={c.y}
                            current={simCurrentValues[c.id]}
                            voltageDrop={simVoltageDrops[c.id]}
                            label={c.label}
                        />
                    ))}

                    {/* VOLTAGE INDICATORS - Render LAST to be on top of components for prioritization */}
                    {showSim && Object.entries(simNodeLocations).map(([id, loc]) => (
                        simNodeValues[id] !== undefined && (
                            <VoltageIndicator 
                                key={`v-${id}`} 
                                x={loc.x} y={loc.y} 
                                voltage={simNodeValues[id]} 
                                nodeId={parseInt(id)} 
                                onHover={handleNodeHover}
                                onProbe={(nodeId) => {
                                    setProbeNodeIds(prev => {
                                        const index = prev.indexOf(nodeId);
                                        if (index === -1) {
                                            return [...prev, nodeId];
                                        } else {
                                            return prev.filter(n => n !== nodeId);
                                        }
                                    });
                                }}
                                isProbed={probeNodeIds.includes(parseInt(id))}
                            />
                        )
                    ))}
                    
                </Layer>
            </Stage>
        </div>
    );
};

export default function CircuitSimulator() {
  return (
    <CircuitProvider>
      <CircuitEditor />
    </CircuitProvider>
  );
}
