import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { snap, getPins } from '../utils/math';
import { snapCanvasToLayoutGrid } from '../utils/aiLayoutGrid';

const CircuitContext = createContext();

export const useCircuit = () => useContext(CircuitContext);

export const CircuitProvider = ({ children }) => {
  // --- STATE ---
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [tool, setTool] = useState('select');
  const [wires, setWires] = useState([]);
  const [components, setComponents] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  const [isColumnRowSnapEnabled, setIsColumnRowSnapEnabled] = useState(false);

  // --- HISTORY STATE ---
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);

  // --- THEME ---
  const theme = useMemo(() => isDarkMode ? {
    bg: '#121212', gridDot: '#444', stroke: '#ffffff', fill: '#121212',
    text: '#eee', node: '#fff', uiBg: '#2a2a2a', uiText: '#fff',
    btnBg: '#444', inputBg: '#333', border: '#555'
  } : {
    bg: '#fafafa', gridDot: '#ccc', stroke: '#000000', fill: '#ffffff',
    text: '#000000', node: '#000', uiBg: '#fff', uiText: '#000',
    btnBg: '#eee', inputBg: '#fff', border: '#ddd'
  }, [isDarkMode]);

  // --- HISTORY LOGIC ---
  const saveState = useCallback(() => {
    setHistory(prev => {
      const newHistory = [...prev, { wires, components }];
      if (newHistory.length > 30) newHistory.shift();
      return newHistory;
    });
    setFuture([]);
  }, [wires, components]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    const newHistory = history.slice(0, -1);

    setFuture(prev => [{ wires, components }, ...prev]);
    setWires(previous.wires);
    setComponents(previous.components);
    setHistory(newHistory);
    setSelectedIds([]);
  }, [history, wires, components]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);

    setHistory(prev => [...prev, { wires, components }]);
    setWires(next.wires);
    setComponents(next.components);
    setFuture(newFuture);
    setSelectedIds([]);
  }, [future, wires, components]);

  // --- ACTIONS ---
  const updateComponent = (id, updates) => {
    setComponents(prev => {
      const nextComponents = prev.map(c => {
        if (c.id !== id) return c;

        const merged = { ...c, ...updates };
        if (typeof merged.x === 'number' && typeof merged.y === 'number') {
          if (isColumnRowSnapEnabled) {
            const snapped = snapCanvasToLayoutGrid(merged.x, merged.y);
            merged.x = snapped.x;
            merged.y = snapped.y;
          } else {
            merged.x = snap(merged.x);
            merged.y = snap(merged.y);
          }
        }
        return merged;
      });
      const moved = nextComponents.find(c => c.id === id);

      if (moved) {
        const movedPins = getPins(moved);
        setWires(prevWires => prevWires.map(wire => {
          if (!wire?.startAnchor || wire.startAnchor.componentId !== id) return wire;
          const pin = movedPins[wire.startAnchor.pinIndex];
          if (!pin) return wire;

          return {
            ...wire,
            points: [pin.x, pin.y, wire.points[2], wire.points[3]]
          };
        }));
      }

      return nextComponents;
    });
  };

  const deleteSelection = () => {
    saveState();
    setComponents(prev => prev.filter(c => !selectedIds.includes(c.id)));
    setWires(prev => prev.filter(w => !selectedIds.includes(w.id)));
    setSelectedIds([]);
  };

  const spawnComponent = (type) => {
    saveState();
    const id = Date.now();
    const invScale = 1 / stageScale;
    const centerX = (-stagePos.x + window.innerWidth / 2) * invScale;
    const centerY = (-stagePos.y + window.innerHeight / 2) * invScale;
    // FIX: Ensure unique labels by checking if label already exists
    let prefix = 'C';
    let defaultVal = '1uF';

    if (type === 'resistor') { prefix = 'R'; defaultVal = '1k'; }
    else if (type === 'source') { prefix = 'V'; defaultVal = '5V'; }
    else if (type === 'ground') { prefix = 'GND'; defaultVal = '0V'; }
    else if (type === 'inductor') { prefix = 'L'; defaultVal = '1mH'; }
    else if (type === 'acsource') { prefix = 'VAC'; defaultVal = '5 1k'; } // amplitude frequency
    else if (type === 'diode_ideal') { prefix = 'D'; defaultVal = 'IDEAL'; } // Theoretical 0.7V diode
    else if (type === 'diode_model') { prefix = 'D'; defaultVal = '1N4148'; } // Model diode
    else if (type === 'bjt_npn') { prefix = 'Q'; defaultVal = 'IDEAL_NPN'; } // NPN model
    else if (type === 'bjt_pnp') { prefix = 'Q'; defaultVal = 'IDEAL_PNP'; } // PNP model
    else if (type === 'nmos') { prefix = 'M'; defaultVal = 'IDEAL_NMOS'; } // NMOS model
    else if (type === 'pmos') { prefix = 'M'; defaultVal = 'IDEAL_PMOS'; } // PMOS model
    else if (type === 'njfet') { prefix = 'J'; defaultVal = 'IDEAL_NJFET'; } // N-JFET model
    else if (type === 'pjfet') { prefix = 'J'; defaultVal = 'IDEAL_PJFET'; } // P-JFET model
    else if (type === 'opamp') { prefix = 'U'; defaultVal = 'IDEAL_OPAMP'; } // Op-Amp model
    else if (type === 'opamp5') { prefix = 'U'; defaultVal = 'IDEAL_OPAMP'; } // Op-Amp with power pins

    // Set default transistor parameters
    let extraProps = {};
    if (type === 'bjt_npn' || type === 'bjt_pnp') {
      extraProps.beta = 100; // Default beta (current gain)
    } else if (type === 'nmos') {
      extraProps.vth = 1; // Default Vth for NMOS (V)
    } else if (type === 'pmos') {
      extraProps.vth = -1; // Default Vth for PMOS (V)
    } else if (type === 'njfet') {
      extraProps.vp = -2; // Default Vp (pinch-off) for N-JFET (V)
    } else if (type === 'pjfet') {
      extraProps.vp = 2; // Default Vp (pinch-off) for P-JFET (V)
    }

    let count = 1;
    // For ground, we don't strictly need unique numbers like GND1, GND2, but safe to keep logic
    while (components.some(c => c.label === `${prefix}${count}`)) {
      count++;
    }

    const defaults = { value: defaultVal, label: `${prefix}${count}` };
    if (type === 'ground') {
      defaults.label = 'GND'; // Force simplified label for ground
      defaults.value = '';
    }

    const spawnPos = isColumnRowSnapEnabled
      ? snapCanvasToLayoutGrid(centerX, centerY)
      : { x: snap(centerX), y: snap(centerY) };

    setComponents(prev => [...prev, {
      id, type,
      x: spawnPos.x, y: spawnPos.y,
      rotation: 0,
      flip: false, // Add flip/mirror property
      ...defaults,
      ...extraProps
    }]);
    setTool('select');
    setSelectedIds([id]);
  };

  return (
    <CircuitContext.Provider value={{
      isDarkMode, setIsDarkMode, theme,
      tool, setTool,
      wires, setWires,
      components, setComponents, updateComponent, spawnComponent, deleteSelection,
      selectedIds, setSelectedIds,
      stagePos, setStagePos, stageScale, setStageScale,
      isColumnRowSnapEnabled, setIsColumnRowSnapEnabled,
      undo, redo, saveState
    }}>
      {children}
    </CircuitContext.Provider>
  );
};