import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Bot, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useCircuit } from '../context/CircuitContext';
import { spice } from '../utils/spiceEngine';
import { netlistToDraftSchematic } from '../utils/aiNetlistLayout';
import { supabase } from '../supabaseClient';

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

const DESIGN_SYSTEM_PROMPT = 'You are a circuit designer. Output only custom netlist code. Always prefix components with a * [LAYOUT] <ID> C=<Col> R=<Row> ROT=<Degrees> comment. Use a grid system where C increments left-to-right and R increments top-to-bottom. For parallel components, place them vertically in the same column (increment R). For series components, place them horizontally in the same row (increment C).';
const ITERATION_SYSTEM_PROMPT = 'Fix this netlist based on the error log. Do not change the syntax.';

function toSafeText(value, fallback = 'No response text returned.') {
    if (typeof value === 'string') {
        return value;
    }
    if (value === null || value === undefined) {
        return fallback;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return fallback;
    }
}

function normalizeThinking(value) {
    if (typeof value !== 'string') return '';
    return value.trim();
}

function createMessageId(prefix = 'msg') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const SIMULATION_ERROR_PATTERNS = [
    /(^|\b)error\b/i,
    /singular matrix/i,
    /floating/i,
    /no convergence/i,
    /timestep too small/i,
    /internal timestep/i,
    /matrix is singular/i,
    /simulation timed out/i,
    /failed to load simulation engine/i
];

function analyzeSimulationHealth(simulationOutput) {
    const lines = String(simulationOutput || '')
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);

    const errorLine = lines.find(line => SIMULATION_ERROR_PATTERNS.some(pattern => pattern.test(line)));
    return {
        hasCriticalError: Boolean(errorLine),
        errorLine: errorLine || null
    };
}

function analyzeNetlistConnectivity(netlistText) {
    const nodeStats = new Map();
    const lines = String(netlistText || '')
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);

    const addNode = (node, elementPrefix) => {
        const key = String(node || '').trim();
        if (!key) return;
        if (!nodeStats.has(key)) {
            nodeStats.set(key, { count: 0, elements: new Set() });
        }
        const entry = nodeStats.get(key);
        entry.count += 1;
        entry.elements.add(elementPrefix);
    };

    lines.forEach(line => {
        if (line.startsWith('*') || line.startsWith('.') || line.startsWith(';')) return;
        const tokens = line.split(/\s+/);
        if (tokens.length < 3) return;

        const name = tokens[0];
        const prefix = name[0]?.toUpperCase();
        if (!prefix) return;

        if (['R', 'C', 'L', 'V', 'I', 'D'].includes(prefix) && tokens.length >= 3) {
            addNode(tokens[1], prefix);
            addNode(tokens[2], prefix);
            return;
        }

        if (['Q', 'J'].includes(prefix) && tokens.length >= 4) {
            addNode(tokens[1], prefix);
            addNode(tokens[2], prefix);
            addNode(tokens[3], prefix);
            return;
        }

        if (prefix === 'M' && tokens.length >= 5) {
            addNode(tokens[1], prefix);
            addNode(tokens[2], prefix);
            addNode(tokens[3], prefix);
            addNode(tokens[4], prefix);
            return;
        }

        if (prefix === 'X' && tokens.length >= 4) {
            // For subcircuits, assume all tokens except first and last are nodes.
            for (let i = 1; i < tokens.length - 1; i++) {
                addNode(tokens[i], prefix);
            }
        }
    });

    // Treat passive/semiconductor single-ended nodes as dangling.
    // Single-ended source nodes are often intentional and are excluded.
    const floatingNodes = [];
    nodeStats.forEach((entry, node) => {
        if (node === '0') return;
        if (entry.count !== 1) return;

        const [onlyElement] = Array.from(entry.elements);
        if (onlyElement === 'V' || onlyElement === 'I') return;
        floatingNodes.push(node);
    });

    return {
        hasFloatingNodes: floatingNodes.length > 0,
        floatingNodes
    };
}

export default function AIAssistantPanel({ isVisible, onClose, currentNetlist }) {
    const { theme, isDarkMode, setComponents, setWires, saveState } = useCircuit();
    const [messages, setMessages] = useState([INITIAL_MESSAGE]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isStreamingChat, setIsStreamingChat] = useState(false);
    const [model, setModel] = useState(MODELS[0]);
    const [includeThinking, setIncludeThinking] = useState(true);
    const [mode, setMode] = useState('');
    const [pendingIteration, setPendingIteration] = useState(null);
    const messagesEndRef = useRef(null);
    const messageHistoryRef = useRef([
        { role: 'system', content: DESIGN_SYSTEM_PROMPT }
    ]);
    const activeRequestRef = useRef({
        id: null,
        controller: null,
        transientMessageIds: []
    });

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

    const cancelActiveRequest = ({ removeTransientMessages = false } = {}) => {
        const active = activeRequestRef.current;
        if (active.controller) {
            active.controller.abort();
        }

        if (removeTransientMessages && active.transientMessageIds.length) {
            setMessages(prev => prev.filter(msg => !active.transientMessageIds.includes(msg.id)));
        }

        activeRequestRef.current = { id: null, controller: null, transientMessageIds: [] };
        setIsStreamingChat(false);
        setLoading(false);
    };

    const beginRequest = () => {
        cancelActiveRequest();
        const id = createMessageId('request');
        const controller = new AbortController();
        activeRequestRef.current = { id, controller, transientMessageIds: [] };
        return { id, signal: controller.signal };
    };

    const isRequestActive = (requestId) => activeRequestRef.current.id === requestId;

    const trackTransientMessage = (requestId, messageId) => {
        if (!isRequestActive(requestId) || !messageId) return;
        activeRequestRef.current.transientMessageIds.push(messageId);
    };

    const finishRequest = (requestId) => {
        if (!isRequestActive(requestId)) return;
        activeRequestRef.current = { id: null, controller: null, transientMessageIds: [] };
        setIsStreamingChat(false);
        setLoading(false);
    };

    const throwIfAborted = (signal) => {
        if (signal?.aborted) {
            throw new DOMException('Request aborted', 'AbortError');
        }
    };

    useEffect(() => {
        if (!isVisible) {
            cancelActiveRequest({ removeTransientMessages: true });
        }
    }, [isVisible]);

    const resetAssistantSession = () => {
        messageHistoryRef.current = [{ role: 'system', content: DESIGN_SYSTEM_PROMPT }];
        setMessages([INITIAL_MESSAGE]);
        setPendingIteration(null);
    };

    const streamFromAI = async (payload, handlers = {}) => {
        const { onChunk, onComplete } = handlers;
        const signal = handlers.signal;
        console.log('[AI DEBUG] Frontend streaming request payload:', payload);

        let accessToken = null;
        try {
            const { data } = await supabase.auth.getSession();
            accessToken = data?.session?.access_token;
        } catch (err) {
            console.error('Failed to get Supabase session', err);
        }

        const headers = { 'Content-Type': 'application/json' };
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        const response = await fetch('/api/ai-chat', {
            method: 'POST',
            headers,
            body: JSON.stringify({ ...payload, stream: true }),
            signal
        });

        if (!response.ok) {
            const raw = await response.text();
            let data = {};
            try {
                data = raw ? JSON.parse(raw) : {};
            } catch {
                data = { error: raw || 'AI stream request failed.' };
            }
            throw new Error(data.error || 'AI stream request failed.');
        }

        const contentType = String(response.headers.get('content-type') || '').toLowerCase();
        if (!contentType.includes('text/event-stream') || !response.body) {
            const raw = await response.text();
            const data = raw ? JSON.parse(raw) : {};
            const thinking = normalizeThinking(data.thinking);
            const text = toSafeText(data.text, '');
            onChunk?.({ thinkingDelta: thinking, textDelta: text });
            const completed = { text, thinking, usedModel: data.usedModel || model };
            onComplete?.(completed);
            return completed;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let completedPayload = null;

        const processEventBlock = (block) => {
            const lines = block.replace(/\r/g, '').split('\n');
            let eventName = 'message';
            const dataLines = [];

            lines.forEach((line) => {
                if (line.startsWith('event:')) {
                    eventName = line.slice(6).trim();
                } else if (line.startsWith('data:')) {
                    dataLines.push(line.slice(5).trimStart());
                }
            });

            if (!dataLines.length) return;

            const dataText = dataLines.join('\n');
            let payloadData = null;
            try {
                payloadData = JSON.parse(dataText);
            } catch {
                payloadData = { textDelta: dataText };
            }

            if (eventName === 'chunk') {
                onChunk?.(payloadData);
                return;
            }

            if (eventName === 'complete') {
                completedPayload = payloadData;
                onComplete?.(payloadData);
                return;
            }

            if (eventName === 'error') {
                throw new Error(payloadData?.error || 'AI stream failed.');
            }
        };

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            throwIfAborted(signal);

            buffer += decoder.decode(value, { stream: true });
            let splitIndex = buffer.indexOf('\n\n');

            while (splitIndex !== -1) {
                const block = buffer.slice(0, splitIndex);
                buffer = buffer.slice(splitIndex + 2);
                if (block.trim()) {
                    processEventBlock(block);
                }
                splitIndex = buffer.indexOf('\n\n');
            }
        }

        if (buffer.trim()) {
            processEventBlock(buffer);
        }

        return completedPayload || { text: '', thinking: '', usedModel: model };
    };

    const applyGeneratedNetlistToCanvas = (generatedNetlist) => {
        const draft = netlistToDraftSchematic(generatedNetlist);
        if (!draft.components.length) return;

        saveState();
        setComponents(draft.components);
        setWires(draft.wires);
    };

    const validateGeneratedCircuit = async (prompt, generatedNetlist, history, options = {}) => {
        const signal = options.signal;
        const onThinkingDelta = options.onThinkingDelta;
        throwIfAborted(signal);

        const simOutput = await spice.run(generatedNetlist);
        throwIfAborted(signal);

        const simulationOutput = simOutput.join('\n');
        const simulationHealth = analyzeSimulationHealth(simulationOutput);
        const connectivityHealth = analyzeNetlistConnectivity(generatedNetlist);

        const validationPayload = {
            action: 'validate-intent',
            message: prompt,
            model,
            includeThinking,
            mode: 'design',
            previousNetlist: generatedNetlist,
            simulationOutput,
            intentSummary: prompt,
            messageHistory: history
        };

        let validationData = null;
        try {
            validationData = await streamFromAI(validationPayload, {
                signal,
                onChunk: ({ thinkingDelta }) => {
                    if (typeof thinkingDelta === 'string' && thinkingDelta) {
                        onThinkingDelta?.(thinkingDelta);
                    }
                }
            });
        } catch (error) {
            if (error?.name === 'AbortError') {
                throw error;
            }
            console.warn('[AI DEBUG] Validation model request failed, falling back to simulation-health decision:', error);
        }

        if (simulationHealth.hasCriticalError || connectivityHealth.hasFloatingNodes) {
            const reason = simulationHealth.hasCriticalError
                ? `Simulation reported a connectivity/solver issue: ${simulationHealth.errorLine}`
                : `Detected dangling node(s): ${connectivityHealth.floatingNodes.join(', ')}`;
            return {
                validation: {
                    intended: false,
                    confidence: 1,
                    reason,
                    suggestedFix: 'Check for floating nodes, disconnected pins, or invalid source/component definitions and rerun.'
                },
                simulationOutput,
                validationThinking: ''
            };
        }

        const aiValidation = validationData?.validation;
        return {
            validation: {
                intended: true,
                confidence: 1,
                reason: aiValidation?.reason || 'Simulation completed without floating/singular/convergence errors.',
                suggestedFix: aiValidation?.suggestedFix || ''
            },
            simulationOutput,
            validationThinking: normalizeThinking(validationData?.thinking)
        };
    };

    const runDesignPipeline = async ({ prompt, history, retryCount = 0, iterationPhase = 'initial', signal, requestId }) => {
        throwIfAborted(signal);

        const designPayload = {
            action: 'design-build',
            message: prompt,
            model,
            includeThinking,
            mode: 'design',
            circuitNetlist: currentNetlist || '',
            messageHistory: history,
            iterationPhase
        };

        const designMessageId = createMessageId('assistant');
        trackTransientMessage(requestId, designMessageId);
        setMessages(prev => [...prev, {
            id: designMessageId,
            role: 'assistant',
            text: 'Generating netlist...',
            thinking: '',
            thinkingPending: includeThinking
        }]);

        const designData = await streamFromAI(designPayload, {
            signal,
            onChunk: ({ thinkingDelta }) => {
                const safeThinkingDelta = typeof thinkingDelta === 'string' ? thinkingDelta : '';
                if (!safeThinkingDelta || !isRequestActive(requestId)) return;

                setMessages(prev => prev.map((msg) => {
                    if (msg.id !== designMessageId) return msg;
                    return {
                        ...msg,
                        thinking: `${msg.thinking || ''}${safeThinkingDelta}`,
                        thinkingPending: true
                    };
                }));
            }
        });
        throwIfAborted(signal);

        const generatedNetlist = toSafeText(designData.generatedNetlist || designData.text, '');
        console.log('[AI DEBUG] Frontend received generated netlist:', generatedNetlist);
        const designThinking = normalizeThinking(designData.thinking);

        if (!isRequestActive(requestId)) return;

        setMessages(prev => prev.map((msg) => {
            if (msg.id !== designMessageId) return msg;
            return {
                ...msg,
                text: `Generated netlist (${designData.usedModel || model}):\n\n\`\`\`spice\n${generatedNetlist}\n\`\`\``,
                thinking: designThinking || msg.thinking || '',
                thinkingPending: false
            };
        }));

        messageHistoryRef.current = [
            ...history,
            { role: 'assistant', content: generatedNetlist }
        ];

        applyGeneratedNetlistToCanvas(generatedNetlist);

        const validationMessageId = createMessageId('assistant');
        trackTransientMessage(requestId, validationMessageId);
        setMessages(prev => [...prev, {
            id: validationMessageId,
            role: 'assistant',
            text: 'Validating generated circuit...',
            thinking: '',
            thinkingPending: includeThinking
        }]);

        const { validation, simulationOutput, validationThinking } = await validateGeneratedCircuit(
            prompt,
            generatedNetlist,
            messageHistoryRef.current,
            {
                signal,
                onThinkingDelta: (thinkingDelta) => {
                    if (!isRequestActive(requestId)) return;
                    setMessages(prev => prev.map((msg) => {
                        if (msg.id !== validationMessageId) return msg;
                        return {
                            ...msg,
                            thinking: `${msg.thinking || ''}${thinkingDelta}`,
                            thinkingPending: true
                        };
                    }));
                }
            }
        );
        throwIfAborted(signal);

        const validationText = [
            `Validation result: ${validation.intended ? 'Matches intended behavior' : 'May not match intended behavior'}`,
            `Confidence: ${Number(validation.confidence || 0).toFixed(2)}`,
            `Reason: ${validation.reason || 'No reason provided.'}`,
            `Suggested fix: ${validation.suggestedFix || 'No suggestion provided.'}`,
            '',
            'Simulation output (debug):',
            '```text',
            simulationOutput || 'No ngspice output.',
            '```'
        ].join('\n');

        if (!isRequestActive(requestId)) return;

        setMessages(prev => prev.map((msg) => {
            if (msg.id !== validationMessageId) return msg;
            return {
                ...msg,
                text: validationText,
                thinking: validationThinking || msg.thinking || '',
                thinkingPending: false
            };
        }));

        if (!validation.intended && retryCount < 1) {
            setPendingIteration({
                prompt,
                retryCount,
                generatedNetlist,
                simulationOutput,
                validation,
                history: messageHistoryRef.current
            });

            setMessages(prev => [...prev, {
                role: 'assistant',
                text: 'The validation indicates this build may not meet intent. Review the generated circuit manually. If you approve, click "Iterate once" to run one retry; otherwise click "Stop iteration".'
            }]);
        } else {
            setPendingIteration(null);
        }
    };

    const sendMessage = async () => {
        const prompt = input.trim();
        if (!prompt || loading) return;

        const { id: requestId, signal } = beginRequest();

        const userMessage = { role: 'user', text: prompt };
        const baseHistory = [
            ...messageHistoryRef.current,
            { role: 'user', content: prompt }
        ];

        messageHistoryRef.current = baseHistory;
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        let streamingAssistantId = null;

        try {
            if (mode === 'design') {
                await runDesignPipeline({
                    prompt,
                    history: baseHistory,
                    retryCount: 0,
                    iterationPhase: 'initial',
                    signal,
                    requestId
                });
            } else {
                const assistantMessageId = createMessageId('assistant');
                let answerAccumulator = '';

                streamingAssistantId = assistantMessageId;
                trackTransientMessage(requestId, assistantMessageId);

                setMessages(prev => [...prev, {
                    id: assistantMessageId,
                    role: 'assistant',
                    text: '',
                    thinking: '',
                    thinkingPending: includeThinking
                }]);
                setIsStreamingChat(true);

                const streamData = await streamFromAI({
                    action: 'chat',
                    message: prompt,
                    model,
                    includeThinking,
                    mode: mode || null,
                    circuitNetlist: currentNetlist || '',
                    messageHistory: baseHistory
                }, {
                    signal,
                    onChunk: ({ textDelta, thinkingDelta }) => {
                        const safeTextDelta = typeof textDelta === 'string' ? textDelta : '';
                        const safeThinkingDelta = typeof thinkingDelta === 'string' ? thinkingDelta : '';
                        if ((!safeTextDelta && !safeThinkingDelta) || !isRequestActive(requestId)) return;

                        answerAccumulator += safeTextDelta;

                        setMessages(prev => prev.map((msg) => {
                            if (msg.id !== assistantMessageId) return msg;
                            return {
                                ...msg,
                                text: `${msg.text || ''}${safeTextDelta}`,
                                thinking: `${msg.thinking || ''}${safeThinkingDelta}`,
                                thinkingPending: true
                            };
                        }));
                    }
                });
                throwIfAborted(signal);

                const finalAnswer = toSafeText(streamData?.text || answerAccumulator, 'No response text returned.');
                const finalThinking = normalizeThinking(streamData?.thinking);

                setMessages(prev => prev.map((msg) => {
                    if (msg.id !== assistantMessageId) return msg;
                    return {
                        ...msg,
                        text: finalAnswer,
                        thinking: finalThinking || msg.thinking || '',
                        thinkingPending: false
                    };
                }));

                messageHistoryRef.current = [...baseHistory, { role: 'assistant', content: finalAnswer }];
            }
        } catch (error) {
            if (error?.name === 'AbortError') {
                return;
            }

            if (streamingAssistantId) {
                setMessages(prev => prev.map((msg) => {
                    if (msg.id !== streamingAssistantId) return msg;
                    return {
                        ...msg,
                        text: `Unable to reach AI assistant: ${error.message}`,
                        thinkingPending: false
                    };
                }));
            } else {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    text: `Unable to reach AI assistant: ${error.message}`
                }]);
            }
        } finally {
            finishRequest(requestId);
        }
    };

    const handleIterationDecision = async (allowIteration) => {
        if (!pendingIteration || loading) return;

        if (!allowIteration) {
            setPendingIteration(null);
            setMessages(prev => [...prev, {
                role: 'assistant',
                text: 'Iteration stopped by user request. You can manually adjust the circuit and rerun simulation anytime.'
            }]);
            return;
        }

        const { id: requestId, signal } = beginRequest();
        setLoading(true);
        try {
            const feedbackMessage = [
                'Retry once and improve the netlist.',
                `Original intent: ${pendingIteration.prompt}`,
                `Validation reason: ${pendingIteration.validation.reason || 'No reason.'}`,
                `Suggested fix: ${pendingIteration.validation.suggestedFix || 'No suggestion.'}`,
                'Return only updated netlist.'
            ].join('\n');

            const retryHistory = [
                { role: 'system', content: ITERATION_SYSTEM_PROMPT },
                { role: 'user', content: `Latest Output:\n${pendingIteration.generatedNetlist}` },
                { role: 'user', content: `Latest Error:\n${pendingIteration.simulationOutput || pendingIteration.validation.reason || feedbackMessage}` }
            ];

            setPendingIteration(null);
            await runDesignPipeline({
                prompt: pendingIteration.prompt,
                history: retryHistory,
                retryCount: 1,
                iterationPhase: 'retry',
                signal,
                requestId
            });
        } catch (error) {
            if (error?.name === 'AbortError') {
                return;
            }

            setMessages(prev => [...prev, {
                role: 'assistant',
                text: `Retry failed: ${error.message}`
            }]);
        } finally {
            finishRequest(requestId);
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

                <label
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 12,
                        fontSize: 12,
                        color: theme.uiText,
                        opacity: 0.9,
                        cursor: 'pointer'
                    }}
                >
                    <input
                        type="checkbox"
                        checked={includeThinking}
                        onChange={(e) => setIncludeThinking(e.target.checked)}
                        style={{ cursor: 'pointer' }}
                    />
                    Show Gemma thinking (if available)
                </label>

                <div style={{ display: 'flex', gap: 8 }}>
                    {MODES.map((m) => {
                        const isActive = mode === m.id;
                        return (
                            <button
                                key={m.id}
                                onClick={() => {
                                    cancelActiveRequest({ removeTransientMessages: true });
                                    setMode((prev) => {
                                        const nextMode = prev === m.id ? '' : m.id;
                                        if (prev && nextMode && prev !== nextMode) {
                                            resetAssistantSession();
                                        }
                                        return nextMode;
                                    });
                                }}
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
                            key={msg.id || `${msg.role}-${idx}`}
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
                                fontWeight: isUser ? '500' : '400',
                                border: isUser ? 'none' : `1px solid ${theme.border}`,
                            }}>
                                {isUser ? (
                                    <span style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</span>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        <div className="ai-markdown">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm, remarkMath]}
                                                rehypePlugins={[rehypeKatex]}
                                            >
                                                {toSafeText(msg.text, '')}
                                            </ReactMarkdown>
                                        </div>

                                        {(msg.thinkingPending || msg.thinking) ? (
                                            <details
                                                open={Boolean(msg.thinkingPending)}
                                                style={{
                                                    border: `1px solid ${theme.border}`,
                                                    borderRadius: 10,
                                                    background: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                                                    padding: '8px 10px'
                                                }}
                                            >
                                                <summary
                                                    style={{
                                                        cursor: 'pointer',
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        color: isDarkMode ? '#5aa3ff' : '#3b3bb3',
                                                        userSelect: 'none'
                                                    }}
                                                >
                                                    Thinking
                                                </summary>
                                                {msg.thinking ? (
                                                    <div className="ai-markdown" style={{ marginTop: 8, fontSize: 13, opacity: 0.92 }}>
                                                        <ReactMarkdown
                                                            remarkPlugins={[remarkGfm, remarkMath]}
                                                            rehypePlugins={[rehypeKatex]}
                                                        >
                                                            {toSafeText(msg.thinking, '')}
                                                        </ReactMarkdown>
                                                    </div>
                                                ) : (
                                                    <div style={{ marginTop: 8, fontSize: 12, opacity: 0.72 }}>Thinking...</div>
                                                )}
                                            </details>
                                        ) : null}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
                {loading && !isStreamingChat && (
                    <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '6px', alignItems: 'center', padding: '12px 16px', background: theme.btnBg, borderRadius: '16px 16px 16px 4px' }}>
                        <span style={{ width: 6, height: 6, background: isDarkMode ? '#4a007d' : '#c2a8f7', borderRadius: '50%', display: 'inline-block' }} />
                        <span style={{ width: 6, height: 6, background: isDarkMode ? '#004e92' : '#5ce1e6', borderRadius: '50%', display: 'inline-block' }} />
                        <span style={{ width: 6, height: 6, background: isDarkMode ? '#004989' : '#c2a8f7', borderRadius: '50%', display: 'inline-block' }} />
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div style={{ padding: '16px 20px', borderTop: `1px solid ${theme.border}`, background: isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.05)' }}>
                {pendingIteration && (
                    <div style={{
                        marginBottom: 10,
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center'
                    }}>
                        <button
                            onClick={() => handleIterationDecision(true)}
                            disabled={loading}
                            style={{
                                border: 'none',
                                borderRadius: 8,
                                padding: '8px 10px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                background: gradientBg,
                                color: '#fff',
                                fontSize: 12,
                                fontWeight: 600
                            }}
                        >
                            Iterate once
                        </button>
                        <button
                            onClick={() => handleIterationDecision(false)}
                            disabled={loading}
                            style={{
                                border: `1px solid ${theme.border}`,
                                borderRadius: 8,
                                padding: '8px 10px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                background: theme.btnBg,
                                color: theme.uiText,
                                fontSize: 12,
                                fontWeight: 600
                            }}
                        >
                            Stop iteration
                        </button>
                    </div>
                )}
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
                        onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = 'scale(1.05)' }}
                        onMouseLeave={(e) => { if (!loading) e.currentTarget.style.transform = 'scale(1)' }}
                    >
                        <Send size={16} style={{ marginLeft: -2 }} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
