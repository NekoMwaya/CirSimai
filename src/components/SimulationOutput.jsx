import React, { useMemo, useState, useEffect } from 'react';
import Plot from 'react-plotly.js';

const SimulationOutput = ({ data, isVisible, onClose, onParsedData }) => {
    const [activeTab, setActiveTab] = useState('dc'); 

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

    useEffect(() => {
        if (onParsedData && parsed) {
            onParsedData(parsed);
        }
    }, [parsed, onParsedData]);

    if (!isVisible) return null;
    
    const activeData = parsed || { nodes: [], table: { rows: [] } };
    const hasDC = activeData.nodes.length > 0;
    const hasTran = activeData.table.rows.length > 0;

    return (
        <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '400px',
            background: 'white', borderTop: '2px solid #1890ff', zIndex: 500,
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial'
        }}>
            {/* Header / Tabs */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: '#f0f2f5', padding: '0 10px',  borderBottom: '1px solid #d9d9d9'
            }}>
                <div style={{ display: 'flex' }}>
                   <TabButton label="DC Operating Point" active={activeTab === 'dc'} onClick={() => setActiveTab('dc')} disabled={!hasDC} />
                   <TabButton label="Transient Graph" active={activeTab === 'tran'} onClick={() => setActiveTab('tran')} disabled={!hasTran} />
                   <TabButton label="Raw Log" active={activeTab === 'log'} onClick={() => setActiveTab('log')} />
                </div>
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
                            <div style={{ height: '100%', display: 'flex' }}>
                                <div style={{ flex: 1, height: '100%' }}>
                                    <Plot
                                        data={[{
                                            x: activeData.plotData.x,
                                            y: activeData.plotData.y,
                                            type: 'scatter',
                                            mode: 'lines',
                                            line: { color: '#1890ff', width: 2 },
                                            name: 'Result'
                                        }]}
                                        layout={{
                                            autosize: true,
                                            margin: { l: 60, r: 20, t: 30, b: 50 },
                                            xaxis: { title: 'Time (s)', gridcolor: '#eee' },
                                            yaxis: { title: 'Value', gridcolor: '#eee' },
                                            plot_bgcolor: '#fff',
                                            paper_bgcolor: '#fff'
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