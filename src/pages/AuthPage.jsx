import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import circuitBg from '../assets/circuit-bg.jpg';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function AuthPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text: '' }

  // If already logged in, go straight to the simulator
  if (user) return <Navigate to="/simulator" replace />;

  const clearMessage = () => setMessage(null);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearMessage();

    try {
      if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Account created! Check your email to confirm your address, then sign in.' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Successful login — AuthContext will detect it and the ProtectedRoute will grant access
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    clearMessage();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Use the base URL (no hash) so Supabase's ?code= lands in
        // window.location.search where the SDK can read it.
        // After exchange, onAuthStateChange fires and the header shows the user.
        redirectTo: window.location.href.split('#')[0],
      },
    });
    if (error) {
      setMessage({ type: 'error', text: error.message });
      setLoading(false);
    }
    // On success, the browser is redirected to Google — no further action needed here
  };

  const inputStyle = {
    width: '100%',
    padding: '14px 16px 14px 44px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '15px',
    fontFamily: 'Inter, sans-serif',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#020617', color: '#fff',
      fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden'
    }}>
      {/* Background */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: `url(${circuitBg})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        opacity: 0.12, pointerEvents: 'none'
      }} />
      {/* Glow blobs */}
      <div style={{ position: 'fixed', top: '20%', left: '15%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(194,168,247,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '20%', right: '15%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(92,225,230,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Logo link */}
      <Link to="/" style={{
        position: 'fixed', top: '24px', left: '32px',
        display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', zIndex: 10
      }}>
        <Zap size={28} color="#5ce1e6" />
        <span style={{
          fontSize: '22px', fontWeight: '800',
          background: 'linear-gradient(90deg, #c2a8f7, #5ce1e6)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
        }}>CirSimAI</span>
      </Link>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          position: 'relative', zIndex: 2,
          width: '100%', maxWidth: '460px', margin: '0 16px',
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px',
          padding: '48px 40px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Mode Tabs */}
        <div style={{
          display: 'flex', background: 'rgba(255,255,255,0.05)',
          borderRadius: '10px', padding: '4px', marginBottom: '36px'
        }}>
          {['login', 'register'].map((m) => (
            <button key={m} onClick={() => { setMode(m); clearMessage(); }} style={{
              flex: 1, padding: '10px', border: 'none', borderRadius: '8px', cursor: 'pointer',
              fontSize: '15px', fontWeight: '600', fontFamily: 'Inter, sans-serif',
              transition: 'all 0.2s',
              background: mode === m ? 'linear-gradient(90deg, #c2a8f7, #5ce1e6)' : 'transparent',
              color: mode === m ? '#000' : '#94a3b8',
            }}>
              {m === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {/* Heading */}
        <h1 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '8px', letterSpacing: '-0.5px' }}>
          {mode === 'login' ? 'Welcome back' : 'Get started free'}
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '32px' }}>
          {mode === 'login'
            ? 'Sign in to access the Circuit Simulator'
            : 'Create your account in seconds. No credit card needed.'}
        </p>

        {/* Google Button */}
        <button onClick={handleGoogleLogin} disabled={loading} style={{
          width: '100%', padding: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '10px', color: '#fff', fontSize: '15px', fontWeight: '600',
          cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif',
          marginBottom: '20px', transition: 'background 0.2s',
        }}
          onMouseEnter={(e) => !loading && (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ color: '#64748b', fontSize: '13px' }}>or with email</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* Form */}
        <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <AnimatePresence>
            {mode === 'register' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden', position: 'relative' }}
              >
                <User size={18} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  type="text" placeholder="Full name" value={fullName}
                  onChange={(e) => setFullName(e.target.value)} required={mode === 'register'}
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = '#5ce1e6'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ position: 'relative' }}>
            <Mail size={18} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              type="email" placeholder="Email address" value={email}
              onChange={(e) => setEmail(e.target.value)} required
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = '#5ce1e6'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={18} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password" value={password}
              onChange={(e) => setPassword(e.target.value)} required
              style={{ ...inputStyle, paddingRight: '44px' }}
              onFocus={(e) => e.target.style.borderColor = '#5ce1e6'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
            <button type="button" onClick={() => setShowPassword(p => !p)} style={{
              position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0
            }}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Feedback message */}
          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px',
                  borderRadius: '8px',
                  background: message.type === 'success' ? 'rgba(92,225,115,0.1)' : 'rgba(255,80,80,0.1)',
                  border: `1px solid ${message.type === 'success' ? 'rgba(92,225,115,0.3)' : 'rgba(255,80,80,0.3)'}`,
                  fontSize: '13px', lineHeight: '1.5',
                  color: message.type === 'success' ? '#6ee7b7' : '#fca5a5',
                }}
              >
                {message.type === 'success'
                  ? <CheckCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                  : <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />}
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '14px',
            background: loading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(90deg, #c2a8f7, #5ce1e6)',
            color: loading ? '#64748b' : '#000', border: 'none', borderRadius: '10px',
            fontSize: '16px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'Inter, sans-serif', marginTop: '4px', transition: 'opacity 0.2s',
          }}>
            {loading ? 'Please wait…' : (mode === 'login' ? 'Sign In →' : 'Create Account →')}
          </button>
        </form>

        {/* Footer note */}
        <p style={{ textAlign: 'center', marginTop: '28px', fontSize: '13px', color: '#64748b' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); clearMessage(); }}
            style={{ background: 'none', border: 'none', color: '#5ce1e6', cursor: 'pointer', fontSize: '13px', fontFamily: 'Inter, sans-serif', fontWeight: '600' }}>
            {mode === 'login' ? 'Sign up free' : 'Sign in'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
