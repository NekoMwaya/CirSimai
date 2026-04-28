import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

/**
 * FeatureCard Component
 * Implements the "Spotlight" hover effect and glassmorphism styling seen on uprev.id
 */
const FeatureCard = ({ title, description, children, accentColor = '#5ce1e6', className = '' }) => {
  const cardRef = useRef(null);
  
  // Motion values for the spotlight position
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs for the spotlight movement
  const spotlightX = useSpring(mouseX, { stiffness: 150, damping: 20 });
  const spotlightY = useSpring(mouseY, { stiffness: 150, damping: 20 });

  function handleMouseMove({ currentTarget, clientX, clientY }) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  // Create the radial gradient background that follows the mouse
  const spotlightBackground = useTransform(
    [spotlightX, spotlightY],
    ([x, y]) => `radial-gradient(650px circle at ${x}px ${y}px, ${accentColor}15, transparent 80%)`
  );

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.5 }}
      style={{
        position: 'relative',
        background: 'linear-gradient(#0f172a, #0f172a) padding-box, linear-gradient(180deg, #c2a8f7, #5ce1e6) border-box',
        border: '2px solid transparent',
        borderRadius: '24px',
        padding: '32px',
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'default',
        backdropFilter: 'blur(8px)'
      }}
      className={className}
    >
      {/* The Spotlight Layer */}
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          background: spotlightBackground,
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      {/* Content Layer */}
      <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ 
          fontSize: '24px', 
          fontWeight: '700', 
          marginBottom: '12px', 
          color: '#fff',
          letterSpacing: '-0.5px'
        }}>
          {title}
        </h3>
        
        <p style={{ 
          fontSize: '16px', 
          color: '#94a3b8', 
          lineHeight: '1.6',
          marginBottom: '32px',
          maxWidth: '90%'
        }}>
          {description}
        </p>

        {/* This is where the custom animations/illustrations go */}
        <div style={{ 
          marginTop: 'auto', 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: '200px'
        }}>
          {children}
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Example: FlowingLinesAnimation
 * Replicates the "Intelligent AI CS" card visual
 */
export const FlowingLinesAnimation = ({ color = '#5ce1e6' }) => {
  return (
    <div style={{ position: 'relative', width: '100%', height: '180px' }}>
      <svg width="100%" height="100%" viewBox="0 0 400 200" fill="none">
        {/* Nodes */}
        <circle cx="50" cy="50" r="4" fill="#334155" />
        <circle cx="50" cy="150" r="4" fill="#334155" />
        <circle cx="350" cy="50" r="4" fill="#334155" />
        <circle cx="350" cy="150" r="4" fill="#334155" />

        {/* Central AI Node */}
        <motion.rect 
          x="185" y="85" width="30" height="30" rx="6" 
          stroke={color} strokeWidth="1" fill="rgba(0,0,0,0.5)"
          animate={{ rotate: 45, scale: [1, 1.1, 1] }}
          transition={{ duration: 4, repeat: Infinity }}
        />

        {/* Flowing Paths */}
        <FlowingPath d="M50 50 Q 150 50 185 100" color={color} />
        <FlowingPath d="M50 150 Q 150 150 185 100" color={color} />
        <FlowingPath d="M350 50 Q 250 50 215 100" color={color} />
        <FlowingPath d="M350 150 Q 250 150 215 100" color={color} />
      </svg>
    </div>
  );
};

const FlowingPath = ({ d, color }) => (
  <g>
    <path d={d} stroke="rgba(255,255,255,0.05)" strokeWidth="1" fill="none" />
    <motion.path
      d={d}
      stroke={color}
      strokeWidth="1.5"
      fill="none"
      initial={{ pathLength: 0, pathOffset: 0 }}
      animate={{ 
        pathLength: [0, 0.2, 0],
        pathOffset: [0, 1] 
      }}
      transition={{ 
        duration: 3, 
        repeat: Infinity, 
        ease: "linear",
        delay: Math.random() * 2 
      }}
    />
  </g>
);

export default FeatureCard;
