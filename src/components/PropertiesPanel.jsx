import React, { useState, useEffect } from 'react';
import { useCircuit } from '../context/CircuitContext';

// BJT model options (IDEAL first for theoretical silicon BJT with VBE=0.7V)
const NPN_MODELS = ['IDEAL_NPN', '2N2222', '2N3904'];
const PNP_MODELS = ['IDEAL_PNP', '2N2907', '2N3906'];

// MOSFET model options
const NMOS_MODELS = ['IDEAL_NMOS', '2N7000', 'BS170'];
const PMOS_MODELS = ['IDEAL_PMOS', 'BS250', 'VP2106'];

// JFET model options
const NJFET_MODELS = ['IDEAL_NJFET', '2N5457', 'J201'];
const PJFET_MODELS = ['IDEAL_PJFET', '2N5460', 'J175'];

// Op-Amp model options
const OPAMP_MODELS = ['IDEAL_OPAMP', 'LM741', 'TL072', 'LM358'];

export default function PropertiesPanel() {
    const { components, updateComponent, selectedIds, theme } = useCircuit();
    
    // Find the single selected component
    const selectedComponent = components.find(c => selectedIds.length === 1 && c.id === selectedIds[0]);

    if (!selectedComponent) return null;

    // Determine unit label based on component type
    const getUnitLabel = (type) => {
        switch (type) {
            case 'resistor': return 'Ω';
            case 'capacitor': return 'F';
            case 'inductor': return 'H';
            case 'source': return 'V (DC)';
            case 'acsource': return 'V freq (e.g., 5 1k)';
            case 'bjt_npn':
            case 'bjt_pnp': return 'BJT Model';
            case 'nmos':
            case 'pmos': return 'MOSFET Model';
            case 'njfet':
            case 'pjfet': return 'JFET Model';
            case 'opamp':
            case 'opamp5': return 'Op-Amp Model';
            default: return '';
        }
    };

    // Get placeholder/help text for value
    const getPlaceholder = (type) => {
        switch (type) {
            case 'resistor': return '1k, 10, 4.7k';
            case 'capacitor': return '1u, 10n, 100p';
            case 'inductor': return '1m, 100u, 10n';
            case 'source': return '5, 12, 3.3';
            case 'acsource': return '5 1k (5V @ 1kHz)';
            default: return '';
        }
    };

    // Get BJT models based on type
    const getBjtModels = (type) => {
        return type === 'bjt_npn' ? NPN_MODELS : PNP_MODELS;
    };

    // Get MOSFET models based on type
    const getMosfetModels = (type) => {
        return type === 'nmos' ? NMOS_MODELS : PMOS_MODELS;
    };

    // Get JFET models based on type
    const getJfetModels = (type) => {
        return type === 'njfet' ? NJFET_MODELS : PJFET_MODELS;
    };

    const isBjt = selectedComponent.type === 'bjt_npn' || selectedComponent.type === 'bjt_pnp';
    const isMosfet = selectedComponent.type === 'nmos' || selectedComponent.type === 'pmos';
    const isJfet = selectedComponent.type === 'njfet' || selectedComponent.type === 'pjfet';
    const isOpamp = selectedComponent.type === 'opamp' || selectedComponent.type === 'opamp5';
    const isTransistor = isBjt || isMosfet || isJfet;

    const [labelValue, setLabelValue] = useState(selectedComponent.label || '');

    useEffect(() => {
        setLabelValue(selectedComponent.label || '');
    }, [selectedComponent.label]);

    const commitLabel = () => {
        let newLabel = String(labelValue || '').trim();
        if (!newLabel) return; // ignore empty

        // Ensure label is unique among components
        if (components.some(c => c.label === newLabel && c.id !== selectedComponent.id)) {
            // Append numeric suffix until unique
            let count = 1;
            let candidate = `${newLabel}${count}`;
            while (components.some(c => c.label === candidate)) {
                count++;
                candidate = `${newLabel}${count}`;
            }
            newLabel = candidate;
        }

        if (newLabel !== selectedComponent.label) {
            updateComponent(selectedComponent.id, { label: newLabel });
        }
    };

    return (
        <div style={{
            position: 'absolute', top: 10, right: 10, zIndex: 10,
            background: theme.uiBg, color: theme.uiText,
            padding: 15, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            width: 200
        }}>
            <h4 style={{marginTop:0}}>Properties</h4>
            
            <div style={{marginBottom: 10}}>
                <label style={{display:'block', fontSize: 12, marginBottom: 4}}>Label</label>
                <input 
                    value={labelValue}
                    onChange={(e) => setLabelValue(e.target.value)}
                    onBlur={commitLabel}
                    onKeyDown={(e) => { if (e.key === 'Enter') { commitLabel(); e.currentTarget.blur(); } }}
                    style={{width: '100%', padding: 5, background: theme.inputBg, color: theme.uiText, border: `1px solid ${theme.border}`}} 
                />
            </div>
            
            {/* BJT Model Dropdown */}
            {isBjt && (
                <div style={{marginBottom: 10}}>
                    <label style={{display:'block', fontSize: 12, marginBottom: 4}}>
                        Model ({selectedComponent.type === 'bjt_npn' ? 'NPN' : 'PNP'})
                    </label>
                    <select
                        value={selectedComponent.value}
                        onChange={(e) => updateComponent(selectedComponent.id, { value: e.target.value })}
                        style={{
                            width: '100%', 
                            padding: 5, 
                            background: theme.inputBg, 
                            color: theme.uiText, 
                            border: `1px solid ${theme.border}`,
                            borderRadius: 4,
                            cursor: 'pointer'
                        }}
                    >
                        {getBjtModels(selectedComponent.type).map(model => (
                            <option key={model} value={model}>{model}</option>
                        ))}
                    </select>
                    <div style={{fontSize: 11, color: theme.uiText, opacity: 0.7, marginTop: 5}}>
                        Pins: B (left), C (top), E (bottom)
                    </div>
                    {/* Beta input for IDEAL BJT models */}
                    {selectedComponent.value?.startsWith('IDEAL_') && (
                        <div style={{marginTop: 10}}>
                            <label style={{display:'block', fontSize: 12, marginBottom: 4}}>
                                Beta (β) - Current Gain
                            </label>
                            <input
                                type="number"
                                min="1"
                                step="1"
                                value={selectedComponent.beta ?? 100}
                                onChange={(e) => updateComponent(selectedComponent.id, { beta: parseFloat(e.target.value) || 100 })}
                                style={{
                                    width: '100%', 
                                    padding: 5, 
                                    background: theme.inputBg, 
                                    color: theme.uiText, 
                                    border: `1px solid ${theme.border}`,
                                    borderRadius: 4
                                }}
                            />
                            <div style={{fontSize: 11, color: theme.uiText, opacity: 0.7, marginTop: 3}}>
                                VBE = 0.7V, typical: 50-300
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* MOSFET Model Dropdown */}
            {isMosfet && (
                <div style={{marginBottom: 10}}>
                    <label style={{display:'block', fontSize: 12, marginBottom: 4}}>
                        Model ({selectedComponent.type === 'nmos' ? 'NMOS' : 'PMOS'})
                    </label>
                    <select
                        value={selectedComponent.value}
                        onChange={(e) => updateComponent(selectedComponent.id, { value: e.target.value })}
                        style={{
                            width: '100%', 
                            padding: 5, 
                            background: theme.inputBg, 
                            color: theme.uiText, 
                            border: `1px solid ${theme.border}`,
                            borderRadius: 4,
                            cursor: 'pointer'
                        }}
                    >
                        {getMosfetModels(selectedComponent.type).map(model => (
                            <option key={model} value={model}>{model}</option>
                        ))}
                    </select>
                    <div style={{fontSize: 11, color: theme.uiText, opacity: 0.7, marginTop: 5}}>
                        Pins: G (left), D (top), S (bottom)
                    </div>
                    {/* Vth input for IDEAL MOSFET models */}
                    {selectedComponent.value?.startsWith('IDEAL_') && (
                        <div style={{marginTop: 10}}>
                            <label style={{display:'block', fontSize: 12, marginBottom: 4}}>
                                Vth - Threshold Voltage (V)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                value={selectedComponent.vth ?? (selectedComponent.type === 'nmos' ? 1 : -1)}
                                onChange={(e) => updateComponent(selectedComponent.id, { vth: parseFloat(e.target.value) || (selectedComponent.type === 'nmos' ? 1 : -1) })}
                                style={{
                                    width: '100%', 
                                    padding: 5, 
                                    background: theme.inputBg, 
                                    color: theme.uiText, 
                                    border: `1px solid ${theme.border}`,
                                    borderRadius: 4
                                }}
                            />
                            <div style={{fontSize: 11, color: theme.uiText, opacity: 0.7, marginTop: 3}}>
                                {selectedComponent.type === 'nmos' ? 'NMOS: typically positive (0.5-3V)' : 'PMOS: typically negative (-0.5 to -3V)'}
                            </div>
                        </div>
                    )}
                    
                    {/* ID(on) and VGS(on) inputs for IDEAL MOSFET models - to calc KP */}
                    {selectedComponent.value?.startsWith('IDEAL_') && (
                        <div style={{marginTop: 10, padding: 5, border: `1px dashed ${theme.border}`, borderRadius: 4}}>
                            <div style={{fontSize: 11, fontWeight: 'bold', marginBottom: 5}}>Datasheet Spec (to set K)</div>
                            
                            <label style={{display:'block', fontSize: 12, marginBottom: 4}}>
                                Id(on) (mA)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={selectedComponent.id_on ?? 2}
                                onChange={(e) => updateComponent(selectedComponent.id, { id_on: parseFloat(e.target.value) || 2 })}
                                style={{
                                    width: '100%', 
                                    padding: 5, 
                                    background: theme.inputBg, 
                                    color: theme.uiText, 
                                    border: `1px solid ${theme.border}`,
                                    borderRadius: 4,
                                    marginBottom: 8
                                }}
                            />
                            
                            <label style={{display:'block', fontSize: 12, marginBottom: 4}}>
                                @ Vgs(on) (V)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                value={selectedComponent.vgs_on ?? (selectedComponent.type === 'nmos' ? 10 : -10)}
                                onChange={(e) => updateComponent(selectedComponent.id, { vgs_on: parseFloat(e.target.value) || (selectedComponent.type === 'nmos' ? 10 : -10) })}
                                style={{
                                    width: '100%', 
                                    padding: 5, 
                                    background: theme.inputBg, 
                                    color: theme.uiText, 
                                    border: `1px solid ${theme.border}`,
                                    borderRadius: 4
                                }}
                            />
                            <div style={{fontSize: 11, color: theme.uiText, opacity: 0.7, marginTop: 3}}>
                                Defines conduction param k.
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* JFET Model Dropdown */}
            {isJfet && (
                <div style={{marginBottom: 10}}>
                    <label style={{display:'block', fontSize: 12, marginBottom: 4}}>
                        Model ({selectedComponent.type === 'njfet' ? 'N-JFET' : 'P-JFET'})
                    </label>
                    <select
                        value={selectedComponent.value}
                        onChange={(e) => updateComponent(selectedComponent.id, { value: e.target.value })}
                        style={{
                            width: '100%', 
                            padding: 5, 
                            background: theme.inputBg, 
                            color: theme.uiText, 
                            border: `1px solid ${theme.border}`,
                            borderRadius: 4,
                            cursor: 'pointer'
                        }}
                    >
                        {getJfetModels(selectedComponent.type).map(model => (
                            <option key={model} value={model}>{model}</option>
                        ))}
                    </select>
                    <div style={{fontSize: 11, color: theme.uiText, opacity: 0.7, marginTop: 5}}>
                        Pins: G (left), D (top), S (bottom)
                    </div>
                    {/* Vp input for IDEAL JFET models */}
                    {selectedComponent.value?.startsWith('IDEAL_') && (
                        <div style={{marginTop: 10}}>
                            <label style={{display:'block', fontSize: 12, marginBottom: 4}}>
                                Vp - Pinch-off Voltage (V)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                value={selectedComponent.vp ?? (selectedComponent.type === 'njfet' ? -2 : 2)}
                                onChange={(e) => updateComponent(selectedComponent.id, { vp: parseFloat(e.target.value) || (selectedComponent.type === 'njfet' ? -2 : 2) })}
                                style={{
                                    width: '100%', 
                                    padding: 5, 
                                    background: theme.inputBg, 
                                    color: theme.uiText, 
                                    border: `1px solid ${theme.border}`,
                                    borderRadius: 4
                                }}
                            />
                            <div style={{fontSize: 11, color: theme.uiText, opacity: 0.7, marginTop: 3}}>
                                {selectedComponent.type === 'njfet' ? 'N-JFET: typically negative (-1 to -5V)' : 'P-JFET: typically positive (1 to 5V)'}
                            </div>
                        </div>
                    )}
                    
                    {/* IDSS input for IDEAL JFET models */}
                    {selectedComponent.value?.startsWith('IDEAL_') && (
                        <div style={{marginTop: 10}}>
                            <label style={{display:'block', fontSize: 12, marginBottom: 4}}>
                                IDSS - Saturation Current (mA)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={selectedComponent.idss ?? 10}
                                onChange={(e) => updateComponent(selectedComponent.id, { idss: parseFloat(e.target.value) || 10 })}
                                style={{
                                    width: '100%', 
                                    padding: 5, 
                                    background: theme.inputBg, 
                                    color: theme.uiText, 
                                    border: `1px solid ${theme.border}`,
                                    borderRadius: 4
                                }}
                            />
                            <div style={{fontSize: 11, color: theme.uiText, opacity: 0.7, marginTop: 3}}>
                                Typical: 1-20mA. Used to calc Beta.
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Op-Amp Model Dropdown */}
            {isOpamp && (
                <div style={{marginBottom: 10}}>
                    <label style={{display:'block', fontSize: 12, marginBottom: 4}}>
                        Op-Amp Model
                    </label>
                    <select
                        value={selectedComponent.value}
                        onChange={(e) => updateComponent(selectedComponent.id, { value: e.target.value })}
                        style={{
                            width: '100%', 
                            padding: 5, 
                            background: theme.inputBg, 
                            color: theme.uiText, 
                            border: `1px solid ${theme.border}`,
                            borderRadius: 4,
                            cursor: 'pointer'
                        }}
                    >
                        {OPAMP_MODELS.map(model => (
                            <option key={model} value={model}>{model}</option>
                        ))}
                    </select>
                    <div style={{fontSize: 11, color: theme.uiText, opacity: 0.7, marginTop: 5}}>
                        Pins: + (top-left), − (bottom-left), Out (right)<br/>
                        {selectedComponent.value === 'IDEAL_OPAMP' && 'Ideal: Parametric Model'}
                    </div>

                    {/* Parametric inputs for IDEAL_OPAMP */}
                    {selectedComponent.value === 'IDEAL_OPAMP' && (
                        <div style={{marginTop: 10, padding: 5, border: `1px dashed ${theme.border}`, borderRadius: 4}}>
                            <div style={{fontSize: 11, fontWeight: 'bold', marginBottom: 5}}>Op-Amp Parameters</div>
                            
                            <label style={{display:'block', fontSize: 12, marginBottom: 4}}>
                                Aol - Open Loop Gain
                            </label>
                            <input
                                type="number"
                                min="1"
                                step="1000"
                                value={selectedComponent.aol ?? 100000}
                                onChange={(e) => updateComponent(selectedComponent.id, { aol: parseFloat(e.target.value) || 100000 })}
                                style={{
                                    width: '100%', 
                                    padding: 5, 
                                    background: theme.inputBg, 
                                    color: theme.uiText, 
                                    border: `1px solid ${theme.border}`,
                                    borderRadius: 4,
                                    marginBottom: 8
                                }}
                            />

                            <label style={{display:'block', fontSize: 12, marginBottom: 4}}>
                                Zin - Input Impedance (Ω)
                            </label>
                            <input
                                type="text"
                                value={selectedComponent.zin ?? "10000000"}
                                onChange={(e) => updateComponent(selectedComponent.id, { zin: e.target.value })}
                                placeholder="e.g. 10Meg"
                                style={{
                                    width: '100%', 
                                    padding: 5, 
                                    background: theme.inputBg, 
                                    color: theme.uiText, 
                                    border: `1px solid ${theme.border}`,
                                    borderRadius: 4,
                                    marginBottom: 8
                                }}
                            />
                            
                            <label style={{display:'block', fontSize: 12, marginBottom: 4}}>
                                Zout - Output Impedance (Ω)
                            </label>
                            <input
                                type="text"
                                value={selectedComponent.zout ?? "0"}
                                onChange={(e) => updateComponent(selectedComponent.id, { zout: e.target.value })}
                                placeholder="e.g. 75"
                                style={{
                                    width: '100%', 
                                    padding: 5, 
                                    background: theme.inputBg, 
                                    color: theme.uiText, 
                                    border: `1px solid ${theme.border}`,
                                    borderRadius: 4
                                }}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Regular value input for non-transistor, non-opamp components */}
            {!isTransistor && !isOpamp && (
                <div style={{marginBottom: 10}}>
                    <label style={{display:'block', fontSize: 12, marginBottom: 4}}>
                        Value ({getUnitLabel(selectedComponent.type)})
                    </label>
                    <input 
                        value={selectedComponent.value} 
                        onChange={(e) => updateComponent(selectedComponent.id, { value: e.target.value })}
                        placeholder={getPlaceholder(selectedComponent.type)}
                        style={{width: '100%', padding: 5, background: theme.inputBg, color: theme.uiText, border: `1px solid ${theme.border}`}} 
                    />
                    <div style={{fontSize: 10, color: theme.uiText, opacity: 0.7, marginTop: 4, lineHeight: '1.4'}}>
                        <strong>Units:</strong><br/>
                        p = pico, n = nano, u = micro<br/>
                        m = milli, k = kilo, MEG = mega<br/>
                        G = giga, T = tera<br/>
                        <em>(Note: M is usually milli in SPICE, use MEG for mega)</em>
                    </div>
                </div>
            )}
            
            {/* Help text for AC source */}
            {selectedComponent.type === 'acsource' && (
                <div style={{fontSize: 11, color: theme.uiText, opacity: 0.7, marginTop: -5}}>
                    Format: amplitude frequency<br/>
                    Example: 5 1k = 5V @ 1kHz
                </div>
            )}
        </div>
    );
}