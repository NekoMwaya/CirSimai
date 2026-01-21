import React from 'react';
import { useCircuit } from '../context/CircuitContext';

export default function PropertiesPanel() {
    const { components, updateComponent, selectedIds, theme } = useCircuit();
    
    // Find the single selected component
    const selectedComponent = components.find(c => selectedIds.length === 1 && c.id === selectedIds[0]);

    if (!selectedComponent) return null;

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
            
            <div style={{marginBottom: 10}}>
                <label style={{display:'block', fontSize: 12, marginBottom: 4}}>
                    Value ({selectedComponent.type === 'resistor' ? 'Ω' : 'V'})
                </label>
                <input 
                    value={selectedComponent.value} 
                    onChange={(e) => updateComponent(selectedComponent.id, { value: e.target.value })}
                    style={{width: '100%', padding: 5, background: theme.inputBg, color: theme.uiText, border: `1px solid ${theme.border}`}} 
                />
            </div>
        </div>
    );
}