import React, { useState, useRef, useMemo, useEffect,useCallback } from 'react';
import { Stage, Layer, Line, Rect, Group, Circle, Text, Label, Tag } from 'react-konva';
import { CircuitProvider, useCircuit } from './context/CircuitContext';
import InfiniteGrid from './components/InfiniteGrid';
import CircuitComponent from './Canvas/CircuitComponent';
import Sidebar from './components/Sidebar';
import PropertiesPanel from './components/PropertiesPanel';
import { snap, getRelativePointerPosition, getJunctions, getPins } from './utils/math';
import { generateNetlist } from './utils/networkAnalysis';

import { spice } from './utils/spiceEngine';
import SimulationOutputOriginal from './components/SimulationOutput';

const SimulationOutput = React.memo(SimulationOutputOriginal);

// Helper for mapping coordinates (replicated from networkAnalysis)
const coordId = (x, y) => `${Math.round(x)},${Math.round(y)}`;

// --- VOLTAGE INDICATOR COMPONENT ---
const VoltageIndicator = ({ x, y, voltage, nodeId , onHover}) => {
    const [hover, setHover] = useState(false);
    const color = '#1890ff';

    return (
        <Group 
            x={x} y={y} 
            onMouseEnter={() => { setHover(true); onHover(nodeId); }} 
            onMouseLeave={() => { setHover(false); onHover(null); }}
        >
            <Circle 
                radius={8} fill={color} stroke="white" strokeWidth={2} 
                shadowBlur={4} shadowColor="black" shadowOpacity={0.3}
            />
            {hover && (
                <Label y={-10} opacity={1}>
                    <Tag fill="rgba(0,0,0,0.8)" pointerDirection="down" pointerWidth={10} pointerHeight={10} cornerRadius={6} shadowBlur={10} />
                    <Text 
                        text={`Node ${nodeId}\n${voltage.toFixed(3)} V`} 
                        fill="white" padding={10} fontSize={14} fontFamily="Arial" align="center"
                    />
                </Label>
            )}
             {!hover && (
                <Text 
                    text={nodeId} fontSize={11} fill="white" x={-3.5} y={-5} 
                    fontStyle="bold" listening={false}
                />
             )}
        </Group>
    );
};

// --- CURRENT INDICATOR COMPONENT ---
const CurrentIndicator = ({ component, current }) => {
    if (current === undefined || current === null) return null;

    const formatA = (amp) => {
        if (Math.abs(amp) < 1e-9) return '0 A';
        if (Math.abs(amp) < 1e-6) return `${(amp * 1e9).toFixed(1)} nA`;
        if (Math.abs(amp) < 1e-3) return `${(amp * 1e6).toFixed(1)} µA`;
        if (Math.abs(amp) < 1) return `${(amp * 1e3).toFixed(2)} mA`;
        return `${amp.toFixed(2)} A`;
    };

    const text = formatA(Math.abs(current));
    const isForward = current >= 0; 
    
    return (
        <Group x={component.x} y={component.y} rotation={component.rotation}>
             <Rect 
                x={-24} y={-24} width={48} height={16} 
                fill="rgba(255, 255, 255, 0.9)" 
                stroke="#faad14" strokeWidth={1} cornerRadius={4}
                shadowBlur={2} shadowOpacity={0.1}
            />
            <Text 
                x={-24} y={-22} width={48} 
                text={text} 
                fontSize={10} fontFamily="Arial" fill="#faad14" align="center" 
                fontStyle="bold"
            />
            <Text 
                x={isForward ? 12 : -18} y={-21}
                text={isForward ? "→" : "←"}
                fontSize={10} fill="#faad14" fontStyle="bold"
            />
        </Group>
    );
};

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
    const [simNodeMap, setSimNodeMap] = useState(null); // Add state
    const [highlightNode, setHighlightNode] = useState(null); // Add state

    const nodes = useMemo(() => getJunctions(wires), [wires]);

    const handleCloseSim = useCallback(() => setShowSim(false), []);

    // Keyboard handling
    useEffect(() => {
        const handleKey = (e) => {
            if (e.target.tagName === 'INPUT') return;
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
        if(tool === 'delete'){ setWires(prev => prev.filter(w => w.id !== id)); } else { setSelectedIds([id]); }
    };

    // --- SIMULATION LOGIC ---
    const handleRunSimulation = async () => {
        console.log("--- STARTING SIMULATION ---");
        
        const { netlist: rawNetlist, nodeLocations, componentMap, nodeMap } = generateNetlist(components, wires);
        setSimNodeMap(nodeMap);
        setSimNodeLocations(nodeLocations);
        setSimComponentMap(componentMap);
        setSimNodeValues({'0': 0});
        setSimCurrentValues({});

        let netlist = rawNetlist;
        
        const titleLine = "* Simple Circuit Simulation\n";
        if (netlist.startsWith(titleLine)) {
            netlist = netlist.replace(titleLine, `${titleLine}.options width=1024\n`);
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

        // 1. Extract DC Nodes (if explicit .OP was run or parsed from .TRAN initial)
        if (parsed.nodes && parsed.nodes.length > 0) {
            // FIX: Ensure clean map starts with Ground
            const voltageMap = { '0': 0 };
            parsed.nodes.forEach(n => { voltageMap[n.name] = n.value; });
            setSimNodeValues(voltageMap);
        }

        if (parsed.table && parsed.table.rows.length > 0) {
            const lastRow = parsed.table.rows[parsed.table.rows.length - 1]; 
            
            // FIX: Use functional update to avoid dependency on simNodeValues
            setSimNodeValues(prevValues => {
                // Ensure we keep existing ground if present, or add it if missing
                const voltageMapUpdate = { '0': 0, ...prevValues };
                Object.keys(lastRow).forEach(key => {
                    if (key.startsWith('v(')) {
                        const nodeStr = key.replace('v(', '').replace(')', '');
                        if (voltageMapUpdate[nodeStr] === undefined) {
                             voltageMapUpdate[nodeStr] = lastRow[key];
                        }
                    }
                });
                return voltageMapUpdate;
            });

            if (simComponentMap) {
                const currentMap = {};
                Object.entries(simComponentMap).forEach(([compId, info]) => {
                    const probeKey = info.probe.toLowerCase();
                    if (lastRow[probeKey] !== undefined) {
                        currentMap[compId] = lastRow[probeKey];
                    }
                });
                setSimCurrentValues(currentMap);
            }
        }
    }, [simComponentMap]);

    return (
        <div style={{width: '100vw', height: '100vh', overflow: 'hidden', background: theme.bg }}>
            <Sidebar />

            <div style={{ position: 'absolute', top: 10, right: 280, zIndex: 100 }}>
                <button 
                    onClick={handleRunSimulation}
                    style={{
                        padding: '10px 20px', background: '#52c41a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                    }}
                >
                    Run Simulation ▶
                </button>
            </div>

            <PropertiesPanel />
            
            <SimulationOutput 
                isVisible={showSim}
                data={simOutput}
                onClose={() => setShowSim(false)}
                onParsedData={handleParsedData}
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

                    {/* WIRES */}
                    {wires.map((w) => {
                        const startNode = simNodeMap ? simNodeMap.get(coordId(w.points[0], w.points[1])) : null;
                        // const endNode = simNodeMap ? simNodeMap.get(coordId(w.points[2], w.points[3])) : null; // Usually same
                        const isHighlighted = highlightNode !== null && startNode === highlightNode;
                        
                        return (
                            <Group key={w.id} onClick={(e) => handleWireClick(w.id, e)}>
                                {isHighlighted && (
                                     <Line points={w.points} stroke="rgba(255, 215, 0, 0.6)" strokeWidth={14} lineCap="round" lineJoin="round" />
                                )}
                                <Line points={w.points} stroke="transparent" strokeWidth={10} />
                                <Line points={w.points} stroke={theme.stroke} strokeWidth={2} lineCap="round" />
                            </Group>
                        );
                    })}

                    {/* JUNCTIONS (NODES) */}
                    {nodes.map((n, i) => (
                        <Rect key={`node-${i}`} x={n.x - 3} y={n.y - 3} width={6} height={6} fill={theme.node} />
                    ))}

                    {/* COMPONENTS */}
                    {components.map(comp => (
                        <CircuitComponent key={comp.id} data={comp} />
                    ))}

                    {/* TOOLS UI */}
                    {isDrawingWire && <Line points={wirePoints} stroke="#1890ff" strokeWidth={2} dash={[5, 5]} />}
                    {tool === 'wire' && <Rect x={cursorPos.x - 2} y={cursorPos.y - 2} width={4} height={4} fill="red" />}
                    {cutRect && <Rect x={cutRect.x} y={cutRect.y} width={cutRect.width} height={cutRect.height} fill="rgba(255, 77, 79, 0.3)" stroke="#ff4d4f" />}
                    
                    {/* VOLTAGE INDICATORS */}
                    {showSim && Object.entries(simNodeLocations).map(([id, loc]) => (
                        simNodeValues[id] !== undefined && (
                            <VoltageIndicator 
                                key={`v-${id}`} 
                                x={loc.x} y={loc.y} 
                                voltage={simNodeValues[id]} 
                                nodeId={parseInt(id)} 
                                onHover={setHighlightNode}
                            />
                        )
                    ))}

                    {/* CURRENT INDICATORS (NEW COMPONENT CURRENT BADGES) */}
                    {showSim && components.map(c => (
                        simCurrentValues[c.id] !== undefined && (
                            <CurrentIndicator 
                                key={`i-${c.id}`} 
                                component={c} 
                                current={simCurrentValues[c.id]}
                            />
                        )
                    ))}
                    
                </Layer>
            </Stage>
        </div>
    );
};

export default function App() {
  return (
    <CircuitProvider>
      <CircuitEditor />
    </CircuitProvider>
  );
}