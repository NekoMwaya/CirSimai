import React from 'react';
import Header from '../components/Header';
import { Check } from 'lucide-react';
import circuitBg from '../assets/circuit-bg.jpg';

// Stripe Payment Links are stored in .env.local — never hardcoded here
const STRIPE_PRO_URL = import.meta.env.VITE_STRIPE_PRO_URL;
const STRIPE_TEAM_URL = import.meta.env.VITE_STRIPE_TEAM_URL;

export default function Pricing() {
  const checkStyle = { color: '#5ce1e6', marginRight: '12px' };
  const getCardStyle = (highlight) => ({
      position: 'relative',
      background: highlight ? 'linear-gradient(#020617, #020617) padding-box, linear-gradient(180deg, #c2a8f7, #5ce1e6) border-box' : 'rgba(10, 15, 28, 0.8)',
      border: highlight ? '2px solid transparent' : '1px solid rgba(255,255,255,0.05)',
      borderRadius: '16px',
      padding: '32px 24px',
      textAlign: 'left',
      flex: '1',
      minWidth: '280px',
      backdropFilter: 'blur(8px)'
  });

  const CheckIcon = <Check size={18} color="#5ce1e6"/>;
  const CrossIcon = <span style={{color: '#64748b'}}>-</span>;
  const thStyle = { padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', fontWeight: 'bold', fontSize: '16px', background: 'rgba(255,255,255,0.02)' };
  const tdStyle = { padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'left', color: '#cbd5e1', fontSize: '15px' };

  // Shared button base style (used inline below)
  const ctaBtnBase = {
    display: 'block', width: '100%', padding: '12px', borderRadius: '8px',
    border: 'none', fontWeight: 'bold', cursor: 'pointer', marginBottom: '32px',
    fontSize: '14px', fontFamily: 'Inter, sans-serif', textDecoration: 'none',
    textAlign: 'center', transition: 'opacity 0.2s, transform 0.15s',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#020617', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <Header />
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundImage: `url(${circuitBg})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.15, zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, paddingTop: '120px', maxWidth: '1200px', margin: '0 auto', textAlign: 'center', padding: '120px 24px 80px' }}>
        
        <h1 style={{ fontSize: '48px', fontWeight: '800', marginBottom: '16px' }}>
          Plans that evolve with your projects.
        </h1>
        <h2 style={{ fontSize: '40px', fontWeight: '800', marginBottom: '60px', color: '#e2e8f0' }}>
          Try with your <span style={{ background: 'linear-gradient(90deg, #c2a8f7, #5ce1e6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>team</span> for free.
        </h2>

        {/* 3 Pricing Cards */}
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '80px' }}>
            
            {/* Free tier */}
            <div style={getCardStyle(false)}>
                <div style={{ background: 'rgba(255,255,255,0.1)', display: 'inline-block', padding: '4px 12px', borderRadius: '4px', fontWeight: 'bold', marginBottom: '16px' }}>Free</div>
                <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '32px' }}>Conceptualize anything and bring your ideas to life. No cost, but with limits.</p>
                <div style={{ marginBottom: '32px' }}>
                    <span style={{ fontSize: '40px', fontWeight: '800' }}>$0</span> <span style={{ fontSize: '14px', color: '#94a3b8' }}>USD</span>
                    <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>/month</div>
                </div>
                {/* Free tier — goes to /auth to create an account */}
                <a href="/#/auth" style={{ ...ctaBtnBase, background: '#fff', color: '#000' }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>
                  Get started
                </a>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}><Check size={16} style={checkStyle} /> 1 project limit</div>
                    <div style={{ display: 'flex', alignItems: 'center' }}><Check size={16} style={checkStyle} /> Basic Logic Verification</div>
                    <div style={{ display: 'flex', alignItems: 'center' }}><Check size={16} style={checkStyle} /> Standard AI Model</div>
                </div>
            </div>

            {/* Pro tier — opens Stripe checkout */}
            <div style={getCardStyle(true)}>
                <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '4px', fontWeight: 'bold', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.2)' }}>CirSimAI <span style={{color: '#5ce1e6'}}>Pro</span></div>
                <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '32px' }}>Complete freedom with unlimited access to build schemas of any size.</p>
                <div style={{ marginBottom: '32px' }}>
                    <span style={{ fontSize: '40px', fontWeight: '800' }}>$40</span> <span style={{ fontSize: '14px', color: '#94a3b8' }}>USD</span>
                    <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>/month</div>
                </div>

                {/* ★ Stripe Payment Link — opens Stripe's hosted checkout page in a new tab */}
                <a
                  href={STRIPE_PRO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ ...ctaBtnBase, background: '#fff', color: '#000' }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'scale(1.02)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  Start 7-day free trial →
                </a>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}><Check size={16} style={checkStyle} /> Unlimited Projects</div>
                    <div style={{ display: 'flex', alignItems: 'center' }}><Check size={16} style={checkStyle} /> Full SPICE engine</div>
                    <div style={{ display: 'flex', alignItems: 'center' }}><Check size={16} style={checkStyle} /> Uncapped AI Tokens</div>
                    <div style={{ display: 'flex', alignItems: 'center' }}><Check size={16} style={checkStyle} /> Enterprise API Access</div>
                </div>
            </div>

            {/* Team tier — opens Stripe checkout */}
            <div style={getCardStyle(false)}>
                <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '4px', fontWeight: 'bold', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.2)' }}>CirSimAI <span style={{color: '#c2a8f7'}}>Team</span></div>
                <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '32px' }}>Bring your team over with all Pro access and enhanced collaboration.</p>
                <div style={{ marginBottom: '32px' }}>
                    <span style={{ fontSize: '40px', fontWeight: '800' }}>$36</span> <span style={{ fontSize: '14px', color: '#94a3b8' }}>USD</span>
                    <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>/month per person (Min 3)</div>
                </div>

                {/* ★ Stripe Payment Link — opens Stripe's hosted checkout page in a new tab */}
                <a
                  href={STRIPE_TEAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ ...ctaBtnBase, background: 'rgba(255,255,255,0.1)', color: '#fff' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; e.currentTarget.style.transform = 'scale(1.02)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  Start 7-day free trial →
                </a>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px' }}>
                     <div style={{ color: '#fff', fontWeight: 'bold' }}>Everything in Pro +</div>
                    <div style={{ display: 'flex', alignItems: 'center' }}><Check size={16} style={checkStyle} /> 3 users included</div>
                    <div style={{ display: 'flex', alignItems: 'center' }}><Check size={16} style={checkStyle} /> Team workspace</div>
                    <div style={{ display: 'flex', alignItems: 'center' }}><Check size={16} style={checkStyle} /> Branded sharing limits</div>
                </div>
            </div>

        </div>

        {/* Feature Comparison Table — unchanged */}
        <h3 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '24px', textAlign: 'left' }}>Compare Features</h3>
        <div style={{ background: 'rgba(15, 23, 42, 0.7)', borderRadius: '16px', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                    <tr>
                        <th style={thStyle}>Core capabilities</th>
                        <th style={thStyle}>Free</th>
                        <th style={{...thStyle, color: '#5ce1e6'}}>Pro</th>
                        <th style={{...thStyle, color: '#c2a8f7'}}>Team</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td style={tdStyle}>Maximum Projects</td><td style={tdStyle}>1</td><td style={tdStyle}>Unlimited</td><td style={tdStyle}>Unlimited</td></tr>
                    <tr><td style={tdStyle}>SPICE Simulation Engine</td><td style={tdStyle}>Basic Mode</td><td style={tdStyle}>{CheckIcon} Full Support</td><td style={tdStyle}>{CheckIcon} Full Support</td></tr>
                    <tr><td style={tdStyle}>Cloud Sync</td><td style={tdStyle}>{CrossIcon}</td><td style={tdStyle}>{CheckIcon}</td><td style={tdStyle}>{CheckIcon}</td></tr>
                    <tr><td style={tdStyle}>Enterprise AI Model Access</td><td style={tdStyle}>{CrossIcon}</td><td style={tdStyle}>{CheckIcon}</td><td style={tdStyle}>{CheckIcon}</td></tr>
                    <tr><td style={tdStyle}>Share with Read-only link</td><td style={tdStyle}>{CheckIcon}</td><td style={tdStyle}>{CheckIcon}</td><td style={tdStyle}>{CheckIcon}</td></tr>
                    <tr><td style={tdStyle}>Live Multiparty Collaboration</td><td style={tdStyle}>{CrossIcon}</td><td style={tdStyle}>{CrossIcon}</td><td style={tdStyle}>{CheckIcon}</td></tr>
                    <tr><td style={tdStyle}>Organizational Permissions</td><td style={tdStyle}>{CrossIcon}</td><td style={tdStyle}>{CrossIcon}</td><td style={tdStyle}>{CheckIcon}</td></tr>
                    <tr><td style={tdStyle}>Priority Customer Support</td><td style={tdStyle}>{CrossIcon}</td><td style={tdStyle}>{CheckIcon}</td><td style={tdStyle}>{CheckIcon}</td></tr>
                </tbody>
            </table>
        </div>

        {/* Test mode notice for competition judges */}
        <div style={{
          marginTop: '40px', padding: '16px 24px', borderRadius: '12px',
          background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.2)',
          color: '#fbbf24', fontSize: '14px', textAlign: 'center', lineHeight: '1.6'
        }}>
          🔒 <strong>Stripe Test Mode active.</strong> Use card number <code style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px' }}>4242 4242 4242 4242</code>, any future expiry, and any 3-digit CVC to complete a test checkout.
        </div>

      </div>
    </div>
  );
}
