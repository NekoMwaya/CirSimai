import React, { useEffect, useState, useRef } from 'react';
import { Stage, Layer, Text, Line, Circle } from 'react-konva';
import { Link } from 'react-router-dom';
import { WokwiComponent } from '../components/embedded/WokwiElements';
import { WokwiPinRegistry } from '../utils/wokwiPinRegistry';
import { WOKWI_COMPONENT_CATALOG } from '../utils/wokwiComponentCatalog';
import { buildNetlist } from '../utils/circuitCompilation';
import Editor, { DiffEditor } from '@monaco-editor/react';
import AIAssistantPanel from '../components/AIAssistantPanel';
import { Bot, Library, Plus, X, Save, FolderOpen } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const DEFAULT_SKETCH = `void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(1000);
  digitalWrite(13, LOW);
  delay(1000);
}
`;

// Helper to calculate absolute pin position on the canvas
const getAbsolutePinPos = (component, pinId, pinsOverride = null) => {
  const fallbackPins = WokwiPinRegistry[component.type]?.pins ?? {};
  const pins = pinsOverride ?? fallbackPins;
  if (!pins[pinId]) return { x: component.x, y: component.y };
  const pin = pins[pinId];
  const rotation = ((component.rotation ?? 0) * Math.PI) / 180;
  const originX = component.x + (WokwiPinRegistry[component.type]?.width ?? 0) / 2;
  const originY = component.y + (WokwiPinRegistry[component.type]?.height ?? 0) / 2;
  const offsetX = pin.x - (WokwiPinRegistry[component.type]?.width ?? 0) / 2;
  const offsetY = pin.y - (WokwiPinRegistry[component.type]?.height ?? 0) / 2;
  const rotatedX = offsetX * Math.cos(rotation) - offsetY * Math.sin(rotation);
  const rotatedY = offsetX * Math.sin(rotation) + offsetY * Math.cos(rotation);
  return {
    x: originX + rotatedX,
    y: originY + rotatedY
  };
};

export default function EmbeddedSimulator() {
  const { user } = useAuth();
  const [code, setCode] = useState(DEFAULT_SKETCH);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilerLogs, setCompilerLogs] = useState('Ready.');
  const [selectedComponentIds, setSelectedComponentIds] = useState([]);
  const [selectedWireId, setSelectedWireId] = useState(null);
  const [clipboard, setClipboard] = useState([]);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [stagedCode, setStagedCode] = useState(null);
  const [libraries, setLibraries] = useState([]);
  const [newLibraryName, setNewLibraryName] = useState('');
  const [isComponentMenuOpen, setIsComponentMenuOpen] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState('components');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Project persistence state
  const [projectId, setProjectId] = useState(null);
  const [projectName, setProjectName] = useState('Untitled Embedded Project');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'success' | 'error' | null
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveModalName, setSaveModalName] = useState('');

  // Load project from ?project=<id> URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const pidParam = params.get('project');
    if (!pidParam) return;

    supabase
      .from('circuit_projects')
      .select('*')
      .eq('id', pidParam)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) { console.error('Failed to load project:', error); return; }
        if (data.components) setComponents(data.components);
        if (data.wires)      setWires(data.wires);
        // code + libraries were packed into description as JSON
        if (data.description) {
          try {
            const extra = JSON.parse(data.description);
            if (extra.code)      setCode(extra.code);
            if (extra.libraries) setLibraries(extra.libraries);
          } catch { /* description is plain text, ignore */ }
        }
        setProjectId(data.id);
        setProjectName(data.name || 'Untitled Embedded Project');
        window.history.replaceState(null, '', window.location.hash.split('?')[0]);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLibrarySearch = (query) => {
    setNewLibraryName(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://compiler-service.fly.dev/libraries/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setSearchResults(data.libraries || []);
      } catch (err) {
        console.error("Library search error:", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  // Derive selectedComponentId for legacy compatibility in the sidebar UI
  const selectedComponentId = selectedComponentIds[selectedComponentIds.length - 1] || null;
  
  // Dynamic Simulation State
  const [components, setComponents] = useState([]);
  const [wires, setWires] = useState([]);
  const [componentPins, setComponentPins] = useState({});
  const [componentSearch, setComponentSearch] = useState('');
  
  // Snapping & Drawing Engine State
  const [drawingWire, setDrawingWire] = useState(null); // { startComponent, startPin, points: [x,y,x,y] }
  const [snapPoint, setSnapPoint] = useState(null); // { x, y, component, pin }
  
  const stageContainerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 600 });
  const workerRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      if (stageContainerRef.current) {
        setDimensions({
          width: stageContainerRef.current.offsetWidth,
          height: stageContainerRef.current.offsetHeight
        });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    return () => stopSimulation();
  }, []);

  const handleDeleteWire = (wireId) => {
    setWires((currentWires) => currentWires.filter((wire) => wire.id !== wireId));
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in code editor, search field, or input elements
      const targetTag = document.activeElement?.tagName;
      if (['INPUT', 'TEXTAREA'].includes(targetTag) || 
          document.activeElement?.classList.contains('monaco-editor') ||
          document.activeElement?.closest('.monaco-editor')) {
        return;
      }

      // Backspace / Delete to delete selected components and wires
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        if (selectedComponentIds.length > 0) {
          selectedComponentIds.forEach((id) => handleDeleteComponent(id));
          setSelectedComponentIds([]);
        }
        if (selectedWireId) {
          handleDeleteWire(selectedWireId);
          setSelectedWireId(null);
        }
      }

      // Copy: Ctrl + C
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        if (selectedComponentIds.length > 0) {
          const copied = components
            .filter((c) => selectedComponentIds.includes(c.id))
            .map((c) => ({ ...c }));
          setClipboard(copied);
        }
      }

      // Paste: Ctrl + V
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        if (clipboard.length > 0) {
          const newComps = clipboard.map((c) => ({
            ...c,
            id: `${c.type}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            x: c.x + 40,
            y: c.y + 40,
          }));
          setComponents((current) => [...current, ...newComps]);
          setSelectedComponentIds(newComps.map((c) => c.id));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedComponentIds, selectedWireId, components, clipboard]);

  const addComponent = (definition) => {
    setComponents((currentComponents) => {
      const index = currentComponents.length;
      const column = index % 3;
      const row = Math.floor(index / 3);

      return [
        ...currentComponents,
        {
          id: `${definition.type}-${Date.now()}`,
          type: definition.type,
          x: 80 + column * 140,
          y: 80 + row * 110,
          rotation: 0,
          ...(definition.defaultProps ?? {}),
        },
      ];
    });
  };

  const handleComponentPinsChange = (id, pins) => {
    setComponentPins((currentPins) => {
      if (currentPins[id] === pins) {
        return currentPins;
      }

      return {
        ...currentPins,
        [id]: pins,
      };
    });
  };

  // WIRING & SNAPPING ENGINE ===========================================
  
  const handlePinClick = (componentId, pinId) => {
    const component = components.find(c => c.id === componentId);
    const absPos = getAbsolutePinPos(component, pinId, componentPins[componentId]);

    if (!drawingWire) {
      // Start drawing a new wire
      setDrawingWire({
        startComponent: componentId,
        startPin: pinId,
        points: [absPos.x, absPos.y, absPos.x, absPos.y]
      });
    } else {
      // Finish drawing the wire
      // Prevent connecting a pin to itself
      if (drawingWire.startComponent === componentId && drawingWire.startPin === pinId) {
        setDrawingWire(null);
        return;
      }

      setWires([
        ...wires,
        {
          id: `wire-${Date.now()}`,
          startComponent: drawingWire.startComponent,
          startPin: drawingWire.startPin,
          endComponent: componentId,
          endPin: pinId,
          points: [drawingWire.points[0], drawingWire.points[1], absPos.x, absPos.y],
          color: '#1890ff' // Default wire color
        }
      ]);
      setDrawingWire(null);
      setSnapPoint(null);
    }
  };

  const handleStageMouseMove = (e) => {
    if (!drawingWire) return;
    
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    let endX = pointer.x;
    let endY = pointer.y;
    let currentSnap = null;

    // Snapping Logic: Check distance to all pins on all components
    const SNAP_THRESHOLD = 15;
    
    for (const comp of components) {
      const pins = componentPins[comp.id] || WokwiPinRegistry[comp.type]?.pins;
      if (!pins) continue;

      for (const [pinId] of Object.entries(pins)) {
        const absPos = getAbsolutePinPos(comp, pinId, pins);
        const dist = Math.hypot(pointer.x - absPos.x, pointer.y - absPos.y);
        
        if (dist < SNAP_THRESHOLD) {
          endX = absPos.x;
          endY = absPos.y;
          currentSnap = { x: absPos.x, y: absPos.y, component: comp.id, pin: pinId };
          break; // Snap to the first one found
        }
      }
      if (currentSnap) break;
    }

    setSnapPoint(currentSnap);
    setDrawingWire({
      ...drawingWire,
      points: [drawingWire.points[0], drawingWire.points[1], endX, endY]
    });
  };

  const rebuildWiresForComponent = (componentId, nextComponents, nextComponentPins) => {
    const updatedComponent = nextComponents.find((component) => component.id === componentId);
    if (!updatedComponent) return;

    const pins = nextComponentPins[componentId] || WokwiPinRegistry[updatedComponent.type]?.pins || {};
    setWires((currentWires) => currentWires.map((wire) => {
      let newPoints = [...wire.points];

      if (wire.startComponent === componentId) {
        const absPos = getAbsolutePinPos(updatedComponent, wire.startPin, pins);
        newPoints[0] = absPos.x;
        newPoints[1] = absPos.y;
      }
      if (wire.endComponent === componentId) {
        const absPos = getAbsolutePinPos(updatedComponent, wire.endPin, pins);
        newPoints[2] = absPos.x;
        newPoints[3] = absPos.y;
      }

      return { ...wire, points: newPoints };
    }));
  };

  const handleComponentDragEnd = (id, e) => {
    const newX = e.target.x();
    const newY = e.target.y();

    // 1. Update component position
    const updatedComponents = components.map(c => 
      c.id === id ? { ...c, x: newX, y: newY } : c
    );
    setComponents(updatedComponents);

    // 2. Update connected wires (Rubber-banding)
    rebuildWiresForComponent(id, updatedComponents, componentPins);
  };

  const handleDeleteComponent = (id) => {
    setComponents((currentComponents) => currentComponents.filter((component) => component.id !== id));
    setWires((currentWires) => currentWires.filter((wire) => wire.startComponent !== id && wire.endComponent !== id));
    setComponentPins((currentPins) => {
      const nextPins = { ...currentPins };
      delete nextPins[id];
      return nextPins;
    });
    setSelectedComponentIds((currentSelected) => currentSelected.filter((selectedId) => selectedId !== id));
  };

  const handleRotateComponent = (id) => {
    setComponents((currentComponents) => {
      const nextComponents = currentComponents.map((component) => (
        component.id === id ? { ...component, rotation: ((component.rotation ?? 0) + 90) % 360 } : component
      ));
      rebuildWiresForComponent(id, nextComponents, componentPins);
      return nextComponents;
    });
  };

  // SIMULATION ENGINE =================================================

  const stopSimulation = () => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'STOP' });
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setIsSimulating(false);
    
    // Turn off all LEDs
    setComponents(comps => comps.map(c => c.type === 'wokwi-led' ? { ...c, lit: false } : c));
    setCompilerLogs(prev => prev + '\nSimulation stopped.');
  };

  const compileAndRun = async () => {
    if (isSimulating) {
      stopSimulation();
      return;
    }

    setIsCompiling(true);
    setCompilerLogs('Compiling sketch in the cloud...');

    try {
      // In production, change to https://cirsim-compiler.fly.dev/compile
      const response = await fetch('https://compiler-service.fly.dev/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, libraries })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unknown compilation error');
      }

      setCompilerLogs('Compilation successful! Hex file loaded.\nStarting simulation...');
      
      workerRef.current = new Worker(new URL('../workers/avr.worker.js', import.meta.url), { type: 'module' });
      
      workerRef.current.onmessage = (e) => {
        const { type, id, updates } = e.data;
        if (type === 'STATE') {
          // Generic state update receiver! Unhardcoded.
          setComponents((comps) => comps.map(c => 
            c.id === id ? { ...c, ...updates } : c
          ));
        }
      };

      // Generate the un-hardcoded graph mapping connections
      const netlist = buildNetlist(components, wires);
      console.log('Generated Netlist:', netlist); // Added for debugging

      // Send firmware AND electrical circuit definition to the Engine
      workerRef.current.postMessage({ type: 'START', hex: data.hex, netlist });
      setIsSimulating(true);

    } catch (error) {
      console.error(error);
      setCompilerLogs(`COMPILER ERROR:\n${error.message}`);
    } finally {
      setIsCompiling(false);
    }
  };

  // ──────────────────────────── SAVE LOGIC ─────────────────────────────
  const doSave = async (nameOverride) => {
    if (!user) return;
    const name = nameOverride || projectName;
    // Pack code + libraries into `description` since there's no dedicated column
    const description = JSON.stringify({ code, libraries });
    const payload = {
      user_id: user.id,
      name,
      components,
      wires,
      description,
      is_public: false,
      project_type: 'embedded',
    };

    if (projectId && !nameOverride) {
      // Update existing project in-place
      const { data, error } = await supabase
        .from('circuit_projects')
        .update(payload)
        .eq('id', projectId)
        .select().single();
      if (error) throw error;
      return data;
    } else {
      // Insert as a brand-new project (always for Save As)
      const { data, error } = await supabase
        .from('circuit_projects')
        .insert(payload)
        .select().single();
      if (error) throw error;
      setProjectId(data.id);
      setProjectName(data.name);
      return data;
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!projectId) { setShowSaveModal(true); setSaveModalName(projectName); return; }
    setIsSaving(true); setSaveStatus(null);
    try { await doSave(); setSaveStatus('success'); setTimeout(() => setSaveStatus(null), 2000); }
    catch (err) { console.error(err); setSaveStatus('error'); setTimeout(() => setSaveStatus(null), 3000); }
    finally { setIsSaving(false); }
  };

  const handleSaveAs = async () => {
    if (!saveModalName.trim() || !user) return;
    setShowSaveModal(false); setIsSaving(true); setSaveStatus(null);
    try {
      await doSave(saveModalName.trim());
      setProjectName(saveModalName.trim());
      setSaveStatus('success'); setTimeout(() => setSaveStatus(null), 2000);
    } catch (err) { console.error('Save As error:', err?.message || err?.code || err); setSaveStatus('error'); setTimeout(() => setSaveStatus(null), 3000); }
    finally { setIsSaving(false); }
  };

  const filteredPalette = WOKWI_COMPONENT_CATALOG.filter((component) => {
    const search = componentSearch.trim().toLowerCase();
    if (!search) return true;
    return component.label.toLowerCase().includes(search) || component.type.toLowerCase().includes(search) || component.category.toLowerCase().includes(search);
  });

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0a0a', color: 'white' }}>
      
      {/* Save As Modal */}
      {showSaveModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }} onClick={() => setShowSaveModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#1a1a2e', border: '1px solid rgba(92,225,230,0.3)',
            borderRadius: 16, padding: 28, minWidth: 340,
            boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: 18, fontWeight: 700 }}>💾 Save Project As</h3>
            <input
              autoFocus
              value={saveModalName}
              onChange={e => setSaveModalName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveAs(); }}
              placeholder="Enter project name..."
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                border: '1px solid rgba(92,225,230,0.3)', background: '#0f1115',
                color: '#fff', outline: 'none', fontSize: 14, boxSizing: 'border-box', marginBottom: 16
              }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowSaveModal(false)} style={{
                padding: '8px 18px', borderRadius: 8, border: '1px solid #333',
                background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 13
              }}>Cancel</button>
              <button
                disabled={!saveModalName.trim()}
                onClick={handleSaveAs}
                style={{
                  padding: '8px 18px', borderRadius: 8, border: 'none',
                  background: saveModalName.trim() ? 'linear-gradient(90deg,#c2a8f7,#5ce1e6)' : '#333',
                  color: saveModalName.trim() ? '#000' : '#666',
                  cursor: saveModalName.trim() ? 'pointer' : 'not-allowed',
                  fontWeight: 700, fontSize: 13
                }}
              >Save</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '15px 20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', margin: 0, fontWeight: 'bold' }}>Embedded Simulator</h1>
          <p style={{ margin: '2px 0 0 0', color: '#888', fontSize: '0.85rem' }}>
            {projectName}
            {saveStatus === 'success' && <span style={{ color: '#22c55e', marginLeft: 8 }}>✓ Saved</span>}
            {saveStatus === 'error' && <span style={{ color: '#ef4444', marginLeft: 8 }}>⚠ Save failed</span>}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Save buttons */}
          <button
            onClick={handleSave}
            disabled={isSaving || !user}
            style={{
              padding: '8px 16px', background: '#1e3a5f',
              color: 'white', border: '1px solid rgba(92,225,230,0.2)',
              borderRadius: '6px', cursor: user ? 'pointer' : 'not-allowed',
              fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px',
              opacity: isSaving ? 0.7 : 1,
            }}
          >
            <Save size={14} /> {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => { setSaveModalName(projectName); setShowSaveModal(true); }}
            disabled={isSaving || !user}
            style={{
              padding: '8px 16px', background: '#1a1a2e',
              color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px', cursor: user ? 'pointer' : 'not-allowed',
              fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            <FolderOpen size={14} /> Save As
          </button>
          <button 
            onClick={compileAndRun}
            disabled={isCompiling}
            style={{
              padding: '8px 20px',
              background: isCompiling ? '#555' : (isSimulating ? '#ff4d4f' : '#1890ff'),
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isCompiling ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            {isCompiling ? 'Compiling...' : (isSimulating ? 'Stop' : 'Compile & Run')}
          </button>
          <button
            onClick={() => setActiveSidebarTab('components')}
            style={{ padding: '8px 20px', background: activeSidebarTab === 'components' ? '#4a007d' : '#333', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            📦 Components
          </button>
          <button
            onClick={() => setActiveSidebarTab('libraries')}
            style={{ padding: '8px 20px', background: activeSidebarTab === 'libraries' ? '#4a007d' : '#333', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Library size={16} /> Libraries
          </button>
          <button
            onClick={() => setIsAIAssistantOpen(prev => !prev)}
            style={{ padding: '8px 20px', background: isAIAssistantOpen ? '#4a007d' : '#333', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Bot size={16} /> AI Assistant
          </button>
          <Link to="/" style={{ padding: '8px 20px', background: '#dc3545', color: 'white', textDecoration: 'none', borderRadius: '6px', fontWeight: 'bold' }}>Exit</Link>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* Left Panel: Editor & Console */}
        <div style={{ width: '40%', display: 'flex', flexDirection: 'column', borderRight: '1px solid #333' }}>
          <div style={{ flex: 1 }}>
            {stagedCode !== null ? (
              <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '10px', background: '#252526', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333' }}>
                  <span style={{ color: '#ccc', fontSize: '0.9rem' }}>AI Code Review</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => { setCode(stagedCode); setStagedCode(null); }} style={{ padding: '6px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Keep</button>
                    <button onClick={() => setStagedCode(null)} style={{ padding: '6px 16px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Undo</button>
                  </div>
                </div>
                <DiffEditor
                  height="100%"
                  language="cpp"
                  theme="vs-dark"
                  original={code}
                  modified={stagedCode}
                  options={{ renderSideBySide: false, minimap: { enabled: false }, fontSize: 14 }}
                />
              </div>
            ) : (
              <Editor
                height="100%"
                defaultLanguage="cpp"
                theme="vs-dark"
                value={code}
                onChange={(value) => setCode(value || '')}
                options={{ minimap: { enabled: false }, fontSize: 14 }}
              />
            )}
          </div>
          
          <div style={{ height: '150px', background: '#1e1e1e', borderTop: '1px solid #333', padding: '10px', overflowY: 'auto' }}>
            <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '5px', fontWeight: 'bold' }}>COMPILER OUTPUT</div>
            <pre style={{ margin: 0, fontSize: '0.85rem', color: compilerLogs.includes('ERROR') ? '#ff4d4f' : '#a6e22e', whiteSpace: 'pre-wrap' }}>
              {compilerLogs}
            </pre>
          </div>
        </div>

        {/* Right Panel: Canvas + Palette */}
        <div style={{ width: '60%', display: 'flex', minWidth: 0, height: '100%' }}>
          <div ref={stageContainerRef} style={{ flex: 1, height: '100%', position: 'relative', minWidth: 0 }}>
            {/* Floating Component Menu */}
            <div style={{ position: 'absolute', top: 15, left: 15, zIndex: 10 }}>
              <button
                onClick={(e) => { e.stopPropagation(); setIsComponentMenuOpen(prev => !prev); }}
                style={{
                  width: 40, height: 40, borderRadius: '50%', background: '#ff4d4f', color: 'white', border: 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}
              >
                <Plus size={24} style={{ transform: isComponentMenuOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
              
              {isComponentMenuOpen && (
                <div style={{
                  position: 'absolute', top: 50, left: 0, width: 220, maxHeight: 400, overflowY: 'auto',
                  background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column'
                }}>
                  <div style={{ padding: '8px', borderBottom: '1px solid #333', position: 'sticky', top: 0, background: '#1a1a1a', zIndex: 2 }}>
                    <input
                      autoFocus
                      placeholder="Search parts..."
                      value={componentSearch}
                      onChange={(e) => setComponentSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ width: '100%', padding: '6px 10px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '4px', color: 'white', outline: 'none' }}
                    />
                  </div>
                  {filteredPalette.map((comp, idx) => (
                    <div
                      key={idx}
                      onClick={() => { addComponent(comp); setIsComponentMenuOpen(false); setComponentSearch(''); }}
                      style={{ padding: '10px 12px', borderBottom: '1px solid #2a2a2a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#2a2a2a'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', borderRadius: '4px' }}>
                        <span style={{ fontSize: '10px', color: '#888' }}>IMG</span>
                      </div>
                      <div style={{ flex: 1, fontSize: '0.85rem' }}>{comp.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Stage 
              width={dimensions.width} 
              height={dimensions.height}
              onMouseMove={handleStageMouseMove}
              onClick={(e) => {
                // Ignore if clicked on a component or wire instead of empty canvas
                if (e.target !== e.target.getStage()) return;

                // Click on empty canvas cancels drawing and deselects components & wires
                if (drawingWire) {
                  setDrawingWire(null);
                  setSnapPoint(null);
                } else {
                  setSelectedComponentIds([]);
                  setSelectedWireId(null);
                }
              }}
            >
              <Layer>
                {/* Render Completed Wires */}
                {wires.map(wire => (
                  <Line
                    key={wire.id}
                    points={wire.points}
                    stroke={selectedWireId === wire.id ? '#ff4d4f' : wire.color}
                    strokeWidth={selectedWireId === wire.id ? 6 : 3}
                    lineCap="round"
                    lineJoin="round"
                    onClick={(e) => {
                      e.cancelBubble = true;
                      setSelectedWireId(wire.id);
                      setSelectedComponentIds([]);
                    }}
                  />
                ))}

                {/* Render Active Drawing Wire */}
                {drawingWire && (
                  <Line
                    points={drawingWire.points}
                    stroke="#1890ff"
                    strokeWidth={3}
                    dash={[10, 5]}
                  />
                )}

                {/* Render Snapping Indicator */}
                {snapPoint && (
                  <Circle x={snapPoint.x} y={snapPoint.y} radius={8} fill="rgba(24, 144, 255, 0.5)" stroke="#1890ff" strokeWidth={2} />
                )}

                {/* Render Components */}
                {components.map((comp) => (
                  <WokwiComponent
                    key={comp.id}
                    type={comp.type}
                    x={comp.x}
                    y={comp.y}
                    rotation={comp.rotation || 0}
                    color={comp.color}
                    lit={comp.lit}
                    selected={selectedComponentIds.includes(comp.id)}
                    onSelect={(e) => {
                      if (e && e.evt && e.evt.shiftKey) {
                        setSelectedComponentIds(prev => 
                          prev.includes(comp.id) ? prev.filter(id => id !== comp.id) : [...prev, comp.id]
                        );
                      } else {
                        setSelectedComponentIds([comp.id]);
                      }
                      setSelectedWireId(null);
                    }}
                    onDelete={() => handleDeleteComponent(comp.id)}
                    onRotate={() => handleRotateComponent(comp.id)}
                    onDragEnd={(e) => handleComponentDragEnd(comp.id, e)}
                    onPinClick={(pinId, data) => {
                      setSelectedComponentIds([comp.id]);
                      setSelectedWireId(null);
                      handlePinClick(comp.id, pinId, data);
                    }}
                    onPinsChange={(pins) => handleComponentPinsChange(comp.id, pins)}
                  />
                ))}
              </Layer>
            </Stage>
          </div>
          <aside style={{ width: '320px', borderLeft: '1px solid #333', background: '#111215', display: 'flex', flexDirection: 'column' }}>
            {activeSidebarTab === 'components' && (
              <>
                <div style={{ padding: '16px', borderBottom: '1px solid #242424' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: '700' }}>Components</div>
                  <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '4px' }}>Click to add a part to the canvas</div>
                  <input
                    value={componentSearch}
                    onChange={(event) => setComponentSearch(event.target.value)}
                    placeholder="Search components"
                    style={{
                      width: '100%',
                      marginTop: '12px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #2f2f2f',
                      background: '#0f1115',
                      color: 'white',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ padding: '12px', overflowY: 'auto', flex: 1 }}>
                  <div style={{ marginBottom: '14px', padding: '12px', border: '1px solid #2a2f39', borderRadius: '10px', background: '#0f1115' }}>
                    <div style={{ fontSize: '0.78rem', color: '#8a94a6', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Selected</div>
                    <div style={{ fontSize: '0.95rem', marginTop: '6px', fontWeight: '600' }}>
                      {selectedComponentId ? components.find((component) => component.id === selectedComponentId)?.type ?? 'Unknown' : 'None'}
                    </div>
                    {selectedComponentId && components.find((component) => component.id === selectedComponentId)?.type === 'wokwi-led' && (
                      <div style={{ marginTop: '12px' }}>
                        <label style={{ fontSize: '0.78rem', color: '#8a94a6', display: 'block', marginBottom: '4px' }}>LED Color</label>
                        <select
                          value={components.find((component) => component.id === selectedComponentId)?.color || 'red'}
                          onChange={(e) => {
                            const newColor = e.target.value;
                            setComponents(comps => comps.map(c => 
                              c.id === selectedComponentId ? { ...c, color: newColor } : c
                            ));
                          }}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #2a2f39', background: '#0f1115', color: 'white', outline: 'none' }}
                        >
                          <option value="red">Red</option>
                          <option value="green">Green</option>
                          <option value="blue">Blue</option>
                          <option value="yellow">Yellow</option>
                          <option value="orange">Orange</option>
                          <option value="white">White</option>
                        </select>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <button
                        type="button"
                        onClick={() => selectedComponentId && handleRotateComponent(selectedComponentId)}
                        disabled={!selectedComponentId}
                        style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1px solid #2a2f39', background: selectedComponentId ? '#f59e0b' : '#2a2f39', color: selectedComponentId ? '#111827' : '#8a94a6', cursor: selectedComponentId ? 'pointer' : 'not-allowed' }}
                      >
                        Rotate
                      </button>
                      <button
                        type="button"
                        onClick={() => selectedComponentId && handleDeleteComponent(selectedComponentId)}
                        disabled={!selectedComponentId}
                        style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1px solid #2a2f39', background: selectedComponentId ? '#ef4444' : '#2a2f39', color: selectedComponentId ? 'white' : '#8a94a6', cursor: selectedComponentId ? 'pointer' : 'not-allowed' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {filteredPalette.map((component) => (
                    <button
                      key={component.type}
                      onClick={() => addComponent(component)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        marginBottom: '10px',
                        background: '#171a21',
                        border: '1px solid #2a2f39',
                        borderRadius: '10px',
                        color: 'white',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.92rem' }}>{component.label}</div>
                        <div style={{ fontSize: '0.76rem', color: '#8a94a6', marginTop: '2px' }}>{component.category}</div>
                      </div>
                      <div style={{ color: '#1890ff', fontSize: '1.1rem', lineHeight: 1 }}>+</div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {activeSidebarTab === 'libraries' && (
              <>
                <div style={{ padding: '16px', borderBottom: '1px solid #242424' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}><Library size={18} /> Library Manager</div>
                  <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '4px' }}>Add libraries to cloud compiler</div>
                </div>
                <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
                  <p style={{ margin: '0 0 15px 0', fontSize: '0.85rem', color: '#aaa', lineHeight: 1.4 }}>Type the exact name of the library (e.g. <code>Servo</code>). The cloud compiler will download it automatically via arduino-cli.</p>
                  
                  <div style={{ position: 'relative', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Search or enter library name..."
                        value={newLibraryName}
                        onChange={(e) => handleLibrarySearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newLibraryName.trim() && !libraries.includes(newLibraryName.trim())) {
                            setLibraries(prev => [...prev, newLibraryName.trim()]);
                            setNewLibraryName('');
                            setSearchResults([]);
                          }
                        }}
                        style={{ flex: 1, padding: '8px 12px', background: '#0f1115', border: '1px solid #2f2f2f', borderRadius: '8px', color: 'white', outline: 'none', fontSize: '0.9rem' }}
                      />
                      <button
                        onClick={() => {
                          if (newLibraryName.trim() && !libraries.includes(newLibraryName.trim())) {
                            setLibraries(prev => [...prev, newLibraryName.trim()]);
                            setNewLibraryName('');
                            setSearchResults([]);
                          }
                        }}
                        style={{ padding: '8px 15px', background: '#1890ff', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        Add
                      </button>
                    </div>

                    {/* Autocomplete Dropdown */}
                    {(searchResults.length > 0 || isSearching) && newLibraryName.trim() !== '' && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: '80px', marginTop: '4px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 10, maxHeight: '250px', overflowY: 'auto' }}>
                        {isSearching ? (
                          <div style={{ padding: '12px', color: '#888', fontSize: '0.85rem', textAlign: 'center' }}>Searching...</div>
                        ) : searchResults.length === 0 ? (
                          <div style={{ padding: '12px', color: '#888', fontSize: '0.85rem', textAlign: 'center' }}>No exact matches. You can still add it manually.</div>
                        ) : (
                          searchResults.map((lib, idx) => (
                            <div
                              key={idx}
                              onClick={() => {
                                if (!libraries.includes(lib.name)) {
                                  setLibraries(prev => [...prev, lib.name]);
                                }
                                setNewLibraryName('');
                                setSearchResults([]);
                              }}
                              style={{ padding: '10px 12px', borderBottom: '1px solid #2a2a2a', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#2a2a2a'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: '600', fontSize: '0.9rem', color: 'white' }}>{lib.name}</span>
                                <span style={{ fontSize: '0.75rem', color: '#888' }}>{lib.author?.split(',')[0]}</span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {lib.sentence}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div style={{ border: '1px solid #2a2f39', borderRadius: '10px', background: '#0f1115', overflow: 'hidden' }}>
                    {libraries.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#555', fontSize: '0.85rem' }}>No libraries added.</div>
                    ) : (
                      libraries.map(lib => (
                        <div key={lib} style={{ padding: '12px 15px', borderBottom: '1px solid #2a2f39', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{lib}</span>
                          <button onClick={() => setLibraries(prev => prev.filter(l => l !== lib))} style={{ background: 'transparent', border: 'none', color: '#dc3545', cursor: 'pointer', padding: 4, display: 'flex' }}><X size={16} /></button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </aside>
        </div>

      </div>

      <AIAssistantPanel
        isVisible={isAIAssistantOpen}
        onClose={() => setIsAIAssistantOpen(false)}
        currentNetlist={
          JSON.stringify(buildNetlist(components, wires), null, 2) + 
          "\n\nAvailable Component Catalog:\n" + 
          WOKWI_COMPONENT_CATALOG.map(c => `- ${c.type} (${c.label})`).join('\n')
        }
        isEmbedded={true}
        onCodeUpdate={setStagedCode}
      />

    </div>
  );
}
