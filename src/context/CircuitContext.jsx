import React, { createContext, useContext, useState, useMemo } from 'react';

const CircuitContext = createContext();

export const useCircuit = () => useContext(CircuitContext);

export const CircuitProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [tool, setTool] = useState('select');
  const [wires, setWires] = useState([]);
  const [components, setComponents] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Viewport State
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);

  const theme = useMemo(() => isDarkMode ? {
    bg: '#121212', gridDot: '#444', stroke: '#ffffff', fill: '#121212',
    text: '#eee', node: '#fff', uiBg: '#2a2a2a', uiText: '#fff',
    btnBg: '#444', inputBg: '#333', border: '#555'
  } : {
    bg: '#fafafa', gridDot: '#ccc', stroke: '#000000', fill: '#ffffff',
    text: '#000000', node: '#000', uiBg: '#fff', uiText: '#000',
    btnBg: '#eee', inputBg: '#fff', border: '#ddd'
  }, [isDarkMode]);

  // Actions
  const updateComponent = (id, updates) => {
      setComponents(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteSelection = () => {
    setComponents(prev => prev.filter(c => !selectedIds.includes(c.id)));
    setWires(prev => prev.filter(w => !selectedIds.includes(w.id)));
    setSelectedIds([]);
  };

  return (
    <CircuitContext.Provider value={{
      isDarkMode, setIsDarkMode, theme,
      tool, setTool,
      wires, setWires,
      components, setComponents, updateComponent,
      selectedIds, setSelectedIds, deleteSelection,
      stagePos, setStagePos,
      stageScale, setStageScale
    }}>
      {children}
    </CircuitContext.Provider>
  );
};