import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { snap } from '../utils/math';

const CircuitContext = createContext();

export const useCircuit = () => useContext(CircuitContext);

export const CircuitProvider = ({ children }) => {
  // --- STATE ---
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [tool, setTool] = useState('select');
  const [wires, setWires] = useState([]);
  const [components, setComponents] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);

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
      setComponents(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
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
    
    const count = components.filter(c => c.type === type).length + 1;
    let defaults = {};
    if (type === 'resistor') defaults = { value: '1k', label: `R${count}` };
    else if (type === 'capacitor') defaults = { value: '1uF', label: `C${count}` };
    else if (type === 'source') defaults = { value: '5V', label: `V${count}` };

    setComponents(prev => [...prev, { 
        id, type, 
        x: snap(centerX), y: snap(centerY), 
        rotation: 0, 
        ...defaults 
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
      undo, redo, saveState
    }}>
      {children}
    </CircuitContext.Provider>
  );
};