import React from 'react';
import { motion } from 'framer-motion';

/**
 * DemoBrowser Component
 * Mimics a macOS/Chrome window with an ambient glow effect
 */
const DemoBrowser = ({ videoSrc, accentColor = '#5ce1e6' }) => {
  return (
    <div style={{ position: 'relative', padding: '20px', width: '100%', maxWidth: '1600px', margin: '0 auto' }}>
      
      {/* 1. Ambient Background Glow */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90%',
        height: '70%',
        background: `radial-gradient(circle, ${accentColor}33 0%, transparent 70%)`,
        filter: 'blur(100px)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      {/* 2. The Browser Window */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        style={{
          position: 'relative',
          zIndex: 1,
          background: '#1e293b',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden'
        }}
      >
        {/* Browser Header / Toolbar */}
        <div style={{
          height: '48px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          gap: '10px'
        }}>
          {/* Traffic Light Dots */}
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f56' }} />
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffbd2e' }} />
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#27c93f' }} />
          
          {/* Mock URL bar */}
          <div style={{
            marginLeft: '24px',
            flex: 1,
            height: '28px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            fontSize: '12px',
            color: '#94a3b8',
            maxWidth: '500px'
          }}>
            cirsim.ai/demo
          </div>
        </div>

        {/* 3. The Actual Video */}
        <div style={{ position: 'relative', width: '100%', aspectRatio: '21/9', background: '#000' }}>
          {videoSrc ? (
            <video
              src={videoSrc}
              autoPlay
              muted
              loop
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            <div style={{ 
              width: '100%', 
              height: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: '#475569',
              background: 'linear-gradient(45deg, #0f172a, #1e293b)'
            }}>
              Video Loop Placeholder
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default DemoBrowser;
