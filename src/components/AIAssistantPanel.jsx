import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Bot, Send } from 'lucide-react';
import { useCircuit } from '../context/CircuitContext';

const MODELS = [
    'gemma-4-26b-a4b-it',
    'gemma-4-31b-it'
];

const INITIAL_MESSAGE = {
    role: 'assistant',
    text: "Systems Online. I am your integrated AI Engineer. How can I assist optimizing your architecture today?"
};

const MODES = [
    { id: 'design', label: 'Design' },
    { id: 'explain', label: 'Explain' },
    { id: 'suggest', label: 'Suggest' }
];

export default function AIAssistantPanel({ isVisible, onClose, currentNetlist }) {
    const { theme, isDarkMode } = useCircuit();
    const [messages, setMessages] = useState([INITIAL_MESSAGE]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [model, setModel] = useState(MODELS[0]);
    const [mode, setMode] = useState('');
    const messagesEndRef = useRef(null);

    const [panelWidth, setPanelWidth] = useState(400); 
    const isDragging = useRef(false);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging.current) return;
            const newWidth = window.innerWidth - e.clientX;
            if (newWidth > 300 && newWidth < 800) {
                setPanelWidth(newWidth);
            }
        };
        const handleMouseUp = () => {
            isDragging.current = false;
            document.body.style.cursor = 'default';
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleDragStart = (e) => {
        isDragging.current = true;
        document.body.style.cursor = 'ew-resize';
        e.preventDefault();
    };

    const sendMessage = async () => {
        const prompt = input.trim();
        if (!prompt || loading) return;

        const userMessage = { role: 'user', text: prompt };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const response = await fetch('/api/ai-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: prompt,
                    model,
                    mode: mode || null,
                    circuitNetlist: currentNetlist || ''
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'AI request failed.');
            }

            setMessages(prev => [...prev, { role: 'assistant', text: data.text || 'No response text returned.' }]);
        } catch (error) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                text: `Unable to reach AI assistant: ${error.message}`
            }]);
        } finally {
            setLoading(false);
        }
    };

    if (!isVisible) return null;
    
    const bgColor = isDarkMode ? '#121212' : '#ffffff';
    const gradientBg = isDarkMode ? 'linear-gradient(90deg, #4a007d, #004e92, #004989)' : 'linear-gradient(90deg, #c2a8f7, #5ce1e6)';
    const gradientBorder = isDarkMode ? 'linear-gradient(180deg, #4a007d, #004e92, #004989)' : 'linear-gradient(180deg, #c2a8f7, #5ce1e6)';

    return (
        <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                zIndex: 120,
                width: panelWidth,
                background: bgColor,
                color: theme.uiText,
                borderLeft: '2px solid transparent',
                borderImage: `${gradientBorder} 1`,
                boxShadow: '-10px 0 30px rgba(0,0,0,0.15)',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: 'Inter, sans-serif'
            }}
        >
            <div 
                onMouseDown={handleDragStart}
                style={{
                    position: 'absolute',
                    top: 0, bottom: 0, left: -4,
                    width: 8,
                    cursor: 'ew-resize',
                    zIndex: 130
                }}
            />

            <div style={{
                padding: '16px 20px',
                borderBottom: `1px solid ${theme.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Bot size={20} color={isDarkMode ? '#004e92' : '#c2a8f7'} />
                    <strong style={{ fontSize: 16, fontWeight: 600, letterSpacing: '0.5px' }}>AI Architect</strong>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        border: 'none',
                        background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                        color: theme.uiText,
                        cursor: 'pointer',
                        width: 28, height: 28, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.2s'
                    }}
                >
                    ✕
                </button>
            </div>

            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <select
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: `1px solid ${theme.border}`,
                            background: theme.inputBg,
                            color: theme.uiText,
                            fontSize: 13,
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        {MODELS.map((m) => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                    {MODES.map((m) => {
                        const isActive = mode === m.id;
                        return (
                            <button
                                key={m.id}
                                onClick={() => setMode((prev) => (prev === m.id ? '' : m.id))}
                                style={{
                                    flex: 1,
                                    border: '2px solid transparent',
                                    borderRadius: '6px',
                                    padding: '6px 8px',
                                    background: `linear-gradient(${bgColor}, ${bgColor}) padding-box, ${gradientBg} border-box`,
                                    color: isActive ? (isDarkMode ? '#004e92' : '#c2a8f7') : theme.uiText,
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    fontWeight: isActive ? 'bold' : '600',
                                    opacity: isActive ? 1 : 0.7,
                                    transition: 'all 0.2s'
                                }}
                            >
                                {m.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {messages.map((msg, idx) => {
                    const isUser = msg.role === 'user';
                    return (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={`${msg.role}-${idx}`}
                            style={{
                                alignSelf: isUser ? 'flex-end' : 'flex-start',
                                maxWidth: '85%',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px'
                            }}
                        >
                            <span style={{ fontSize: 10, color: '#888', alignSelf: isUser ? 'flex-end' : 'flex-start', padding: '0 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                {isUser ? 'You' : 'System'}
                            </span>
                            <div style={{
                                background: isUser ? gradientBg : theme.btnBg,
                                color: isUser ? '#fff' : theme.uiText,
                                borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                padding: '12px 16px',
                                fontSize: 14,
                                lineHeight: 1.5,
                                whiteSpace: 'pre-wrap',
                                fontWeight: isUser ? '500' : '400',
                                border: isUser ? 'none' : `1px solid ${theme.border}`,
                            }}>
                                {msg.text}
                            </div>
                        </motion.div>
                    );
                })}
                {loading && (
                    <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '6px', alignItems: 'center', padding: '12px 16px', background: theme.btnBg, borderRadius: '16px 16px 16px 4px' }}>
                       <span style={{width: 6, height: 6, background: isDarkMode ? '#4a007d' : '#c2a8f7', borderRadius: '50%', display: 'inline-block'}} />
                       <span style={{width: 6, height: 6, background: isDarkMode ? '#004e92' : '#5ce1e6', borderRadius: '50%', display: 'inline-block'}} />
                       <span style={{width: 6, height: 6, background: isDarkMode ? '#004989' : '#c2a8f7', borderRadius: '50%', display: 'inline-block'}} />
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div style={{ padding: '16px 20px', borderTop: `1px solid ${theme.border}`, background: isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.05)' }}>
                <div style={{
                    display: 'flex', gap: '8px',
                    border: '2px solid transparent',
                    borderRadius: '24px',
                    background: `linear-gradient(${bgColor}, ${bgColor}) padding-box, ${gradientBg} border-box`,
                    padding: '6px'
                }}>
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') sendMessage();
                        }}
                        placeholder="Type a command..."
                        style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            color: theme.uiText,
                            fontSize: 14,
                            padding: '8px 12px',
                            outline: 'none'
                        }}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={loading}
                        style={{
                            border: 'none',
                            borderRadius: '20px',
                            width: 36, height: 36,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            background: loading ? theme.border : gradientBg,
                            color: '#fff',
                            transition: 'transform 0.2s',
                        }}
                        onMouseEnter={(e) => { if(!loading) e.currentTarget.style.transform = 'scale(1.05)'}}
                        onMouseLeave={(e) => { if(!loading) e.currentTarget.style.transform = 'scale(1)'}}
                    >
                        <Send size={16} style={{ marginLeft: -2 }} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
