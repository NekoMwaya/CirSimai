import React, { useRef, useEffect } from 'react';
import { Group } from 'react-konva';
import { Html } from 'react-konva-utils';
import '@wokwi/elements';

export const WokwiArduino = ({ x, y, rotation }) => {
  return (
    <Group x={x} y={y} rotation={rotation} draggable>
      <Html transform>
        <div style={{ pointerEvents: 'auto' }}>
          <wokwi-arduino-uno></wokwi-arduino-uno>
        </div>
      </Html>
    </Group>
  );
};

export const WokwiLED = ({ x, y, rotation, color = "red", lit = false }) => {
  const ledRef = useRef(null);

  useEffect(() => {
    // Wokwi elements respond well to setting the value property
    if (ledRef.current) {
      if (lit) {
        ledRef.current.setAttribute('value', '1');
      } else {
        ledRef.current.removeAttribute('value');
      }
    }
  }, [lit]);

  return (
    <Group x={x} y={y} rotation={rotation} draggable>
      <Html transform>
        <div style={{ pointerEvents: 'auto' }}>
          <wokwi-led color={color} ref={ledRef}></wokwi-led>
        </div>
      </Html>
    </Group>
  );
};
