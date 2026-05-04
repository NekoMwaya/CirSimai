import React, { useRef, useEffect, useState } from 'react';
import { Group, Rect } from 'react-konva';
import { Html } from 'react-konva-utils';
import { WokwiPinRegistry } from '../../utils/wokwiPinRegistry';
import { getWokwiComponentDefinition } from '../../utils/wokwiComponentCatalog';
import '@wokwi/elements';

// We now render hitboxes as HTML elements so they sit visually ON TOP of the Wokwi SVG.
const renderHtmlHitboxes = (pins, onPinClick) => {
  if (!pins) return null;
  
  return Object.entries(pins).map(([pinId, pinData]) => {
    const w = pinData.width || 10;
    const h = pinData.height || 10;
    return (
      <div
        key={pinId}
        title={`Pin: ${pinData.name}`}
        onClick={(e) => {
          // Prevent drag from starting when clicking a pin
          e.stopPropagation();
          onPinClick(pinId, pinData);
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = 'rgba(24, 144, 255, 0.8)';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = 'rgba(255, 0, 0, 0.4)';
        }}
        style={{
          position: 'absolute',
          left: pinData.x - w / 2,
          top: pinData.y - h / 2,
          width: w,
          height: h,
          backgroundColor: 'rgba(255, 0, 0, 0.4)', // Semi-transparent red for debugging
          border: '1px solid white',
          borderRadius: '50%',
          cursor: 'crosshair',
          pointerEvents: 'auto',
          zIndex: 10
        }}
      />
    );
  });
};

const useDynamicPins = (ref, componentType) => {
  const [pins, setPins] = useState({});

  useEffect(() => {
    let timeout;

    const extract = () => {
      const el = ref.current;
      if (!el || !el.shadowRoot) return;

      const newPins = {};
      const elements = el.shadowRoot.querySelectorAll('[id*="pin" i], [data-part*="pin" i], [id*="header" i] > *');
      const hostRect = el.getBoundingClientRect();
      
      if (hostRect.width === 0 || hostRect.height === 0) return;

      const scaleX = el.offsetWidth / hostRect.width;
      const scaleY = el.offsetHeight / hostRect.height;

      let found = false;

      elements.forEach(node => {
        const rect = node.getBoundingClientRect();
        if (rect.width > 30 || rect.height > 30 || rect.width < 1 || rect.height < 1) return;

        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const localX = (centerX - hostRect.left) * scaleX;
        const localY = (centerY - hostRect.top) * scaleY;

        const pinId = node.id || node.getAttribute('data-part') || `pin-${Math.random().toString(36).substr(2, 5)}`;
        if (pinId.toLowerCase().includes('pattern') || pinId === 'pins' || pinId === 'pin') return;

        newPins[pinId] = {
          x: localX,
          y: localY,
          name: pinId.replace(/pin-?/i, '').replace(/header-?/i, '') || pinId
        };
        found = true;
      });

      if (found) {
        setPins(newPins);
      } else {
        const meta = WokwiPinRegistry[componentType];
        if (meta) setPins(meta.pins);
      }
    };

    const attemptExtraction = (attempts = 0) => {
      if (attempts > 10) {
        const meta = WokwiPinRegistry[componentType];
        if (meta) setPins(meta.pins);
        return;
      }
      
      const el = ref.current;
      if (el && el.shadowRoot && el.shadowRoot.querySelector('svg')) {
        extract();
      } else {
        timeout = setTimeout(() => attemptExtraction(attempts + 1), 200);
      }
    };

    attemptExtraction();

    return () => clearTimeout(timeout);
  }, [ref, componentType]);

  return pins;
};

const getComponentBounds = (type) => {
  const registry = WokwiPinRegistry[type];
  if (registry) {
    return { width: registry.width, height: registry.height, x: registry.hitboxX || 0, y: registry.hitboxY || 0 };
  }

  return { width: 140, height: 100, x: 0, y: 0 };
};

export const WokwiComponent = ({ type, x, y, rotation = 0, color, lit, onPinClick, onDragEnd, onPinsChange, onSelect, onDelete, onRotate, selected = false }) => {
  const ref = useRef(null);
  const onPinsChangeRef = useRef(onPinsChange);
  const pins = useDynamicPins(ref, type);
  const definition = getWokwiComponentDefinition(type);
  const bounds = getComponentBounds(type);
  const elementProps = {
    ref,
    ...(definition?.defaultProps ?? {}),
    ...(color ? { color } : {}),
  };

  useEffect(() => {
    if (ref.current && typeof lit !== 'undefined') {
      ref.current.value = lit;
    }
  }, [lit]);

  useEffect(() => {
    onPinsChangeRef.current = onPinsChange;
  }, [onPinsChange]);

  useEffect(() => {
    if (onPinsChangeRef.current) {
      onPinsChangeRef.current(pins);
    }
  }, [pins]);

  return (
    <Group x={x} y={y} rotation={rotation} draggable onDragEnd={onDragEnd}>
      <Rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        fill="rgba(0, 0, 0, 0.01)" // Need some fill to trigger hit detection
        stroke={selected ? '#1890ff' : undefined}
        strokeWidth={selected ? 1 : 0}
        onClick={onSelect}
        onTap={onSelect}
      />
      <Html transform divProps={{ style: { pointerEvents: 'none' } }}>
        <div style={{ position: 'relative', display: 'inline-block', pointerEvents: 'none' }}>
          <div style={{ pointerEvents: 'none' }}>
            {React.createElement(type, elementProps)}
          </div>
          {renderHtmlHitboxes(pins, onPinClick)}
          {selected && (onDelete || onRotate) && (
            <div style={{ position: 'absolute', top: '-14px', right: '-14px', display: 'flex', gap: '4px', pointerEvents: 'auto', zIndex: 20 }}>
              {onRotate && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRotate();
                  }}
                  title="Rotate"
                  style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1px solid #4b5563', background: '#f59e0b', color: '#111827', cursor: 'pointer', fontSize: '12px', lineHeight: 1 }}
                >
                  R
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete();
                  }}
                  title="Delete"
                  style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1px solid #4b5563', background: '#ef4444', color: 'white', cursor: 'pointer', fontSize: '12px', lineHeight: 1 }}
                >
                  x
                </button>
              )}
            </div>
          )}
          {renderHtmlHitboxes(pins, onPinClick)}
        </div>
      </Html>
    </Group>
  );
};

export const WokwiArduino = ({ x, y, rotation, onPinClick, onDragEnd }) => {
  return <WokwiComponent type="wokwi-arduino-uno" x={x} y={y} rotation={rotation} onPinClick={onPinClick} onDragEnd={onDragEnd} />;
};

export const WokwiLED = ({ x, y, rotation, color = "red", lit = false, onPinClick, onDragEnd }) => {
  return <WokwiComponent type="wokwi-led" x={x} y={y} rotation={rotation} color={color} lit={lit} onPinClick={onPinClick} onDragEnd={onDragEnd} />;
};

export const WokwiBreadboard = ({ x, y, rotation, onPinClick, onDragEnd }) => {
  return <WokwiComponent type="wokwi-breadboard" x={x} y={y} rotation={rotation} onPinClick={onPinClick} onDragEnd={onDragEnd} />;
};
