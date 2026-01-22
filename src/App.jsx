import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Group } from 'react-konva';
import { CircuitProvider, useCircuit } from './context/CircuitContext';
import InfiniteGrid from './components/InfiniteGrid'; // Or './components/Canvas/InfiniteGrid' depending on where you put it
import CircuitComponent from './Canvas/CircuitComponent';
import Sidebar from './components/Sidebar';
import PropertiesPanel from './components/PropertiesPanel';
import { snap, getRelativePointerPosition, getJunctions, getPins } from './utils/math';

// This component handles the Canvas Logic (Mouse events, Tools)
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
        saveState,
        // We handle wire drawing state locally or in context. 
        // For simplicity, local state for temporary drawing actions is fine.
    } = useCircuit();

    const [isDrawingWire, setIsDrawingWire] = useState(false);
    const [wirePoints, setWirePoints] = useState([]);
    const [cursorPos, setCursorPos] = useState({x:0, y:0});
    const [cutRect, setCutRect] = useState(null);
    const dragStart = useRef(null);

    // Calculate junctions
    const nodes = useMemo(() => getJunctions(wires), [wires]);

    // --- KEYBOARD SHORTCUTS ---
    useEffect(() => {
        const handleKey = (e) => {
            // Ignore if typing in an input box
            if (e.target.tagName === 'INPUT') return;
            if (e.ctrlKey) {
                if (e.key === 'z' || e.key === 'Z') {
                    e.preventDefault();
                    undo();
                    return;
                }
                if (e.key === 'y' || e.key === 'Y') {
                    e.preventDefault();
                    redo();
                    return;
                }
                if (e.key === 'r' || e.key === 'R') {
                    e.preventDefault(); // Stop browser refresh
                    setComponents(prev => prev.map(c => 
                        selectedIds.includes(c.id) ? { ...c, rotation: (c.rotation + 90) % 360 } : c
                    ));
                }
                return; // Exit early so 'r' doesn't also spawn a resistor
            }

            // 2. Single Keys
            switch(e.key.toLowerCase()) {
                case 'escape':
                    setIsDrawingWire(false);
                    setWirePoints([]);
                    setCutRect(null);
                    setTool('select');
                    break;
                case 'backspace':
                    setTool(prev => prev === 'delete' ? 'select' : 'delete');
                    setSelectedIds([]);
                    break;
                case 'w':
                    setTool('wire');
                    setSelectedIds([]);
                    break;
                case 'r':
                    spawnComponent('resistor');
                    break;
                case 'c':
                    spawnComponent('capacitor');
                    break;
                case 'v':
                    spawnComponent('source');
                    break;
                default:
                    break;
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [tool, setTool, setComponents, selectedIds, spawnComponent]);


    // --- HELPER: SNAP LOGIC ---
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

    // --- MOUSE HANDLERS ---
    const handleWheel = (e) => {
        e.evt.preventDefault();
        const scaleBy = 1.1;
        const stage = e.target.getStage();
        const oldScale = stage.scaleX();
        const pointer = stage.getPointerPosition();
        const mousePointTo = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale };
        
        // Clamp scale
        let newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
        newScale = Math.max(0.5, Math.min(newScale, 2.0));
    
        setStageScale(newScale);
        setStagePos({ x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale });
    };

    const handleMouseDown = (e) => {
        // Box Select / Delete
        if (tool === 'delete' && e.evt.button === 0) {
           const stage = e.target.getStage();
           const pos = getRelativePointerPosition(stage.getLayers()[0]);
           dragStart.current = pos;
           setCutRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
           return;
        }
        // Wire Start
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

        // Update Cut Rect
        if (tool === 'delete' && dragStart.current) {
            const sx = dragStart.current.x;
            const sy = dragStart.current.y;
            setCutRect({
                x: Math.min(sx, pos.x), y: Math.min(sy, pos.y),
                width: Math.abs(pos.x - sx), height: Math.abs(pos.y - sy)
            });
            return;
        }
        // Update Wire
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
             // Also clear selection
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
        }
    };

    return (
        <div style={{width: '100vw', height: '100vh', overflow: 'hidden', background: theme.bg }}>
            <Sidebar />
            <PropertiesPanel />
            
            <Stage
                width={window.innerWidth}
                height={window.innerHeight}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onWheel={handleWheel}
                draggable={tool === 'select'}
                x={stagePos.x} y={stagePos.y}
                scaleX={stageScale} scaleY={stageScale}
                onDragEnd={(e) => { 
                    if(e.target === e.target.getStage()){ setStagePos({ x: e.target.x(), y: e.target.y() }); }
                }}
                style={{ cursor: tool === 'select' ? 'grab' : (tool === 'delete' ? 'not-allowed' : 'crosshair') }}
            >
                <Layer>
                    <InfiniteGrid stagePos={stagePos} stageScale={stageScale} theme={theme} />

                    {/* WIRES */}
                    {wires.map((w) => (
                        <Group key={w.id} onClick={(e) => handleWireClick(w.id, e)}>
                             <Line points={w.points} stroke="transparent" strokeWidth={10} />
                             <Line points={w.points} stroke={theme.stroke} strokeWidth={2} lineCap="round" />
                        </Group>
                    ))}

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