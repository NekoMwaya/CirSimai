import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { Zap, Activity, Cpu, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import circuitBg from '../assets/circuit-bg.jpg';

const FORMSPREE_ENDPOINT = import.meta.env.VITE_FORMSPREE_ENDPOINT;
const CALENDLY_URL = import.meta.env.VITE_CALENDLY_URL;

export default function ContactUs() {
  const [formState, setFormState] = useState({
    firstName: '', lastName: '', phone: '', jobTitle: '',
    company: '', country: '', email: '', teamSize: '', subject: '', message: ''
  });
  const [status, setStatus] = useState('idle'); // 'idle' | 'sending' | 'success' | 'error'
  const [calendlyOpen, setCalendlyOpen] = useState(false);

  // Load Calendly's widget script once on mount
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://assets.calendly.com/assets/external/widget.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.head.removeChild(link);
      document.body.removeChild(script);
    };
  }, []);

  const openCalendly = () => {
    // Uses Calendly's global API injected by their widget.js
    if (window.Calendly) {
      window.Calendly.initPopupWidget({ url: CALENDLY_URL });
    } else {
      // Fallback: open in new tab if script hasn't loaded yet
      window.open(CALENDLY_URL, '_blank');
    }
  };

  const handleChange = (field) => (e) => {
    setFormState(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          name: `${formState.firstName} ${formState.lastName}`,
          email: formState.email,
          phone: formState.phone,
          job_title: formState.jobTitle,
          company: formState.company,
          country: formState.country,
          team_size: formState.teamSize,
          subject: formState.subject,
          message: formState.message,
        }),
      });
      if (res.ok) {
        setStatus('success');
        setFormState({ firstName: '', lastName: '', phone: '', jobTitle: '', company: '', country: '', email: '', teamSize: '', subject: '', message: '' });
      } else {
        throw new Error('Form submission failed');
      }
    } catch {
      setStatus('error');
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '15px',
    marginTop: '8px',
    fontFamily: 'Inter, sans-serif',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  const labelStyle = { fontSize: '13px', fontWeight: '600', color: '#cbd5e1' };

  const focusStyle = (e) => (e.target.style.borderColor = '#5ce1e6');
  const blurStyle  = (e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)');

  return (
    <div style={{ minHeight: '100vh', background: '#020617', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <Header />
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundImage: `url(${circuitBg})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.15, zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '60px', padding: '150px 24px 80px' }}>
          
        {/* Left Column */}
        <div style={{ flex: '1', minWidth: '300px' }}>
            <h1 style={{ fontSize: 'Clamp(48px, 6vw, 72px)', fontWeight: '800', lineHeight: '1.1', marginBottom: '24px' }}>
                Contact our<br/>sales team
            </h1>
            <p style={{ fontSize: '18px', color: '#94a3b8', lineHeight: '1.6', marginBottom: '36px', maxWidth: '400px' }}>
                Watch CirSimAI in action with your own live demo, and learn how your team can design and build hardware topologies faster than ever before with AI.
            </p>

            {/* ★ Book a Demo button — opens Calendly popup */}
            <button
              onClick={openCalendly}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '14px 24px', marginBottom: '48px',
                background: 'linear-gradient(90deg, #c2a8f7, #5ce1e6)',
                border: 'none', borderRadius: '30px', cursor: 'pointer',
                color: '#000', fontSize: '16px', fontWeight: '700',
                fontFamily: 'Inter, sans-serif', transition: 'transform 0.2s, opacity 0.2s',
                boxShadow: '0 8px 24px rgba(92,225,230,0.3)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.04)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Calendar size={18} /> Book a Demo
            </button>

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

        {/* Right Column — Contact Form powered by Formspree */}
        <div style={{ flex: '1', minWidth: '400px', background: '#0f172a', padding: '40px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>

          {/* Success state */}
          {status === 'success' ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <CheckCircle size={56} color="#6ee7b7" style={{ marginBottom: '20px' }} />
              <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '12px' }}>Message sent!</h2>
              <p style={{ color: '#94a3b8', fontSize: '16px', lineHeight: '1.6' }}>
                Thanks for reaching out. Our sales team will get back to you within 24 hours.
              </p>
              <button onClick={() => setStatus('idle')} style={{
                marginTop: '32px', padding: '12px 28px', background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px',
                color: '#fff', cursor: 'pointer', fontSize: '15px', fontFamily: 'Inter, sans-serif'
              }}>
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div>
                      <label style={labelStyle}>First Name</label>
                      <input style={inputStyle} placeholder="John" value={formState.firstName} onChange={handleChange('firstName')} onFocus={focusStyle} onBlur={blurStyle} required />
                  </div>
                  <div>
                      <label style={labelStyle}>Last Name</label>
                      <input style={inputStyle} placeholder="Smith" value={formState.lastName} onChange={handleChange('lastName')} onFocus={focusStyle} onBlur={blurStyle} required />
                  </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div>
                      <label style={labelStyle}>Phone</label>
                      <input style={inputStyle} placeholder="+1234567890" value={formState.phone} onChange={handleChange('phone')} onFocus={focusStyle} onBlur={blurStyle} />
                  </div>
                  <div>
                      <label style={labelStyle}>Job Title</label>
                      <input style={inputStyle} placeholder="CEO" value={formState.jobTitle} onChange={handleChange('jobTitle')} onFocus={focusStyle} onBlur={blurStyle} />
                  </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div>
                      <label style={labelStyle}>Company</label>
                      <input style={inputStyle} placeholder="Acme Corp" value={formState.company} onChange={handleChange('company')} onFocus={focusStyle} onBlur={blurStyle} />
                  </div>
                  <div>
                      <label style={labelStyle}>Country</label>
                      <input style={inputStyle} placeholder="United States" value={formState.country} onChange={handleChange('country')} onFocus={focusStyle} onBlur={blurStyle} />
                  </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Company Email</label>
                  <input type="email" style={inputStyle} placeholder="john@acme.com" value={formState.email} onChange={handleChange('email')} onFocus={focusStyle} onBlur={blurStyle} required />
              </div>

              <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Expected Number of Users</label>
                  <select style={{...inputStyle, appearance: 'none', cursor: 'pointer'}} value={formState.teamSize} onChange={handleChange('teamSize')} onFocus={focusStyle} onBlur={blurStyle}>
                      <option value="">Select...</option>
                      <option value="1-10">1-10</option>
                      <option value="11-50">11-50</option>
                      <option value="51-200">51-200</option>
                  </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Subject</label>
                  <select style={{...inputStyle, appearance: 'none', cursor: 'pointer'}} value={formState.subject} onChange={handleChange('subject')} onFocus={focusStyle} onBlur={blurStyle}>
                      <option value="">Select...</option>
                      <option value="General Inquiry">General Inquiry</option>
                      <option value="Enterprise Plan">Enterprise Plan</option>
                  </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Message</label>
                  <textarea style={{...inputStyle, minHeight: '120px', resize: 'vertical'}} placeholder="What can we help you with?" value={formState.message} onChange={handleChange('message')} onFocus={focusStyle} onBlur={blurStyle} />
              </div>

              {/* Error feedback */}
              {status === 'error' && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px',
                  padding: '12px 14px', borderRadius: '8px',
                  background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.3)',
                  color: '#fca5a5', fontSize: '14px'
                }}>
                  <AlertCircle size={16} /> Something went wrong. Please try again.
                </div>
              )}

              <button type="submit" disabled={status === 'sending'} style={{
                  width: '100%',
                  background: status === 'sending' ? 'rgba(255,255,255,0.1)' : 'linear-gradient(90deg, #c2a8f7, #5ce1e6)',
                  color: status === 'sending' ? '#64748b' : '#000',
                  border: 'none', padding: '16px', borderRadius: '8px',
                  fontSize: '16px', fontWeight: '700', cursor: status === 'sending' ? 'not-allowed' : 'pointer',
                  fontFamily: 'Inter, sans-serif', transition: 'opacity 0.2s',
              }}>
                  {status === 'sending' ? 'Sending…' : 'Submit Message'}
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
