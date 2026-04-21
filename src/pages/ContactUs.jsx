import React from 'react';
import Header from '../components/Header';
import { Zap, Activity, Cpu } from 'lucide-react';
import circuitBg from '../assets/circuit-bg.jpg';

export default function ContactUs() {
  const inputStyle = {
      width: '100%',
      padding: '12px 16px',
      background: 'rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '8px',
      color: '#fff',
      fontSize: '15px',
      marginTop: '8px',
      fontFamily: 'Inter, sans-serif'
  };

  const labelStyle = {
      fontSize: '13px',
      fontWeight: '600',
      color: '#cbd5e1'
  };

  return (
    <div style={{ minHeight: '100vh', background: '#020617', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <Header />
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundImage: `url(${circuitBg})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.15, zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, paddingTop: '150px', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '60px', padding: '150px 24px 80px' }}>
          
        {/* Left Col */}
        <div style={{ flex: '1', minWidth: '300px' }}>
            <h1 style={{ fontSize: 'Clamp(48px, 6vw, 72px)', fontWeight: '800', lineHeight: '1.1', marginBottom: '24px' }}>
                Contact our<br/>sales team
            </h1>
            <p style={{ fontSize: '18px', color: '#94a3b8', lineHeight: '1.6', marginBottom: '60px', maxWidth: '400px' }}>
                Watch CirSimAI in action with your own live demo, and learn how your team can design and build hardware topologies faster than ever before with AI.
            </p>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#64748b', marginBottom: '24px' }}>
                Used by leading brands and companies across the globe
            </div>
            <div style={{ display: 'flex', gap: '24px', opacity: 0.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '20px' }}>
                    <Zap size={24} /> Nvidia
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '20px' }}>
                    <Activity size={24} /> Intel
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '20px' }}>
                    <Cpu size={24} /> AMD
                </div>
            </div>
        </div>

        {/* Right Col */}
        <div style={{ flex: '1', minWidth: '400px', background: '#0f172a', padding: '40px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                    <label style={labelStyle}>Full Name</label>
                    <input style={inputStyle} placeholder="John" />
                </div>
                <div>
                    <label style={labelStyle}>Last Name</label>
                    <input style={inputStyle} placeholder="Smith" />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                    <label style={labelStyle}>Phone</label>
                    <input style={inputStyle} placeholder="+1234567890" />
                </div>
                <div>
                    <label style={labelStyle}>Job Title</label>
                    <input style={inputStyle} placeholder="CEO" />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                    <label style={labelStyle}>Company</label>
                    <input style={inputStyle} placeholder="Acme Corp" />
                </div>
                <div>
                    <label style={labelStyle}>Country</label>
                    <input style={inputStyle} placeholder="United States" />
                </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Company Email</label>
                <input style={inputStyle} placeholder="john@acme.com" />
            </div>

            <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Expected Number of Users</label>
                <select style={{...inputStyle, appearance: 'none', cursor: 'pointer'}}>
                    <option>Select...</option>
                    <option>1-10</option>
                    <option>11-50</option>
                    <option>51-200</option>
                </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Subject</label>
                <select style={{...inputStyle, appearance: 'none', cursor: 'pointer'}}>
                    <option>Select...</option>
                    <option>General Inquiry</option>
                    <option>Enterprise Plan</option>
                </select>
            </div>

            <div style={{ marginBottom: '30px' }}>
                <label style={labelStyle}>Message</label>
                <textarea style={{...inputStyle, minHeight: '120px', resize: 'vertical'}} placeholder="What can we help you with?"></textarea>
            </div>

            <button style={{
                width: '100%',
                background: 'linear-gradient(90deg, #c2a8f7, #5ce1e6)',
                color: '#000', border: 'none', padding: '16px',
                borderRadius: '8px', fontSize: '16px', fontWeight: '700',
                cursor: 'pointer'
            }}>
                Submit
            </button>
        </div>

      </div>
    </div>
  );
}
