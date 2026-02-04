import React, { useMemo, useState, useEffect } from 'react';
import Plot from 'react-plotly.js';

// Color palette for multiple traces (LTSpice-like colors)
const TRACE_COLORS = [
    '#1f77b4', // Blue
    '#ff7f0e', // Orange
    '#2ca02c', // Green
    '#d62728', // Red
    '#9467bd', // Purple
    '#8c564b', // Brown
    '#e377c2', // Pink
    '#7f7f7f', // Gray
    '#bcbd22', // Yellow-green
    '#17becf', // Cyan
];

const SimulationOutput = ({ data, isVisible, onClose, onParsedData, probeNodeIds, onProbeNodeChange, tranEndTime, onTranEndTimeChange, onRerunSimulation }) => {
    const [activeTab, setActiveTab] = useState('dc');
    const [panelHeight, setPanelHeight] = useState(400);
    const [isResizing, setIsResizing] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);

    const [localTranTime, setLocalTranTime] = useState(() => {
        // Initialize based on tranEndTime, converting to appropriate unit
        if (!tranEndTime || tranEndTime <= 0) return 10;
        if (tranEndTime < 1e-3) return tranEndTime * 1e6; // microseconds
        if (tranEndTime < 1) return tranEndTime * 1e3; // milliseconds
        return tranEndTime; // seconds
    });
    const [tranTimeUnit, setTranTimeUnit] = useState(() => {
        // Initialize unit based on tranEndTime magnitude
        if (!tranEndTime || tranEndTime <= 0) return 'ms';
        if (tranEndTime < 1e-3) return 'us';
        if (tranEndTime < 1) return 'ms';
        return 's';
    });

    const parsed = useMemo(() => {
        if (!data || data.length === 0) return null;

        // 1. Strict Filter for Noise/Diagnostics
        const noisePatterns = [
             /(Total analysis time|Total elapsed time|Total DRAM|DRAM currently|Maximum ngspice|Current ngspice|Shared ngspice|Text \(code\)|Library pages|Stack =|Total DRAM available)/i,
             /^No compatibility mode/i,
             /^Circuit:/i,
             /^Doing analysis at/i,
             /^Initial Transient Solution/i,
             /^Reference value/i,
             /^\s*$/
         ];
 
         const cleanLines = data.filter(l => !noisePatterns.some(p => p.test(l)));
 
         // 2. Parse DC Operating Point
         const nodeHeaderIdx = cleanLines.findIndex(l => l.trim().startsWith('Node') && /Voltage/i.test(l));
         const nodes = [];
         
         if (nodeHeaderIdx !== -1) {
             for (let i = nodeHeaderIdx + 1; i < cleanLines.length; i++) {
                 const line = cleanLines[i].trim();
                 if (line.startsWith('-')) continue; 
                 if (line.startsWith('Index') || line.startsWith('No. of Data Rows')) break;
                 
                 const parts = line.split(/\s+/);
                 if (parts.length >= 2) {
                     const name = parts[0];
                     const val = parseFloat(parts.slice(1).join(' '));
                     if (!isNaN(val)) nodes.push({ name, value: val });
                 }
             }
         }
 
         // 3. Parse Transient (Advanced: Capture ALL columns)
         const indexHeaderIdx = cleanLines.findIndex(l => l.trim().startsWith('Index'));
         const table = { cols: [], rows: [] };
         let plotData = { x: [], y: [] };
 
         if (indexHeaderIdx !== -1) {
             const headerStr = cleanLines[indexHeaderIdx].trim();
             const rawCols = headerStr.split(/\s+/);
             // rawCols: ["Index", "time", "v(1)", "@r1[i]", ...]
             table.cols = rawCols;

             // Find plot candidates (time vs first voltage)
             const timeColIdx = rawCols.findIndex(c => /time/i.test(c));
             const valColIdx = rawCols.findIndex((c, i) => i !== 0 && i !== timeColIdx && !c.includes('Index')); 
 
             for (let i = indexHeaderIdx + 1; i < cleanLines.length; i++) {
                 const line = cleanLines[i].trim();
                 if (line.startsWith('-') || !line) continue;
                 const tokens = line.split(/\s+/).filter(t => t !== '');
                 
                 // If we have data, parse ALL tokens into a row object
                 if (tokens.length === rawCols.length && /^[-\d\.e+]+$/i.test(tokens[0])) {
                     const rowObj = { raw: line };
                     tokens.forEach((token, idx) => {
                         const val = parseFloat(token);
                         if(!isNaN(val)) {
                             // Map key is lowercase column name for easier lookup
                             rowObj[rawCols[idx].toLowerCase()] = val;
                         }
                     });
                     table.rows.push(rowObj);

                     // For the quick plot
                     if (timeColIdx !== -1 && valColIdx !== -1) {
                        plotData.x.push(rowObj[rawCols[timeColIdx].toLowerCase()]);
                        plotData.y.push(rowObj[rawCols[valColIdx].toLowerCase()]);
                     }
                 }
             }
         }
         return { nodes, table, plotData, raw: data };
    }, [data]);

    // Compute all derived values that hooks depend on BEFORE any conditional returns
    const activeData = parsed || { nodes: [], table: { rows: [], cols: [] }, raw: [] };
    const hasDC = activeData.nodes.length > 0;
    const hasTran = activeData.table.rows.length > 0;
    
    // Get available voltage nodes for probing (from table columns)
    const voltageNodes = useMemo(() => {
        if (!activeData.table.cols) return [];
        return activeData.table.cols
            .filter(c => c.toLowerCase().startsWith('v('))
            .map(c => {
                const match = c.match(/v\((\d+)\)/i);
                return match ? parseInt(match[1]) : null;
            })
            .filter(n => n !== null);
    }, [activeData.table.cols]);
    
    // Ensure probeNodeIds is always an array
    const selectedProbes = useMemo(() => {
        if (Array.isArray(probeNodeIds)) return probeNodeIds;
        if (probeNodeIds !== null && probeNodeIds !== undefined) return [probeNodeIds];
        return [];
    }, [probeNodeIds]);
    
    // Get plot data for a single node
    const getPlotDataForNode = (nodeId, tableData) => {
        if (!tableData || tableData.rows.length === 0) {
            return { x: [], y: [], label: 'No data' };
        }
        
        const timeKey = tableData.cols.find(c => /time/i.test(c))?.toLowerCase();
        if (!timeKey) return { x: [], y: [], label: 'No time data' };
        
        const voltKey = `v(${nodeId})`;
        
        const x = [];
        const y = [];
        tableData.rows.forEach(row => {
            if (row[timeKey] !== undefined && row[voltKey] !== undefined) {
                x.push(row[timeKey]);
                y.push(row[voltKey]);
            }
        });
        
        return { x, y, label: `v(${nodeId})` };
    };
    
    // Get all plot traces for selected probes
    const plotTraces = useMemo(() => {
        const tableData = activeData.table;
        const hasTransientData = tableData && tableData.rows && tableData.rows.length > 0;
        
        if (!hasTransientData || selectedProbes.length === 0) {
            // If no probes selected, show first available voltage node
            if (voltageNodes.length > 0) {
                const data = getPlotDataForNode(voltageNodes[0], tableData);
                return [{
                    x: data.x,
                    y: data.y,
                    type: 'scatter',
                    mode: 'lines',
                    line: { color: TRACE_COLORS[0], width: 2 },
                    name: data.label
                }];
            }
            return [];
        }
        
        return selectedProbes.map((nodeId, index) => {
            const data = getPlotDataForNode(nodeId, tableData);
            return {
                x: data.x,
                y: data.y,
                type: 'scatter',
                mode: 'lines',
                line: { color: TRACE_COLORS[index % TRACE_COLORS.length], width: 2 },
                name: data.label
            };
        });
    }, [hasTran, selectedProbes, voltageNodes, activeData.table]);
    
    // Calculate appropriate time unit based on data range
    const getTimeAxisConfig = () => {
        if (plotTraces.length === 0 || plotTraces[0].x.length === 0) {
            return { title: 'Time (s)', tickformat: '.3f', ticksuffix: ' s' };
        }
        
        const maxTime = Math.max(...plotTraces[0].x);
        
        if (maxTime < 1e-6) {
            return { 
                title: 'Time (ns)', 
                tickformat: '.1f',
                multiplier: 1e9,
                unit: 'ns'
            };
        } else if (maxTime < 1e-3) {
            return { 
                title: 'Time (µs)', 
                tickformat: '.1f',
                multiplier: 1e6,
                unit: 'µs'
            };
        } else if (maxTime < 1) {
            return { 
                title: 'Time (ms)', 
                tickformat: '.1f',
                multiplier: 1e3,
                unit: 'ms'
            };
        }
        return { 
            title: 'Time (s)', 
            tickformat: '.3f',
            multiplier: 1,
            unit: 's'
        };
    };
    
    const timeAxisConfig = getTimeAxisConfig();
    
    // Handle toggle probe selection
    const handleToggleProbe = (nodeId) => {
        if (!onProbeNodeChange) return;
        
        const currentProbes = [...selectedProbes];
        const index = currentProbes.indexOf(nodeId);
        
        if (index === -1) {
            // Add probe
            currentProbes.push(nodeId);
        } else {
            // Remove probe
            currentProbes.splice(index, 1);
        }
        
        onProbeNodeChange(currentProbes);
    };
    
    // Handle transient time change
    const handleApplyTranTime = () => {
        let timeInSeconds = localTranTime;
        if (tranTimeUnit === 'us') timeInSeconds = localTranTime / 1e6;
        else if (tranTimeUnit === 'ms') timeInSeconds = localTranTime / 1e3;
        // 's' stays as is
        
        if (onTranEndTimeChange) {
            onTranEndTimeChange(timeInSeconds);
        }
        if (onRerunSimulation) {
            // Pass the new time directly to avoid state sync issues
            onRerunSimulation(timeInSeconds);
        }
    };

    // useEffect must be called unconditionally (after all other hooks)
    useEffect(() => {
        if (onParsedData && parsed) {
            onParsedData(parsed);
        }
    }, [parsed, onParsedData]);

    // Handle resizing logic
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing) return;
            const newHeight = window.innerHeight - e.clientY;
            // Clamp height between 50px (header only approx) and window height
            const clamped = Math.max(40, Math.min(newHeight, window.innerHeight));
            setPanelHeight(clamped);
            setIsMaximized(clamped >= window.innerHeight - 10);
        };

        const handleMouseUp = () => {
            if (isResizing) setIsResizing(false);
            // Re-enable text selection/events if needed
            document.body.style.userSelect = '';
        };

        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = 'none'; // Prevent selection while dragging
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = '';
        };
    }, [isResizing]);

    // Toggle maximize
    const toggleMaximize = () => {
        if (isMaximized) {
             setPanelHeight(400); // Restore
             setIsMaximized(false);
        } else {
             setPanelHeight(window.innerHeight); // Maximize
             setIsMaximized(true);
        }
    };

    // Now we can safely do conditional return AFTER all hooks
    if (!isVisible) return null;

    return (
        <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: isMaximized ? '100vh' : `${panelHeight}px`,
            background: 'white', borderTop: '2px solid #1890ff', zIndex: 500,
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial',
            transition: isResizing ? 'none' : 'height 0.2s ease-out'
        }}>
            {/* Resize Handle Area */}
            <div 
                onMouseDown={() => setIsResizing(true)}
                style={{
                    position: 'absolute', top: -5, left: 0, right: 0, height: 10,
                    cursor: 'ns-resize', zIndex: 10, background: 'transparent'
                }}
                title="Drag to resize"
            />

            {/* Header / Tabs */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: '#f0f2f5', padding: '0 10px',  borderBottom: '1px solid #d9d9d9',
                flexShrink: 0
            }}>
                <div style={{ display: 'flex' }}>
                   <TabButton label="DC Operating Point" active={activeTab === 'dc'} onClick={() => setActiveTab('dc')} disabled={!hasDC} />
                   <TabButton label="Transient Graph" active={activeTab === 'tran'} onClick={() => setActiveTab('tran')} disabled={!hasTran} />
                   <TabButton label="Raw Log" active={activeTab === 'log'} onClick={() => setActiveTab('log')} />
                </div>
                <div>
                    <button 
                        onClick={toggleMaximize}
                        style={{ 
                            background: 'none', border: 'none', color: '#666', 
                            fontSize: '14px', cursor: 'pointer', padding: '10px 10px', fontWeight: 'bold' 
                        }}
                        title={isMaximized ? "Restore" : "Maximize"}
                    >
                        {isMaximized ? '❐' : '□'}
                    </button>
                    <button 
                      onClick={onClose}
                      style={{ 
                          background: 'none', border: 'none', color: '#666', 
                          fontSize: '16px', cursor: 'pointer', padding: '10px 15px', fontWeight: 'bold' 
                      }}
                    >
                      ✕
                    </button>
                </div>
            </div>

            {/* Content & Tab Panels (Same as before) */}
            <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
                {!parsed ? (
                    <div style={{ color: '#999', textAlign: 'center', marginTop: 40 }}>Processing simulation data...</div>
                ) : (
                    <>
                        {activeTab === 'dc' && (
                            <div style={{ maxWidth: 600, margin: '0 auto' }}>
                                <h3 style={{ color: '#333', marginBottom: 15, borderBottom: '1px solid #eee', paddingBottom: 8 }}>
                                    Node Voltages & Currents
                                </h3>
                                {/* If we have DC nodes (Op Point analysis) show them */}
                                {activeData.nodes.length > 0 ? (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                                        <thead>
                                            <tr style={{ background: '#fafafa', color: '#888', textAlign: 'left' }}>
                                                <th style={{ padding: '8px 12px', borderBottom: '1px solid #eee' }}>Node / Source</th>
                                                <th style={{ padding: '8px 12px', borderBottom: '1px solid #eee', textAlign: 'right' }}>Value</th>
                                                <th style={{ padding: '8px 12px', borderBottom: '1px solid #eee', textAlign: 'right' }}>Unit</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activeData.nodes.map((n, i) => (
                                                <tr key={n.name} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                                    <td style={{ padding: '8px 12px', fontWeight: 500 }}>{n.name}</td>
                                                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontSize: 14 }}>
                                                        {formatSI(n.value)}
                                                    </td>
                                                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#999' }}>
                                                        {n.name.includes('#branch') ? 'A' : 'V'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p>No explicit DC Analysis block found. Check Transient tab or Overlay.</p>
                                )}
                            </div>
                        )}

                        {activeTab === 'tran' && (
                            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                {/* Transient time control */}
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 10, 
                                    marginBottom: 10, 
                                    padding: '8px 12px',
                                    background: '#f8f9fa',
                                    borderRadius: 6,
                                    flexShrink: 0 
                                }}>
                                    <label style={{ fontWeight: 500, color: '#333', fontSize: 12 }}>End Time:</label>
                                    <input
                                        type="number"
                                        value={localTranTime}
                                        onChange={(e) => setLocalTranTime(parseFloat(e.target.value) || 0)}
                                        style={{
                                            width: 80,
                                            padding: '4px 8px',
                                            borderRadius: 4,
                                            border: '1px solid #d9d9d9',
                                            fontSize: 12
                                        }}
                                        min="0.001"
                                        step="1"
                                    />
                                    <select
                                        value={tranTimeUnit}
                                        onChange={(e) => setTranTimeUnit(e.target.value)}
                                        style={{
                                            padding: '4px 8px',
                                            borderRadius: 4,
                                            border: '1px solid #d9d9d9',
                                            fontSize: 12,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="us">µs</option>
                                        <option value="ms">ms</option>
                                        <option value="s">s</option>
                                    </select>
                                    <button
                                        onClick={handleApplyTranTime}
                                        style={{
                                            padding: '4px 12px',
                                            borderRadius: 4,
                                            border: 'none',
                                            background: '#1890ff',
                                            color: 'white',
                                            fontSize: 12,
                                            fontWeight: 500,
                                            cursor: 'pointer',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseOver={(e) => e.target.style.background = '#40a9ff'}
                                        onMouseOut={(e) => e.target.style.background = '#1890ff'}
                                    >
                                        🔄 Re-run
                                    </button>
                                    <span style={{ color: '#888', fontSize: 11, marginLeft: 10 }}>
                                        Adjust simulation duration and re-run
                                    </span>
                                </div>
                                
                                {/* Node selector for probing - Multi-select */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10, flexShrink: 0, flexWrap: 'wrap' }}>
                                    <label style={{ fontWeight: 500, color: '#333', paddingTop: 6 }}>Probe Nodes:</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flex: 1 }}>
                                        {voltageNodes.map((n, index) => {
                                            const isSelected = selectedProbes.includes(n);
                                            const colorIndex = selectedProbes.indexOf(n);
                                            return (
                                                <button
                                                    key={n}
                                                    onClick={() => handleToggleProbe(n)}
                                                    style={{
                                                        padding: '4px 10px',
                                                        borderRadius: 4,
                                                        border: isSelected 
                                                            ? `2px solid ${TRACE_COLORS[colorIndex % TRACE_COLORS.length]}`
                                                            : '1px solid #d9d9d9',
                                                        background: isSelected 
                                                            ? `${TRACE_COLORS[colorIndex % TRACE_COLORS.length]}20`
                                                            : 'white',
                                                        color: isSelected 
                                                            ? TRACE_COLORS[colorIndex % TRACE_COLORS.length]
                                                            : '#666',
                                                        cursor: 'pointer',
                                                        fontWeight: isSelected ? 600 : 400,
                                                        fontSize: 12,
                                                        transition: 'all 0.15s'
                                                    }}
                                                >
                                                    {isSelected && <span style={{ marginRight: 4 }}>●</span>}
                                                    v({n})
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <span style={{ color: '#888', fontSize: 11, paddingTop: 6 }}>
                                        💡 Click nodes to toggle • Click wires in circuit to probe
                                    </span>
                                </div>
                                
                                {/* Selected probes legend */}
                                {selectedProbes.length > 0 && (
                                    <div style={{ 
                                        display: 'flex', 
                                        gap: 15, 
                                        marginBottom: 8, 
                                        fontSize: 12,
                                        color: '#555',
                                        flexWrap: 'wrap'
                                    }}>
                                        {selectedProbes.map((nodeId, index) => (
                                            <span key={nodeId} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <span style={{ 
                                                    width: 12, 
                                                    height: 3, 
                                                    background: TRACE_COLORS[index % TRACE_COLORS.length],
                                                    borderRadius: 1
                                                }}></span>
                                                <span>v({nodeId})</span>
                                                <button
                                                    onClick={() => handleToggleProbe(nodeId)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: '#999',
                                                        cursor: 'pointer',
                                                        padding: '0 2px',
                                                        fontSize: 10
                                                    }}
                                                >
                                                    ✕
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                
                                <div style={{ flex: 1, minHeight: 0 }}>
                                    <Plot
                                        data={plotTraces}
                                        layout={{
                                            autosize: true,
                                            margin: { l: 70, r: 30, t: 30, b: 60 },
                                            xaxis: { 
                                                title: {
                                                    text: timeAxisConfig.title,
                                                    font: { size: 13, color: '#333' }
                                                },
                                                gridcolor: '#eee',
                                                linecolor: '#ccc',
                                                tickfont: { size: 11 },
                                                zeroline: true,
                                                zerolinecolor: '#999',
                                                zerolinewidth: 1
                                            },
                                            yaxis: { 
                                                title: {
                                                    text: 'Voltage (V)',
                                                    font: { size: 13, color: '#333' }
                                                },
                                                gridcolor: '#eee',
                                                linecolor: '#ccc',
                                                tickfont: { size: 11 },
                                                zeroline: true,
                                                zerolinecolor: '#999',
                                                zerolinewidth: 1
                                            },
                                            plot_bgcolor: '#fff',
                                            paper_bgcolor: '#fff',
                                            showlegend: selectedProbes.length > 1,
                                            legend: {
                                                orientation: 'h',
                                                yanchor: 'bottom',
                                                y: 1.02,
                                                xanchor: 'right',
                                                x: 1,
                                                font: { size: 11 }
                                            },
                                            hovermode: 'x unified'
                                        }}
                                        config={{
                                            displayModeBar: true,
                                            displaylogo: false,
                                            modeBarButtonsToRemove: ['lasso2d', 'select2d']
                                        }}
                                        useResizeHandler={true}
                                        style={{ width: '100%', height: '100%' }}
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'log' && (
                            <div style={{ background: '#1e1e1e', color: '#a9b7c6', padding: 15, borderRadius: 4, height: '100%', overflow: 'auto', fontFamily: 'Consolas, monospace', fontSize: 12 }}>
                                {activeData.raw.join('\n')}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

const TabButton = ({ label, active, onClick, disabled }) => (
    <button
        onClick={!disabled ? onClick : undefined}
        style={{
            padding: '12px 20px',
            background: active ? 'white' : 'transparent',
            border: 'none',
            borderBottom: active ? '2px solid #1890ff' : '2px solid transparent',
            color: disabled ? '#ccc' : (active ? '#1890ff' : '#555'),
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontWeight: active ? 600 : 400,
            outline: 'none',
            transition: 'all 0.2s'
        }}
    >
        {label}
    </button>
);

const formatSI = (num) => {
    if (Math.abs(num) < 1e-15) return "0";
    if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(3) + " k";
    if (Math.abs(num) >= 1) return num.toFixed(3) + " ";
    if (Math.abs(num) >= 1e-3) return (num * 1e3).toFixed(3) + " m";
    if (Math.abs(num) >= 1e-6) return (num * 1e6).toFixed(3) + " µ";
    if (Math.abs(num) >= 1e-9) return (num * 1e9).toFixed(3) + " n";
    return num.toExponential(2);
};

export default SimulationOutput;