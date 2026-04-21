import React, { useState } from 'react';
import { useCircuit } from '../context/CircuitContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Play } from 'lucide-react';
import { Link } from 'react-router-dom';

const Category = ({ title, children, theme, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    
    return (
        <div style={{ marginBottom: 6 }}>
            <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${theme.border || 'transparent'}`,
                    borderRadius: 6,
                    background: theme.btnBg,
                    color: theme.uiText,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: '600',
                    fontSize: 12,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}
            >
                <span>{title}</span>
                <motion.span 
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ fontSize: 10, display: 'inline-block' }}
                >
                    ▼
                </motion.span>
            </motion.button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{ 
                            paddingLeft: 8, 
                            paddingTop: 6,
                            paddingBottom: 4,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4
                        }}>
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default function Sidebar({ onToggleAIAssistant, isAIAssistantOpen, onRunSimulation }) {
    const { 
        tool, setTool, 
        isDarkMode, setIsDarkMode,
        theme,
        spawnComponent
    } = useCircuit();

    const gradientBg = isDarkMode ? 'linear-gradient(90deg, #4a007d, #004e92, #004989)' : 'linear-gradient(90deg, #c2a8f7, #5ce1e6)';
    const gradientBorder = isDarkMode ? 'linear-gradient(180deg, #4a007d, #004e92, #004989)' : 'linear-gradient(180deg, #c2a8f7, #5ce1e6)';
    const textGradientBg = 'linear-gradient(90deg, #c2a8f7, #5ce1e6)';

    const toolBtnStyle = (active) => ({
        padding: '8px 12px', 
        border: 'none', 
        borderRadius: 6,
        background: active ? gradientBg : theme.btnBg,
        color: active ? (isDarkMode ? '#fff' : '#000') : theme.uiText,
        fontWeight: active ? 'bold' : 'normal', 
        cursor: 'pointer',
        textAlign: 'left',
        fontSize: 12,
        outline: 'none',
        display: 'block',
        width: '100%'
    });

    const itemBtnStyle = {
        padding: '6px 8px', 
        border: 'none', 
        borderRadius: 4,
        background: 'transparent',
        color: theme.uiText,
        cursor: 'pointer',
        textAlign: 'left',
        fontSize: 11,
        width: '100%',
        display: 'block'
    };

    const AnimatedItemBtn = ({ onClick, children, isActive = false }) => (
        <motion.button 
            whileHover={{ scale: 1.03, backgroundColor: isDarkMode ? 'rgba(74, 0, 125, 0.2)' : 'rgba(194, 168, 247, 0.2)' }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick} 
            style={{
                ...itemBtnStyle, 
                background: isActive ? (isDarkMode ? 'rgba(74, 0, 125, 0.4)' : 'rgba(194, 168, 247, 0.2)') : 'transparent', 
                color: isActive ? (isDarkMode ? '#5ce1e6' : '#9a75f0') : theme.uiText
            }}
        >
            {children}
        </motion.button>
    );

    return (
        <div style={{ 
            position: 'absolute', top: 0, left: 0, bottom: 0, zIndex: 10, 
            background: isDarkMode ? '#121212' : '#ffffff', 
            borderRight: '2px solid transparent',
            borderImage: `${gradientBorder} 1`,
            color: theme.uiText,
            padding: 16, 
            boxShadow: '4px 0 24px rgba(0,0,0,0.15)', 
            display: 'flex', flexDirection: 'column', gap: 6, width: 220,
            overflowY: 'auto',
            fontFamily: 'Inter, sans-serif'
        }}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 12}}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <Link to="/" style={{ textDecoration: 'none' }}>
                    <strong style={{fontSize: 20, background: textGradientBg, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px'}}>CirSimAI</strong>
                  </Link>
                </div>
                <button onClick={() => setIsDarkMode(!isDarkMode)} style={{background:'transparent', border:'none', cursor:'pointer', fontSize: 16, padding: '4px', borderRadius: '50%'}}>
                    {isDarkMode ? '☀️' : '🌙'}
                </button>
            </div>
            
            <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onRunSimulation}
                style={{
                    padding: '10px 14px', background: gradientBg, color: isDarkMode ? 'white' : 'black', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: isDarkMode ? '0 4px 12px rgba(74, 0, 125, 0.3)' : 'none', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
            >
                <Play size={14} fill="currentColor" /> Run Simulation
            </motion.button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setTool('select')} style={toolBtnStyle(tool === 'select')}>👆 Select (Esc)</motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setTool('wire')} style={toolBtnStyle(tool === 'wire')}>✏️ Wire (W)</motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setTool('delete')} style={toolBtnStyle(tool === 'delete')}>✂️ Delete (Del)</motion.button>
            </div>
            
            <div style={{height: 1, background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', margin: '12px 0'}}></div>

            <Category title="📦 Passive" theme={theme} defaultOpen={true}>
                <AnimatedItemBtn onClick={() => spawnComponent('resistor')}>Resistor (R)</AnimatedItemBtn>
                <AnimatedItemBtn onClick={() => spawnComponent('capacitor')}>Capacitor (C)</AnimatedItemBtn>
                <AnimatedItemBtn onClick={() => spawnComponent('inductor')}>Inductor (L)</AnimatedItemBtn>
                <div style={{ fontSize: 10, color: theme.uiText, opacity: 0.5, marginTop: 6, marginBottom: 2, paddingLeft: 8, fontWeight: 600, textTransform: 'uppercase' }}>Diodes</div>
                <AnimatedItemBtn onClick={() => spawnComponent('diode_ideal')}>Diode (Ideal 0.7V)</AnimatedItemBtn>
                <AnimatedItemBtn onClick={() => spawnComponent('diode_model')}>Diode (Model)</AnimatedItemBtn>
            </Category>

            <Category title="⚡ Sources" theme={theme} defaultOpen={true}>
                <AnimatedItemBtn onClick={() => spawnComponent('source')}>DC Voltage (V)</AnimatedItemBtn>
                <AnimatedItemBtn onClick={() => spawnComponent('acsource')}>AC Voltage</AnimatedItemBtn>
                <AnimatedItemBtn onClick={() => spawnComponent('ground')}>Ground (G)</AnimatedItemBtn>
            </Category>

            <Category title="🔌 Transistors" theme={theme} defaultOpen={false}>
                <div style={{ fontSize: 10, color: theme.uiText, opacity: 0.5, marginBottom: 2, paddingLeft: 8, fontWeight: 600, textTransform: 'uppercase' }}>BJT</div>
                <AnimatedItemBtn onClick={() => spawnComponent('bjt_npn')}>NPN BJT</AnimatedItemBtn>
                <AnimatedItemBtn onClick={() => spawnComponent('bjt_pnp')}>PNP BJT</AnimatedItemBtn>
                <div style={{ fontSize: 10, color: theme.uiText, opacity: 0.5, marginTop: 6, marginBottom: 2, paddingLeft: 8, fontWeight: 600, textTransform: 'uppercase' }}>MOSFET</div>
                <AnimatedItemBtn onClick={() => spawnComponent('nmos')}>NMOS</AnimatedItemBtn>
                <AnimatedItemBtn onClick={() => spawnComponent('pmos')}>PMOS</AnimatedItemBtn>
                <div style={{ fontSize: 10, color: theme.uiText, opacity: 0.5, marginTop: 6, marginBottom: 2, paddingLeft: 8, fontWeight: 600, textTransform: 'uppercase' }}>JFET</div>
                <AnimatedItemBtn onClick={() => spawnComponent('njfet')}>N-JFET</AnimatedItemBtn>
                <AnimatedItemBtn onClick={() => spawnComponent('pjfet')}>P-JFET</AnimatedItemBtn>
            </Category>

            <Category title="🔧 ICs" theme={theme} defaultOpen={false}>
                <AnimatedItemBtn onClick={() => spawnComponent('opamp')}>Op-Amp (3-pin)</AnimatedItemBtn>
                <AnimatedItemBtn onClick={() => spawnComponent('opamp5')}>Op-Amp (5-pin)</AnimatedItemBtn>
            </Category>

            <Category title="🤖 AI assistant" theme={theme} defaultOpen={false}>
                <AnimatedItemBtn onClick={onToggleAIAssistant} isActive={isAIAssistantOpen}>
                    {isAIAssistantOpen ? 'Hide chatbox' : 'Open chatbox'}
                </AnimatedItemBtn>
            </Category>

            <div style={{ 
                fontSize: 10, 
                color: theme.uiText, 
                opacity: 0.4, 
                marginTop: 16,
                textAlign: 'center',
                lineHeight: 1.4
            }}>
                Shortcuts: R=Rotate, F=Flip
            </div>
        </div>
    );
}