import React, { useState } from 'react';
import { useCircuit } from '../context/CircuitContext';

// Collapsible category component
const Category = ({ title, children, theme, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    
    return (
        <div style={{ marginBottom: 5 }}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%',
                    padding: '6px 10px',
                    border: 'none',
                    borderRadius: 4,
                    background: theme.btnBg,
                    color: theme.uiText,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: 'bold',
                    fontSize: 12,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}
            >
                <span>{title}</span>
                <span style={{ fontSize: 10 }}>{isOpen ? '▼' : '▶'}</span>
            </button>
            {isOpen && (
                <div style={{ 
                    paddingLeft: 8, 
                    paddingTop: 5,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3
                }}>
                    {children}
                </div>
            )}
        </div>
    );
};

export default function Sidebar() {
    const { 
        tool, setTool, 
        isDarkMode, setIsDarkMode,
        theme,
        spawnComponent
    } = useCircuit();

    const toolBtnStyle = (active) => ({
        padding: '8px 12px', border: 'none', borderRadius: 4,
        background: active ? '#1890ff' : theme.btnBg,
        color: active ? '#fff' : theme.uiText,
        fontWeight: active ? 'bold' : 'normal', cursor: 'pointer',
        textAlign: 'left',
        fontSize: 12
    });

    const itemBtnStyle = {
        padding: '5px 8px', 
        border: 'none', 
        borderRadius: 3,
        background: 'transparent',
        color: theme.uiText,
        cursor: 'pointer',
        textAlign: 'left',
        fontSize: 11,
        transition: 'background 0.15s'
    };

    return (
        <div style={{ 
            position: 'absolute', top: 10, left: 10, zIndex: 10, 
            background: theme.uiBg, color: theme.uiText,
            padding: 12, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', 
            display: 'flex', flexDirection: 'column', gap: 5, width: 160,
            maxHeight: 'calc(100vh - 40px)',
            overflowY: 'auto'
        }}>
            {/* Header */}
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 8}}>
                <strong style={{fontSize: 14}}>SimLite</strong>
                <button onClick={() => setIsDarkMode(!isDarkMode)} style={{background:'transparent', border:'none', cursor:'pointer', fontSize: 16}}>
                    {isDarkMode ? '☀️' : '🌙'}
                </button>
            </div>

            {/* Tools */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button onClick={() => setTool('select')} style={toolBtnStyle(tool === 'select')}>👆 Select (Esc)</button>
                <button onClick={() => setTool('wire')} style={toolBtnStyle(tool === 'wire')}>✏️ Wire (W)</button>
                <button onClick={() => setTool('delete')} style={toolBtnStyle(tool === 'delete')}>✂️ Delete (Del)</button>
            </div>
            
            <div style={{height: 1, background: '#555', margin: '8px 0'}}></div>

            {/* Component Categories */}
            <Category title="📦 Passive" theme={theme} defaultOpen={true}>
                <button onClick={() => spawnComponent('resistor')} style={itemBtnStyle}>Resistor (R)</button>
                <button onClick={() => spawnComponent('capacitor')} style={itemBtnStyle}>Capacitor (C)</button>
                <button onClick={() => spawnComponent('inductor')} style={itemBtnStyle}>Inductor (L)</button>
                <div style={{ fontSize: 10, color: theme.uiText, opacity: 0.6, marginTop: 5, marginBottom: 3 }}>Diodes</div>
                <button onClick={() => spawnComponent('diode_ideal')} style={itemBtnStyle}>Diode (Ideal 0.7V)</button>
                <button onClick={() => spawnComponent('diode_model')} style={itemBtnStyle}>Diode (Model)</button>
            </Category>

            <Category title="⚡ Sources" theme={theme} defaultOpen={true}>
                <button onClick={() => spawnComponent('source')} style={itemBtnStyle}>DC Voltage (V)</button>
                <button onClick={() => spawnComponent('acsource')} style={itemBtnStyle}>AC Voltage</button>
                <button onClick={() => spawnComponent('ground')} style={itemBtnStyle}>Ground (G)</button>
            </Category>

            <Category title="🔌 Transistors" theme={theme} defaultOpen={false}>
                <div style={{ fontSize: 10, color: theme.uiText, opacity: 0.6, marginBottom: 3 }}>BJT</div>
                <button onClick={() => spawnComponent('bjt_npn')} style={itemBtnStyle}>NPN BJT</button>
                <button onClick={() => spawnComponent('bjt_pnp')} style={itemBtnStyle}>PNP BJT</button>
                <div style={{ fontSize: 10, color: theme.uiText, opacity: 0.6, marginTop: 5, marginBottom: 3 }}>MOSFET</div>
                <button onClick={() => spawnComponent('nmos')} style={itemBtnStyle}>NMOS</button>
                <button onClick={() => spawnComponent('pmos')} style={itemBtnStyle}>PMOS</button>
                <div style={{ fontSize: 10, color: theme.uiText, opacity: 0.6, marginTop: 5, marginBottom: 3 }}>JFET</div>
                <button onClick={() => spawnComponent('njfet')} style={itemBtnStyle}>N-JFET</button>
                <button onClick={() => spawnComponent('pjfet')} style={itemBtnStyle}>P-JFET</button>
            </Category>

            <Category title="🔧 ICs" theme={theme} defaultOpen={false}>
                <button onClick={() => spawnComponent('opamp')} style={itemBtnStyle}>Op-Amp (3-pin)</button>
                <button onClick={() => spawnComponent('opamp5')} style={itemBtnStyle}>Op-Amp (5-pin)</button>
            </Category>

            {/* Keyboard shortcuts hint */}
            <div style={{ 
                fontSize: 9, 
                color: theme.uiText, 
                opacity: 0.5, 
                marginTop: 10,
                lineHeight: 1.4
            }}>
                Shortcuts: R=Rotate, F=Flip
            </div>
        </div>
    );
}