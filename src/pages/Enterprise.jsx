import React from 'react';
import Header from '../components/Header';
import { ArrowRight, Mail, Zap, Smartphone, Monitor, Activity } from 'lucide-react';
import circuitBg from '../assets/circuit-bg.jpg';

export default function Enterprise() {
  return (
    <div style={{ minHeight: '100vh', background: '#020617', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <Header />
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundImage: `url(${circuitBg})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.15, zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, paddingTop: '150px', maxWidth: '1200px', margin: '0 auto', textAlign: 'center', padding: '150px 24px 80px' }}>
        <h1 style={{ fontSize: 'Clamp(40px, 6vw, 64px)', fontWeight: '800', marginBottom: '24px', lineHeight: 1.1 }}>
          <span style={{ 
            background: 'linear-gradient(90deg, #c2a8f7, #5ce1e6)', 
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            display: 'inline-block', borderBottom: '4px solid #5ce1e6', paddingBottom: '4px'
          }}>
            Maximize intelligence
          </span> with advanced spatial<br/> and hardware automation
        </h1>
        
        <p style={{ fontSize: '20px', color: '#94a3b8', lineHeight: '1.6', marginBottom: '40px', maxWidth: '800px', margin: '0 auto 40px auto' }}>
          The #1 choice for global engineering teams to launch faster, scale smarter, and drive ROI across circuit design, embedded deployment, and architectural review.
        </p>

        <button style={{
            background: 'linear-gradient(90deg, #c2a8f7, #5ce1e6)',
            color: '#000', border: 'none', padding: '16px 32px',
            borderRadius: '30px', fontSize: '18px', fontWeight: '700',
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px',
            boxShadow: '0 10px 30px rgba(92, 225, 230, 0.3)',
            transition: 'transform 0.2s'
        }} onMouseEnter={(e) => e.currentTarget.style.transform='scale(1.05)'} onMouseLeave={(e) => e.currentTarget.style.transform='scale(1)'}>
            Book a demo <ArrowRight size={20} />
        </button>

        {/* Abstract UI representation */}
        <div style={{ marginTop: '80px', display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ background: '#0f172a', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', width: '300px', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ background: 'linear-gradient(135deg, #c2a8f7, #5ce1e6)', borderRadius: '50%', padding: '8px', color: '#000' }}><Zap size={20} /></div>
                    <span style={{ fontWeight: '600' }}>New Topology Detected</span>
                </div>
                <div style={{ background: '#1e293b', padding: '16px', borderRadius: '8px', marginBottom: '12px' }}>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>Optimized just for you, Engineering Team.</h4>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Simulation generated 50ms</span>
                </div>
                <button style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '20px', fontWeight: '600', cursor: 'pointer' }}>REVIEW</button>
            </div>

            <div style={{ background: '#0f172a', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', width: '300px', textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
                <div style={{ background: '#1e293b', borderTop: '4px solid #c2a8f7', borderRadius: '8px', padding: '16px', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <Mail color="#a8b2c1" />
                        <Activity color="#5ce1e6" />
                    </div>
                    <h3 style={{ margin: '0 0 8px 0' }}>Average Validation Time</h3>
                    <h2 style={{ fontSize: '32px', margin: 0, fontWeight: '800' }}>1.5s</h2>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '24px', alignItems: 'flex-end', height: '60px' }}>
                        {[40, 60, 45, 80, 50, 90, 75, 100].map((h, i) => (
                            <div key={i} style={{ flex: 1, background: 'linear-gradient(0deg, rgba(92, 225, 230, 0.5), #c2a8f7)', height: `${h}%`, borderRadius: '4px' }} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
