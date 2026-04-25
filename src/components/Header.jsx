import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, Zap, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setUserMenuOpen(false);
    navigate('/');
  };

  // Extract initials from email or full_name for the avatar circle
  const getInitials = () => {
    const name = user?.user_metadata?.full_name || user?.email || '';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 100 }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: scrolled ? 'rgba(2, 6, 23, 0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.05)' : 'none',
        transition: 'all 0.3s ease'
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <Zap size={32} color="#5ce1e6" />
          <span style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-1px', background: 'linear-gradient(90deg, #c2a8f7, #5ce1e6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            CirSimAI
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav style={{ display: 'flex', gap: '32px' }}>
          <Link to="/enterprise" style={{ color: '#e2e8f0', textDecoration: 'none', fontSize: '16px', fontWeight: '500', transition: 'color 0.2s' }}>Enterprise</Link>

          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setServicesOpen(true)}
            onMouseLeave={() => setServicesOpen(false)}
          >
            <div style={{ color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '16px', fontWeight: '500' }}>
              Our Services <ChevronDown size={14} />
            </div>
            <AnimatePresence>
              {servicesOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  style={{ position: 'absolute', top: '100%', left: '-20px', paddingTop: '10px' }}
                >
                  <div style={{
                    background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px', padding: '8px', minWidth: '220px', backdropFilter: 'blur(10px)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                  }}>
                    <Link to="/simulator" style={{ display: 'block', padding: '12px 16px', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontSize: '15px' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(92,225,230,0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      Circuit Simulator
                    </Link>
                    <Link to="/embedded" style={{ display: 'block', padding: '12px 16px', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontSize: '15px' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(92,225,230,0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      Embedded System Simulator
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Link to="/pricing" style={{ color: '#e2e8f0', textDecoration: 'none', fontSize: '16px', fontWeight: '500' }}>Pricing</Link>
          <Link to="/contact" style={{ color: '#e2e8f0', textDecoration: 'none', fontSize: '16px', fontWeight: '500' }}>Contact Us</Link>
        </nav>

        {/* Right side — shows either Sign In / Try Simulator (guest) OR user avatar (logged in) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {user ? (
            /* ── Logged-in: avatar + dropdown ── */
            <div ref={userMenuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setUserMenuOpen(p => !p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '30px', padding: '6px 14px 6px 6px',
                  cursor: 'pointer', color: '#fff', fontFamily: 'Inter, sans-serif',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
              >
                {/* Avatar circle with initials */}
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #c2a8f7, #5ce1e6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: '700', color: '#000', flexShrink: 0
                }}>
                  {getInitials()}
                </div>
                <span style={{ fontSize: '14px', fontWeight: '500', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.user_metadata?.full_name || user.email.split('@')[0]}
                </span>
                <ChevronDown size={14} color="#94a3b8" />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    style={{
                      position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                      background: 'rgba(15, 23, 42, 0.97)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px', padding: '8px', minWidth: '200px',
                      backdropFilter: 'blur(12px)', boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                    }}
                  >
                    {/* User info row */}
                    <div style={{ padding: '10px 12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '6px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>
                        {user.user_metadata?.full_name || 'Account'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{user.email}</div>
                    </div>

                    <Link to="/simulator" onClick={() => setUserMenuOpen(false)}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', color: '#e2e8f0', textDecoration: 'none', borderRadius: '8px', fontSize: '14px' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(92,225,230,0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <User size={15} /> Open Simulator
                    </Link>

                    <button onClick={handleSignOut}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        width: '100%', padding: '10px 12px', border: 'none', borderRadius: '8px',
                        background: 'transparent', color: '#fca5a5', cursor: 'pointer',
                        fontSize: '14px', fontFamily: 'Inter, sans-serif', textAlign: 'left',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,80,80,0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <LogOut size={15} /> Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            /* ── Guest: Sign In + Try Simulator ── */
            <>
              <Link to="/auth" style={{ color: '#fff', textDecoration: 'none', fontSize: '16px', fontWeight: '600' }}>Log in</Link>
              <Link to="/auth" style={{
                background: 'linear-gradient(90deg, #c2a8f7, #5ce1e6)', color: '#000',
                textDecoration: 'none', padding: '10px 20px', borderRadius: '24px',
                fontSize: '16px', fontWeight: '700', transition: 'transform 0.2s',
                boxShadow: '0 4px 12px rgba(92, 225, 230, 0.4)'
              }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                Try Simulator
              </Link>
            </>
          )}
        </div>
      </div>
    </motion.header>
  );
}
