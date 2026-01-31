import React from 'react';
import { useCircuit } from '../context/CircuitContext';

// BJT model options
const NPN_MODELS = ['2N2222', '2N3904'];
const PNP_MODELS = ['2N2907', '2N3906'];

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
            case 'bjt_pnp': return 'Model';
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

    const isBjt = selectedComponent.type === 'bjt_npn' || selectedComponent.type === 'bjt_pnp';

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
                    value={selectedComponent.label} 
                    disabled
                    style={{width: '100%', padding: 5, background: theme.btnBg, color: theme.uiText, border: `1px solid ${theme.border}`}} 
                />
            </div>
            
            {/* BJT Model Dropdown */}
            {isBjt ? (
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
                </div>
            ) : (
                /* Regular value input for other components */
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