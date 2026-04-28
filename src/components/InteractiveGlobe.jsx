import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

/**
 * InteractiveGlobe Component
 * Creates a 3D dotted globe foundation using React Three Fiber.
 */

const DottedGlobe = ({ dotColor = '#5ce1e6' }) => {
  const meshRef = useRef();

  const { positions, sizes } = useMemo(() => {
    const count = 8000;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Golden ratio distribution for a uniform sphere
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;

      const x = Math.cos(theta) * Math.sin(phi) * 2;
      const y = Math.sin(theta) * Math.sin(phi) * 2;
      const z = Math.cos(phi) * 2;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      sizes[i] = Math.random() * 0.02;
    }
    return { positions, sizes };
  }, []);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.0015;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.025}
        color={dotColor}
        transparent
        opacity={0.7}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

const InteractiveGlobe = ({ color = '#5ce1e6', height = '500px' }) => {
  return (
    <div style={{ width: '100%', height: height, cursor: 'grab' }}>
      <Suspense fallback={<div style={{ color: '#64748b', textAlign: 'center', paddingTop: '200px' }}>Loading Sphere...</div>}>
        <Canvas camera={{ position: [0, 0, 10], fov: 25 }} style={{ overflow: 'visible' }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />

          <DottedGlobe dotColor={color} />

          <OrbitControls
            enableZoom={false}
            autoRotate
            autoRotateSpeed={0.5}
            enablePan={false}
          />

          <Stars radius={100} depth={50} count={500} factor={4} saturation={0} fade speed={1} />
        </Canvas>
      </Suspense>
    </div>
  );
};

export default InteractiveGlobe;
