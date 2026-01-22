import React from 'react';
import { useCircuit } from '../context/CircuitContext';

export default function Sidebar() {
    const { 
        tool, setTool, 
        isDarkMode, setIsDarkMode,
        theme,
        spawnComponent // <--- Use shared function
    } = useCircuit();

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

            <button onClick={() => setTool('select')} style={btnStyle(tool === 'select')}>👆 Move / Pan (Esc)</button>
            <button onClick={() => setTool('wire')} style={btnStyle(tool === 'wire')}>✏️ Connect (W)</button>
            <button onClick={() => setTool('delete')} style={btnStyle(tool === 'delete')}>✂️ Delete (Bksp)</button>
            
            <div style={{height: 1, background: '#888', margin: '5px 0'}}></div>
            
            <button onClick={() => spawnComponent('resistor')} style={btnStyle(false)}>+ Resistor (R)</button>
            <button onClick={() => spawnComponent('capacitor')} style={btnStyle(false)}>+ Capacitor (C)</button>
            <button onClick={() => spawnComponent('source')} style={btnStyle(false)}>+ Source (V)</button>
        </div>
    );
}