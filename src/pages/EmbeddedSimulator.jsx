import React from 'react';
import { Link } from 'react-router-dom';

export default function EmbeddedSimulator() {
  return (
    <div style={{
      width: '100vw', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center', 
      background: '#0a0a0a', 
      color: 'white', 
      fontFamily: 'Inter, sans-serif',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem', background: 'linear-gradient(90deg, #1890ff, #52c41a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Embedded System Simulator
      </h1>
      <p style={{ fontSize: '1.2rem', color: '#888', marginBottom: '2rem' }}>
        This is the embedded system simulator page.
      </p>
      <Link to="/" style={{ 
        padding: '12px 24px', 
        background: '#1890ff', 
        color: 'white', 
        textDecoration: 'none', 
        borderRadius: '8px', 
        fontWeight: 'bold',
        transition: 'transform 0.2s',
      }}>
        Return to Home
      </Link>
    </div>
  );
}
