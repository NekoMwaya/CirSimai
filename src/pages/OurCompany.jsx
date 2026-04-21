import React from 'react';
import Header from '../components/Header';

export default function OurCompany() {
  return (
    <div style={{ minHeight: '100vh', background: '#020617', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <Header />
      <div style={{ paddingTop: '150px', maxWidth: '800px', margin: '0 auto', textAlign: 'center', padding: '150px 24px 80px' }}>
        <h1 style={{ fontSize: '48px', fontWeight: '800', marginBottom: '24px', background: 'linear-gradient(90deg, #c2a8f7, #5ce1e6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Our Company
        </h1>
        <p style={{ fontSize: '20px', color: '#94a3b8', lineHeight: '1.6', marginBottom: '40px' }}>
          At CirSimAI, we believe that the future of engineering starts with giving intelligence spatial awareness. Founded by automation engineers passionate about bridging the AI capability gap.
        </p>
      </div>
    </div>
  );
}
