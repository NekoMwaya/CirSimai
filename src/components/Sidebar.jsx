import React, { useState } from 'react';
import { useCircuit } from '../context/CircuitContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Save, FolderOpen } from 'lucide-react';
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

// Inline Save-As modal
const SaveModal = ({ theme, onSave, onClose, defaultName }) => {
    const [name, setName] = useState(defaultName || '');
    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }} onClick={onClose}>
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#1a1a2e', border: '1px solid rgba(92,225,230,0.3)',
                    borderRadius: 16, padding: 28, minWidth: 340,
                    boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
                }}
            >
                <h3 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: 18, fontWeight: 700 }}>
                    💾 Save Project As
                </h3>
                <input
                    autoFocus
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onSave(name.trim()); }}
                    placeholder="Enter project name..."
                    style={{
                        width: '100%', padding: '10px 14px', borderRadius: 8,
                        border: '1px solid rgba(92,225,230,0.3)', background: '#0f1115',
                        color: '#fff', outline: 'none', fontSize: 14, boxSizing: 'border-box',
                        marginBottom: 16,
                    }}
                />
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{
                        padding: '8px 18px', borderRadius: 8, border: '1px solid #333',
                        background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 13
                    }}>Cancel</button>
                    <button
                        disabled={!name.trim()}
                        onClick={() => name.trim() && onSave(name.trim())}
                        style={{
                            padding: '8px 18px', borderRadius: 8, border: 'none',
                            background: name.trim() ? 'linear-gradient(90deg,#c2a8f7,#5ce1e6)' : '#333',
                            color: name.trim() ? '#000' : '#666',
                            cursor: name.trim() ? 'pointer' : 'not-allowed',
                            fontWeight: 700, fontSize: 13
                        }}
                    >Save</button>
                </div>
            </div>
        </div>
    );
};

export default function Sidebar({ onToggleAIAssistant, isAIAssistantOpen, onRunSimulation }) {
    const { 
        tool, setTool, 
        isDarkMode, setIsDarkMode,
        theme,
        spawnComponent,
        isColumnRowSnapEnabled,
        setIsColumnRowSnapEnabled,
        projectId,
        projectName,
        setProjectName,
        saveProject,
    } = useCircuit();

    const { user } = useAuth();

    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null); // 'success' | 'error' | null
    const [showSaveModal, setShowSaveModal] = useState(false);

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

    const handleSave = async () => {
        if (!user) return;
        if (!projectId) {
            // No existing project, open Save As modal
            setShowSaveModal(true);
            return;
        }
        setIsSaving(true);
        setSaveStatus(null);
        try {
            await saveProject(user.id);
            setSaveStatus('success');
            setTimeout(() => setSaveStatus(null), 2000);
        } catch (err) {
            console.error('Save error:', err);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus(null), 3000);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveAs = async (name) => {
        if (!user) return;
        setShowSaveModal(false);
        setIsSaving(true);
        setSaveStatus(null);
        try {
            await saveProject(user.id, name);
            setProjectName(name);
            setSaveStatus('success');
            setTimeout(() => setSaveStatus(null), 2000);
        } catch (err) {
            console.error('Save As error:', err?.message || err?.code || err);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus(null), 3000);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
        {showSaveModal && (
            <SaveModal
                theme={theme}
                defaultName={projectName}
                onSave={handleSaveAs}
                onClose={() => setShowSaveModal(false)}
            />
        )}
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
                  {projectName && (
                    <span style={{ fontSize: 10, color: '#5ce1e6', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                      {projectName}
                    </span>
                  )}
                </div>
                <button onClick={() => setIsDarkMode(!isDarkMode)} style={{background:'transparent', border:'none', cursor:'pointer', fontSize: 16, padding: '4px', borderRadius: '50%'}}>
                    {isDarkMode ? '☀️' : '🌙'}
                </button>
            </div>
            
            {/* Save Buttons */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSave}
                    disabled={isSaving || !user}
                    style={{
                        flex: 1, padding: '7px 8px',
                        background: saveStatus === 'success' ? '#22c55e' : saveStatus === 'error' ? '#ef4444' : '#1e3a5f',
                        color: '#fff', border: '1px solid rgba(92,225,230,0.2)',
                        borderRadius: 7, cursor: user ? 'pointer' : 'not-allowed',
                        fontWeight: 600, fontSize: 11,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                        opacity: isSaving ? 0.7 : 1,
                    }}
                >
                    <Save size={12} />
                    {isSaving ? '...' : saveStatus === 'success' ? 'Saved!' : saveStatus === 'error' ? 'Error' : 'Save'}
                </motion.button>
                <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowSaveModal(true)}
                    disabled={isSaving || !user}
                    style={{
                        flex: 1, padding: '7px 8px',
                        background: '#1e293b',
                        color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 7, cursor: user ? 'pointer' : 'not-allowed',
                        fontWeight: 600, fontSize: 11,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    }}
                >
                    <FolderOpen size={12} />
                    Save As
                </motion.button>
            </div>

            {!user && (
                <div style={{ fontSize: 10, color: '#f59e0b', textAlign: 'center', padding: '4px 0', opacity: 0.8 }}>
                    Sign in to save projects
                </div>
            )}

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
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsColumnRowSnapEnabled(prev => !prev)}
                    style={{
                        ...toolBtnStyle(isColumnRowSnapEnabled),
                        padding: '7px 10px',
                        fontSize: 11
                    }}
                >
                    ▦ Column and Row snap: {isColumnRowSnapEnabled ? 'ON' : 'OFF'}
                </motion.button>
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
        </>
    );
}