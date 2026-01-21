import React from 'react';
import { useCircuit } from '../context/CircuitContext';
import { snap } from '../utils/math';

export default function Sidebar() {
    const { 
        tool, setTool, 
        isDarkMode, setIsDarkMode,
        theme,
        components, // <--- Added this to count existing components
        setComponents, setSelectedIds, stagePos, stageScale 
    } = useCircuit();

    const spawnComponent = (type) => {
        const id = Date.now();
        const invScale = 1 / stageScale;
        const centerX = (-stagePos.x + window.innerWidth / 2) * invScale;
        const centerY = (-stagePos.y + window.innerHeight / 2) * invScale;
        
        // --- RESTORED LOGIC ---
        const count = components.filter(c => c.type === type).length + 1;
        const defaults = type === 'resistor' 
            ? { value: '1k', label: `R${count}` }
            : { value: '5V', label: `V${count}` };
        // ----------------------

        setComponents(prev => [...prev, { 
            id, type, 
            x: snap(centerX), y: snap(centerY), 
            rotation: 0, 
            ...defaults 
        }]);
        setTool('select'); 
        setSelectedIds([id]);
    };

    const btnStyle = (active) => ({
        padding: '8px 12px', border: 'none', borderRadius: 4, marginBottom: 5,
        background: active ? '#1890ff' : theme.btnBg,
        color: active ? '#fff' : theme.uiText,
        fontWeight: active ? 'bold' : 'normal', cursor: 'pointer',
        textAlign: 'left'
    });

    return (
        <div style={{ 
            position: 'absolute', top: 10, left: 10, zIndex: 10, 
            background: theme.uiBg, color: theme.uiText,
            padding: 15, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', 
            display: 'flex', flexDirection: 'column', gap: 5, width: 140 
        }}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 10}}>
                <strong style={{fontSize: 14}}>SimLite</strong>
                <button onClick={() => setIsDarkMode(!isDarkMode)} style={{background:'transparent', border:'none', cursor:'pointer', fontSize: 16}}>
                    {isDarkMode ? '☀️' : '🌙'}
                </button>
            </div>

            <button onClick={() => setTool('select')} style={btnStyle(tool === 'select')}>👆 Move / Pan</button>
            <button onClick={() => setTool('wire')} style={btnStyle(tool === 'wire')}>✏️ Connect</button>
            <button onClick={() => setTool('delete')} style={btnStyle(tool === 'delete')}>✂️ Delete</button>
            
            <div style={{height: 1, background: '#888', margin: '5px 0'}}></div>
            
            <button onClick={() => spawnComponent('resistor')} style={btnStyle(false)}>+ Resistor</button>
            <button onClick={() => spawnComponent('source')} style={btnStyle(false)}>+ Source</button>
        </div>
    );
}