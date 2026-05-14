import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, Zap, LogOut, User, Menu, X, Trophy, Clock, Cpu, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut, tokenUsage, messageUsage, TOKEN_LIMIT, MESSAGE_LIMIT, plan, recentCircuits } = useAuth();
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
    setMobileMenuOpen(false);
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
        background: scrolled || mobileMenuOpen ? 'rgba(2, 6, 23, 0.95)' : 'transparent',
        backdropFilter: scrolled || mobileMenuOpen ? 'blur(16px)' : 'none',
        borderBottom: (scrolled || mobileMenuOpen) ? '1px solid rgba(255,255,255,0.05)' : 'none',
        transition: 'all 0.3s ease'
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }} onClick={() => setMobileMenuOpen(false)}>
          <Zap size={32} color="#5ce1e6" />
          <span style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-1px', background: 'linear-gradient(90deg, #c2a8f7, #5ce1e6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            CirSimAI
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="mobile-hidden" style={{ display: 'flex', gap: '32px' }}>
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
          <div className="mobile-hidden" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
                  {plan && plan !== 'free' && (
                    <span style={{
                      fontSize: '10px', fontWeight: '700', padding: '2px 7px',
                      borderRadius: '10px',
                      background: plan === 'team' ? 'rgba(194,168,247,0.2)' : 'rgba(92,225,230,0.2)',
                      color: plan === 'team' ? '#c2a8f7' : '#5ce1e6',
                    }}>
                      {plan.toUpperCase()}
                    </span>
                  )}
                  <ChevronDown size={14} color="#94a3b8" />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      style={{
                        position: 'absolute', top: 'calc(100% + 12px)', right: 0,
                        background: 'rgba(10, 15, 28, 0.98)', border: '1px solid rgba(92, 225, 230, 0.15)',
                        borderRadius: '20px', padding: '0', width: '320px',
                        backdropFilter: 'blur(20px)', boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
                        overflow: 'hidden', zIndex: 1100
                      }}
                    >
                      {/* Header Section */}
                      <div style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(92, 225, 230, 0.05), transparent)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{
                            width: '48px', height: '48px', borderRadius: '16px',
                            background: 'linear-gradient(135deg, #c2a8f7, #5ce1e6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '18px', fontWeight: '800', color: '#000', flexShrink: 0,
                            boxShadow: '0 8px 16px rgba(92, 225, 230, 0.2)'
                          }}>
                            {getInitials()}
                          </div>
                          <div>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff', letterSpacing: '-0.3px' }}>
                              {user.user_metadata?.full_name || 'Innovator'}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{user.email}</div>
                          </div>
                        </div>
                      </div>

                      <div style={{ padding: '16px' }}>
                      {/* Token Usage Section */}
                        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', padding: '14px', marginBottom: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
                          {/* Tokens */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                              <Zap size={12} color="#5ce1e6" /> AI Tokens
                            </div>
                            <div style={{ fontSize: '11px', color: '#5ce1e6', fontWeight: '700' }}>
                              {isFinite(TOKEN_LIMIT) ? `${Math.round((tokenUsage / TOKEN_LIMIT) * 100)}%` : '∞'}
                            </div>
                          </div>
                          <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', marginBottom: '6px' }}>
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: isFinite(TOKEN_LIMIT) ? `${Math.min(100, (tokenUsage / TOKEN_LIMIT) * 100)}%` : '0%' }}
                              style={{ height: '100%', background: 'linear-gradient(90deg, #c2a8f7, #5ce1e6)', borderRadius: '10px' }}
                            />
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <span>{tokenUsage.toLocaleString()} used</span>
                            <span>{isFinite(TOKEN_LIMIT) ? TOKEN_LIMIT.toLocaleString() : '∞'} limit</span>
                          </div>

                          {/* Messages */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                              <MessageSquare size={12} color="#c2a8f7" /> Messages
                            </div>
                            <div style={{ fontSize: '11px', color: '#c2a8f7', fontWeight: '700' }}>
                              {isFinite(MESSAGE_LIMIT) ? `${messageUsage} / ${MESSAGE_LIMIT}` : `${messageUsage} / ∞`}
                            </div>
                          </div>
                          <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: isFinite(MESSAGE_LIMIT) ? `${Math.min(100, (messageUsage / MESSAGE_LIMIT) * 100)}%` : '0%' }}
                              style={{ height: '100%', background: 'linear-gradient(90deg, #c2a8f7, #a78bfa)', borderRadius: '10px' }}
                            />
                          </div>
                        </div>

                        {/* Recent Circuits */}
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', paddingLeft: '4px' }}>
                            Recent Projects
                          </div>
                          {recentCircuits.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {recentCircuits.slice(0, 3).map(circuit => {
                                const isEmbedded = circuit.project_type === 'embedded';
                                const href = isEmbedded ? `/embedded?project=${circuit.id}` : `/simulator?project=${circuit.id}`;
                                return (
                                  <Link key={circuit.id} to={href} onClick={() => setUserMenuOpen(false)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', color: '#e2e8f0', textDecoration: 'none', borderRadius: '10px', fontSize: '13px', transition: 'all 0.2s' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateX(0)'; }}
                                  >
                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: isEmbedded ? 'rgba(92,225,230,0.1)' : 'rgba(194,168,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                      <Cpu size={16} color={isEmbedded ? '#5ce1e6' : '#c2a8f7'} />
                                    </div>
                                    <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {circuit.name || 'Untitled Project'}
                                    </div>
                                    <span style={{ fontSize: '10px', color: isEmbedded ? '#5ce1e6' : '#c2a8f7', flexShrink: 0 }}>
                                      {isEmbedded ? 'EMB' : 'CKT'}
                                    </span>
                                  </Link>
                                );
                              })}
                            </div>
                          ) : (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#475569', fontSize: '12px', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                              No projects yet. Start creating!
                            </div>
                          )}
                        </div>

                        {/* Achievements Row */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                          {[
                            { icon: '🏆', label: 'Pro', color: '#fbbf24' },
                            { icon: '⚡', label: 'Fast', color: '#60a5fa' },
                            { icon: '🔬', label: 'Lab', color: '#a78bfa' }
                          ].map((ach, idx) => (
                            <div key={idx} style={{ flex: 1, background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '10px 4px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.02)' }}>
                              <div style={{ fontSize: '16px', marginBottom: '4px' }}>{ach.icon}</div>
                              <div style={{ fontSize: '10px', fontWeight: '600', color: '#94a3b8' }}>{ach.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <Link to="/dashboard" onClick={() => setUserMenuOpen(false)}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', color: '#e2e8f0', textDecoration: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '500' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <User size={16} color="#94a3b8" /> Dashboard
                        </Link>
                        <Link to="/simulator" onClick={() => setUserMenuOpen(false)}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', color: '#e2e8f0', textDecoration: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '500' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <Cpu size={16} color="#94a3b8" /> My Workspace
                        </Link>
                        <button onClick={handleSignOut}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            width: '100%', padding: '10px 14px', border: 'none', borderRadius: '10px',
                            background: 'transparent', color: '#fca5a5', cursor: 'pointer',
                            fontSize: '14px', fontWeight: '500', fontFamily: 'Inter, sans-serif', textAlign: 'left',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <LogOut size={16} /> Sign Out
                        </button>
                      </div>
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

          {/* Mobile Menu Toggle */}
          <button
            className="mobile-show"
            style={{ display: 'none', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              background: 'rgba(2, 6, 23, 0.92)', borderTop: '1px solid rgba(255,255,255,0.05)',
              overflow: 'hidden', paddingBottom: '24px', backdropFilter: 'blur(20px)'
            }}
          >
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <Link to="/enterprise" style={{ color: '#fff', textDecoration: 'none', fontSize: '18px', fontWeight: '600' }} onClick={() => setMobileMenuOpen(false)}>Enterprise</Link>
              <div style={{ color: '#fff', fontSize: '18px', fontWeight: '600' }}>Our Services</div>
              <div style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Link to="/simulator" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '16px' }} onClick={() => setMobileMenuOpen(false)}>Circuit Simulator</Link>
                <Link to="/embedded" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '16px' }} onClick={() => setMobileMenuOpen(false)}>Embedded Simulator</Link>
              </div>
              <Link to="/pricing" style={{ color: '#fff', textDecoration: 'none', fontSize: '18px', fontWeight: '600' }} onClick={() => setMobileMenuOpen(false)}>Pricing</Link>
              <Link to="/contact" style={{ color: '#fff', textDecoration: 'none', fontSize: '18px', fontWeight: '600' }} onClick={() => setMobileMenuOpen(false)}>Contact Us</Link>

              <div style={{ marginTop: '12px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {user ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #c2a8f7, #5ce1e6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: '#000' }}>
                        {getInitials()}
                      </div>
                      <div>
                        <div style={{ color: '#fff', fontWeight: '600' }}>{user.user_metadata?.full_name || user.email.split('@')[0]}</div>
                        <div style={{ color: '#64748b', fontSize: '14px' }}>{user.email}</div>
                      </div>
                    </div>
                    <button onClick={handleSignOut} style={{ background: 'rgba(255,80,80,0.1)', color: '#fca5a5', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: '600', textAlign: 'center' }}>Sign Out</button>
                  </>
                ) : (
                  <>
                    <Link to="/auth" style={{ color: '#fff', textDecoration: 'none', textAlign: 'center', padding: '12px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px' }} onClick={() => setMobileMenuOpen(false)}>Log in</Link>
                    <Link to="/auth" style={{ background: 'linear-gradient(90deg, #c2a8f7, #5ce1e6)', color: '#000', textDecoration: 'none', textAlign: 'center', padding: '12px', borderRadius: '24px', fontWeight: '700' }} onClick={() => setMobileMenuOpen(false)}>Try Simulator</Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
