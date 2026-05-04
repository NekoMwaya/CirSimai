import React, { useState } from 'react';
import '@wokwi/elements';
import { WOKWI_COMPONENT_CATALOG } from '../utils/wokwiComponentCatalog';
import { WokwiPinRegistry } from '../utils/wokwiPinRegistry';

const INITIAL_LED_PINS = {
  'anode': { x: 20, y: 75, name: 'A', width: 10, height: 10 },
  'cathode': { x: 10, y: 75, name: 'C', width: 10, height: 10 }
};

const INITIAL_BREADBOARD_PINS = {
  'power_plus': { x: 20, y: 15, name: '+', width: 10, height: 10 },
  'power_minus': { x: 20, y: 35, name: '-', width: 10, height: 10 },
};

const getInitialPinsForType = (type) => {
  const registryPins = WokwiPinRegistry[type]?.pins;
  if (registryPins) {
    return registryPins;
  }

  if (type === 'wokwi-led') return INITIAL_LED_PINS;
  if (type === 'wokwi-breadboard') return INITIAL_BREADBOARD_PINS;
  return {};
};

export default function EmbeddedTest() {
  const [selectedType, setSelectedType] = useState('wokwi-arduino-uno');
  const [pins, setPins] = useState(() => getInitialPinsForType('wokwi-arduino-uno'));
  const [hitbox, setHitbox] = useState(() => {
    const reg = WokwiPinRegistry['wokwi-arduino-uno'];
    return {
      x: reg?.hitboxX || 0,
      y: reg?.hitboxY || 0,
      width: reg?.width || 140,
      height: reg?.height || 100
    };
  });
  const [draggingPins, setDraggingPins] = useState([]);
  const [selectedPins, setSelectedPins] = useState([]);
  const [exportData, setExportData] = useState('');
  const [scale, setScale] = useState(1);
  const [bulkSize, setBulkSize] = useState({ width: 10, height: 10 });

  const handleComponentSelect = (type) => {
    setSelectedType(type);
    setPins(getInitialPinsForType(type));
    const reg = WokwiPinRegistry[type];
    setHitbox({
      x: reg?.hitboxX || 0,
      y: reg?.hitboxY || 0,
      width: reg?.width || 140,
      height: reg?.height || 100
    });
    setExportData('');
  };

  const componentOptions = WOKWI_COMPONENT_CATALOG;

  const handleMouseMove = (e) => {
    if (draggingPins.length === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / scale);
    const y = Math.round((e.clientY - rect.top) / scale);

    // Calculate delta from the primary dragging pin
    const primaryPin = draggingPins[0];
    const dx = x - pins[primaryPin].x;
    const dy = y - pins[primaryPin].y;

    setPins((prevPins) => {
      const nextPins = { ...prevPins };
      for (const pin of draggingPins) {
        nextPins[pin] = {
          ...nextPins[pin],
          x: nextPins[pin].x + dx,
          y: nextPins[pin].y + dy,
        };
      }
      return nextPins;
    });
  };

  const handleMouseUp = () => {
    setDraggingPins([]);
  };

  const handlePinClick = (e, pinKey) => {
    e.stopPropagation();
    if (e.shiftKey) {
      setSelectedPins(prev => prev.includes(pinKey) ? prev.filter(p => p !== pinKey) : [...prev, pinKey]);
    } else {
      setSelectedPins([pinKey]);
    }
  };

  const handleApplyBulkSize = () => {
    if (selectedPins.length === 0) return;
    setPins((prevPins) => {
      const nextPins = { ...prevPins };
      for (const pin of selectedPins) {
        nextPins[pin] = {
          ...nextPins[pin],
          width: bulkSize.width,
          height: bulkSize.height,
        };
      }
      return nextPins;
    });
  };

  const handleAddPin = () => {
    const pinName = prompt('Enter pin name:');
    if (!pinName) return;
    const pinKey = pinName.toUpperCase().replace(/\s+/g, '_');
    setPins((prevPins) => ({
      ...prevPins,
      [pinKey]: { x: 50, y: 50, name: pinName, width: 10, height: 10 },
    }));
  };

  const handleRemovePin = (pinKey) => {
    setPins((prevPins) => {
      const copy = { ...prevPins };
      delete copy[pinKey];
      return copy;
    });
  };

  const handlePinPropChange = (pinKey, prop, val) => {
    setPins((prevPins) => ({
      ...prevPins,
      [pinKey]: {
        ...prevPins[pinKey],
        [prop]: parseInt(val) || 0,
      },
    }));
  };

  const handleExport = () => {
    const formattedData = `"${selectedType}": {\n  width: ${hitbox.width},\n  height: ${hitbox.height},\n  hitboxX: ${hitbox.x},\n  hitboxY: ${hitbox.y},\n  pins: {\n${Object.entries(pins)
      .map(([key, data]) => `    "${key}": { x: ${data.x}, y: ${data.y}, width: ${data.width || 10}, height: ${data.height || 10}, name: "${data.name}" }`)
      .join(',\n')}\n  }\n}`;
    setExportData(formattedData);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#1e1e24', color: '#f5f5f7' }}>
      {/* Left Sidebar */}
      <div style={{ width: '420px', padding: '20px', backgroundColor: '#111215', borderRight: '1px solid #2d2f34', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <h2 style={{ margin: '0 0 15px 0', color: '#38bdf8' }}>Pin Calibration</h2>
        
        <label style={{ fontWeight: 'bold', marginBottom: '8px' }}>Select Component</label>
        <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #2d2f34', borderRadius: '8px', marginBottom: '20px', backgroundColor: '#1a1b1f' }}>
          {componentOptions.map((component) => (
            <button
              key={component.type}
              onClick={() => handleComponentSelect(component.type)}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                backgroundColor: selectedType === component.type ? '#0f172a' : 'transparent',
                border: 'none',
                borderBottom: '1px solid #2d2f34',
                color: '#fff',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span>{component.label}</span>
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>{component.category}</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
          <button onClick={handleAddPin} style={{ padding: '8px 12px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Add Custom Pin</button>
          <button onClick={handleExport} style={{ padding: '8px 12px', backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Export Data</button>
        </div>

        {selectedPins.length > 0 && (
          <div style={{ marginBottom: '15px', backgroundColor: '#1e293b', padding: '10px', border: '1px solid #3b82f6', borderRadius: '6px' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px', color: '#60a5fa' }}>Bulk Edit Pins ({selectedPins.length} selected)</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>W:</span>
              <input type="number" value={bulkSize.width} onChange={(e) => setBulkSize(b => ({ ...b, width: parseInt(e.target.value) || 10 }))} style={{ flex: 1, padding: '3px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '3px' }} />
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>H:</span>
              <input type="number" value={bulkSize.height} onChange={(e) => setBulkSize(b => ({ ...b, height: parseInt(e.target.value) || 10 }))} style={{ flex: 1, padding: '3px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '3px' }} />
              <button onClick={handleApplyBulkSize} style={{ padding: '4px 8px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Apply</button>
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '6px' }}>Shift-click pins to select multiple, then drag them together!</div>
          </div>
        )}

        <div style={{ marginBottom: '15px', backgroundColor: '#1a1b1f', padding: '10px', border: '1px solid #2d2f34', borderRadius: '6px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Zoom Controls (Scale: {Math.round(scale * 100)}%)</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setScale(s => Math.min(s + 0.1, 3))} style={{ flex: 1, padding: '6px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Zoom In</button>
            <button onClick={() => setScale(s => Math.max(s - 0.1, 0.2))} style={{ flex: 1, padding: '6px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Zoom Out</button>
            <button onClick={() => setScale(1)} style={{ flex: 1, padding: '6px', backgroundColor: '#475569', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Reset</button>
          </div>
        </div>

        <h4 style={{ margin: '15px 0 10px 0' }}>Current Pin List & Sizes</h4>
        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #2d2f34', borderRadius: '6px', padding: '10px', backgroundColor: '#1a1b1f', marginBottom: '15px' }}>
          {Object.entries(pins).map(([pinKey, data]) => (
            <div key={pinKey} style={{ marginBottom: '12px', padding: '8px', borderBottom: '1px solid #2d2f34', backgroundColor: selectedPins.includes(pinKey) ? 'rgba(59, 130, 246, 0.2)' : 'transparent' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <strong style={{ color: '#38bdf8' }}>{data.name}</strong>
                <button onClick={() => handleRemovePin(pinKey)} style={{ backgroundColor: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>W:</span>
                <input 
                  type="number" 
                  value={data.width || 10} 
                  onChange={(e) => handlePinPropChange(pinKey, 'width', e.target.value)}
                  style={{ width: '45px', padding: '3px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff', borderRadius: '3px', fontSize: '12px' }} 
                />
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>H:</span>
                <input 
                  type="number" 
                  value={data.height || 10} 
                  onChange={(e) => handlePinPropChange(pinKey, 'height', e.target.value)}
                  style={{ width: '45px', padding: '3px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff', borderRadius: '3px', fontSize: '12px' }} 
                />
                <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: 'auto' }}>X: {data.x}, Y: {data.y}</span>
              </div>
            </div>
          ))}
        </div>

        <h4 style={{ margin: '15px 0 10px 0' }}>Component Hitbox</h4>
        <div style={{ padding: '10px', backgroundColor: '#1a1b1f', border: '1px solid #2d2f34', borderRadius: '6px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', width: '20px' }}>X:</span>
            <input type="number" value={hitbox.x} onChange={(e) => setHitbox(h => ({ ...h, x: parseInt(e.target.value) || 0 }))} style={{ flex: 1, padding: '3px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '3px' }} />
            <span style={{ fontSize: '11px', color: '#94a3b8', width: '20px' }}>Y:</span>
            <input type="number" value={hitbox.y} onChange={(e) => setHitbox(h => ({ ...h, y: parseInt(e.target.value) || 0 }))} style={{ flex: 1, padding: '3px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '3px' }} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', width: '20px' }}>W:</span>
            <input type="number" value={hitbox.width} onChange={(e) => setHitbox(h => ({ ...h, width: parseInt(e.target.value) || 0 }))} style={{ flex: 1, padding: '3px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '3px' }} />
            <span style={{ fontSize: '11px', color: '#94a3b8', width: '20px' }}>H:</span>
            <input type="number" value={hitbox.height} onChange={(e) => setHitbox(h => ({ ...h, height: parseInt(e.target.value) || 0 }))} style={{ flex: 1, padding: '3px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '3px' }} />
          </div>
        </div>

        {exportData && (
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#22c55e' }}>Export Output</h4>
            <textarea 
              readOnly 
              value={exportData} 
              style={{ width: '100%', height: '140px', backgroundColor: '#0f172a', color: '#38bdf8', border: '1px solid #334155', borderRadius: '4px', padding: '10px', fontFamily: 'monospace', fontSize: '11px' }} 
            />
            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Copy-paste this into your <code>wokwiPinRegistry.js</code> file.</p>
          </div>
        )}
      </div>

      {/* Right Canvas / Work Area */}
      <div style={{ flex: 1, padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto' }}>
        <div 
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{ 
            position: 'relative', 
            display: 'inline-block', 
            padding: '40px', 
            backgroundColor: '#111215', 
            border: '2px dashed #334155', 
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
            userSelect: 'none',
            transform: `scale(${scale})`,
            transformOrigin: 'center'
          }}
        >
          {/* Base Wokwi Web Component Container */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            {/* Component Hitbox Visualization */}
            <div style={{
              position: 'absolute',
              left: hitbox.x,
              top: hitbox.y,
              width: hitbox.width,
              height: hitbox.height,
              border: '2px solid rgba(56, 189, 248, 0.8)',
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              zIndex: 5,
              pointerEvents: 'none'
            }} />
            
            {React.createElement(selectedType)}

            {/* Draggable Pins */}
            {Object.entries(pins).map(([pinKey, data]) => {
              const pinW = data.width || 10;
              const pinH = data.height || 10;
              return (
                <div
                  key={pinKey}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    if (selectedPins.includes(pinKey)) {
                      setDraggingPins(selectedPins);
                    } else {
                      if (e.shiftKey) {
                        setDraggingPins([...selectedPins, pinKey]);
                        setSelectedPins([...selectedPins, pinKey]);
                      } else {
                        setDraggingPins([pinKey]);
                        setSelectedPins([pinKey]);
                      }
                    }
                  }}
                  onClick={(e) => handlePinClick(e, pinKey)}
                  title={`${data.name} (Shift-click to select multiple)`}
                  style={{
                    position: 'absolute',
                    left: data.x - pinW / 2,
                    top: data.y - pinH / 2,
                    width: `${pinW}px`,
                    height: `${pinH}px`,
                    backgroundColor: draggingPins.includes(pinKey) ? '#22c55e' : selectedPins.includes(pinKey) ? '#3b82f6' : '#ef4444',
                    border: selectedPins.includes(pinKey) ? '2px solid #fff' : '1px solid rgba(255,255,255,0.5)',
                    borderRadius: '50%',
                    cursor: 'move',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 5px rgba(0,0,0,0.8)',
                    zIndex: draggingPins.includes(pinKey) ? 1000 : 10
                  }}
                >
                  <span style={{ position: 'absolute', top: `${pinH + 3}px`, backgroundColor: '#0f172a', padding: '1px 4px', fontSize: '10px', borderRadius: '3px', color: '#fff', whiteSpace: 'nowrap' }}>
                    {data.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
