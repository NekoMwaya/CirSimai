import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Cpu, 
  Zap, 
  User, 
  Settings, 
  Plus, 
  ArrowRight, 
  Clock, 
  Trophy, 
  Search, 
  Bell,
  ChevronRight,
  LogOut,
  ChevronDown,
  MessageSquare,
  Microchip,
  Trash2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import Header from '../components/Header';

const PLAN_LABELS = { free: 'Free Plan', pro: 'Pro Plan', team: 'Team Plan' };
const PLAN_COLORS = { free: '#fbbf24', pro: '#5ce1e6', team: '#c2a8f7' };

function formatLimit(n) {
  if (!isFinite(n)) return '∞';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Dashboard() {
  const { user, plan, tokenUsage, messageUsage, TOKEN_LIMIT, MESSAGE_LIMIT, recentCircuits, signOut, refreshData } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [greeting, setGreeting] = useState('Welcome back');
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
    // Refresh recent circuits when dashboard loads
    refreshData?.();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('circuit_projects')
        .delete()
        .eq('id', deleteTarget.id);
      if (error) throw error;
      await refreshData?.();
    } catch (err) {
      console.error('Delete error:', err?.message || err);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const getInitials = () => {
    const name = user?.user_metadata?.full_name || user?.email || '';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'circuits', label: 'My Circuits', icon: Cpu, link: '/simulator' },
    { id: 'embedded', label: 'Embedded', icon: Zap, link: '/embedded' },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const tokenPct = isFinite(TOKEN_LIMIT) ? Math.min(100, (tokenUsage / TOKEN_LIMIT) * 100) : 0;
  const msgPct   = isFinite(MESSAGE_LIMIT) ? Math.min(100, (messageUsage / MESSAGE_LIMIT) * 100) : 0;
  const planColor = PLAN_COLORS[plan] || '#fbbf24';

  const stats = [
    { 
      label: 'AI Tokens Today', 
      value: `${tokenUsage.toLocaleString()} / ${formatLimit(TOKEN_LIMIT)}`, 
      percent: tokenPct,
      icon: Zap,
      color: '#5ce1e6',
      sub: 'Resets at midnight'
    },
    { 
      label: 'Messages Today', 
      value: `${messageUsage} / ${formatLimit(MESSAGE_LIMIT)}`, 
      percent: isFinite(MESSAGE_LIMIT) ? msgPct : -1,
      icon: MessageSquare,
      color: '#c2a8f7',
      sub: 'Resets at midnight'
    },
    { 
      label: 'Account Tier', 
      value: PLAN_LABELS[plan] || 'Free Plan', 
      icon: Trophy,
      color: planColor,
      sub: plan === 'free' ? 'Upgrade to Pro for more' : plan === 'team' ? 'Unlimited — billed on usage' : '250k tokens / 200 msgs'
    },
    { 
      label: 'Saved Projects', 
      value: recentCircuits.length, 
      icon: Cpu,
      color: '#60a5fa',
      sub: 'Circuit & Embedded'
    },
  ];

  // Navigate to the correct simulator when clicking a circuit
  const openProject = (circuit) => {
    const type = circuit.project_type || 'circuit';
    if (type === 'embedded') {
      navigate(`/embedded?project=${circuit.id}`);
    } else {
      navigate(`/simulator?project=${circuit.id}`);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#020617', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <Header />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
            }}
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#0f172a', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 20, padding: 32, minWidth: 360, maxWidth: 440,
                boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <div style={{ padding: 12, borderRadius: 12, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Delete Project?</h3>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>This action cannot be undone.</p>
                </div>
              </div>
              <p style={{ color: '#94a3b8', fontSize: 15, marginBottom: 28, lineHeight: 1.5 }}>
                Do you want to delete <strong style={{ color: '#fff' }}>"{ deleteTarget.name }"</strong>?
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setDeleteTarget(null)}
                  style={{
                    padding: '10px 22px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                    background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 600, fontSize: 14
                  }}
                >Cancel</button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  style={{
                    padding: '10px 22px', borderRadius: 10, border: 'none',
                    background: isDeleting ? '#7f1d1d' : '#ef4444',
                    color: '#fff', cursor: isDeleting ? 'not-allowed' : 'pointer',
                    fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8,
                    opacity: isDeleting ? 0.7 : 1,
                  }}
                >
                  <Trash2 size={15} />
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div style={{ display: 'flex', paddingTop: '80px', height: 'calc(100vh - 80px)' }}>
        {/* Sidebar */}
        <aside style={{ 
          width: '260px', 
          borderRight: '1px solid rgba(255,255,255,0.05)', 
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {navItems.map((item) => (
            <div 
              key={item.id}
              onClick={() => {
                if (item.link) navigate(item.link);
                else setActiveTab(item.id);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '12px',
                cursor: 'pointer',
                background: activeTab === item.id ? 'rgba(92, 225, 230, 0.1)' : 'transparent',
                color: activeTab === item.id ? '#5ce1e6' : '#94a3b8',
                transition: 'all 0.2s',
                fontWeight: activeTab === item.id ? '600' : '400'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== item.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              }}
              onMouseLeave={(e) => {
                if (activeTab !== item.id) e.currentTarget.style.background = 'transparent';
              }}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </div>
          ))}

          <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {/* Plan badge */}
            <div style={{
              padding: '10px 16px', borderRadius: '12px', marginBottom: '8px',
              background: `${planColor}15`, border: `1px solid ${planColor}33`,
              display: 'flex', alignItems: 'center', gap: '10px'
            }}>
              <Trophy size={16} color={planColor} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: planColor }}>{PLAN_LABELS[plan]}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  {formatLimit(TOKEN_LIMIT)} tokens / {formatLimit(MESSAGE_LIMIT)} msgs
                </div>
              </div>
            </div>
            <button 
              onClick={signOut}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: '#fca5a5',
                cursor: 'pointer',
                borderRadius: '12px',
                fontSize: '14px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <LogOut size={20} />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            
            {/* Top Greeting Section */}
            <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <motion.h2 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  style={{ fontSize: '14px', fontWeight: '700', color: '#5ce1e6', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}
                >
                  Dashboard
                </motion.h2>
                <motion.h1 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-1px' }}
                >
                  {greeting}, {user?.user_metadata?.full_name?.split(' ')[0] || 'Innovator'}!
                </motion.h1>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => navigate('/embedded')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 20px',
                    background: 'rgba(92, 225, 230, 0.08)',
                    border: '1px solid rgba(92,225,230,0.2)',
                    borderRadius: '12px', color: '#5ce1e6',
                    fontWeight: '700', cursor: 'pointer',
                  }}
                >
                  <Zap size={18} /> Embedded
                </button>
                <button 
                  onClick={() => navigate('/simulator')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    background: 'linear-gradient(90deg, #c2a8f7, #5ce1e6)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#000',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 8px 20px rgba(92, 225, 230, 0.25)'
                  }}
                >
                  <Plus size={18} /> New Circuit
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '48px' }}>
              {stats.map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + idx * 0.1 }}
                  style={{
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '24px',
                    padding: '24px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ 
                    position: 'absolute', top: '-10px', right: '-10px', width: '80px', height: '80px', 
                    background: `radial-gradient(circle, ${stat.color}15, transparent 70%)`,
                    borderRadius: '50%'
                  }} />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ padding: '10px', borderRadius: '12px', background: `${stat.color}15`, color: stat.color }}>
                      <stat.icon size={24} />
                    </div>
                  </div>
                  
                  <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '4px' }}>{stat.label}</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#fff', marginBottom: '12px' }}>{stat.value}</div>
                  
                  {stat.percent !== undefined && stat.percent >= 0 && (
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', marginBottom: '8px' }}>
                      <div style={{ height: '100%', width: `${stat.percent}%`, background: `linear-gradient(90deg, #c2a8f7, ${stat.color})`, borderRadius: '10px' }} />
                    </div>
                  )}
                  
                  <div style={{ fontSize: '12px', color: '#475569' }}>{stat.sub}</div>
                </motion.div>
              ))}
            </div>

            {/* Recent Projects Grid */}
            <section style={{ marginBottom: '48px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '700' }}>Recent Projects</h3>
                <Link to="/simulator" style={{ color: '#5ce1e6', textDecoration: 'none', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  New Circuit <ArrowRight size={14} />
                </Link>
              </div>

              {recentCircuits.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                  {recentCircuits.map((circuit, idx) => {
                    const isEmbedded = circuit.project_type === 'embedded';
                    return (
                      <motion.div
                        key={circuit.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 + idx * 0.07 }}
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.05)',
                          borderRadius: '20px',
                          padding: '20px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          position: 'relative',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.borderColor = 'rgba(92, 225, 230, 0.3)';
                          e.currentTarget.querySelector('.del-btn').style.opacity = '1';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                          e.currentTarget.querySelector('.del-btn').style.opacity = '0';
                        }}
                        onClick={() => openProject(circuit)}
                      >
                        <div style={{ 
                          width: '56px', height: '56px', borderRadius: '16px', flexShrink: 0,
                          background: isEmbedded
                            ? 'linear-gradient(135deg, rgba(92, 225, 230, 0.1), rgba(194, 168, 247, 0.1))'
                            : 'linear-gradient(135deg, rgba(194, 168, 247, 0.1), rgba(92, 225, 230, 0.1))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {isEmbedded ? <Microchip size={28} color="#5ce1e6" /> : <Cpu size={28} color="#c2a8f7" />}
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {circuit.name || 'Untitled Project'}
                          </h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#64748b' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} /> {timeAgo(circuit.updated_at || circuit.created_at)}
                            </span>
                            <span style={{
                              padding: '2px 8px', borderRadius: '6px',
                              background: isEmbedded ? 'rgba(92,225,230,0.1)' : 'rgba(194,168,247,0.1)',
                              color: isEmbedded ? '#5ce1e6' : '#c2a8f7',
                              fontSize: '11px', fontWeight: '600'
                            }}>
                              {isEmbedded ? 'Embedded' : 'Circuit'}
                            </span>
                          </div>
                        </div>
                        <ChevronRight size={20} color="#334155" />
                        {/* Delete button — hidden until hover */}
                        <button
                          className="del-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget({ id: circuit.id, name: circuit.name || 'Untitled Project' });
                          }}
                          title="Delete project"
                          style={{
                            position: 'absolute', top: 10, right: 10,
                            opacity: 0, transition: 'opacity 0.2s',
                            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                            borderRadius: 8, padding: '5px 7px', cursor: 'pointer', color: '#ef4444',
                            display: 'flex', alignItems: 'center',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ 
                  padding: '60px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', 
                  border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '24px' 
                }}>
                  <Cpu size={40} color="#1e293b" style={{ marginBottom: '16px' }} />
                  <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px' }}>No projects yet</h4>
                  <p style={{ color: '#475569', fontSize: '14px', marginBottom: '24px' }}>Start your first electronic masterpiece today!</p>
                  <button 
                    onClick={() => navigate('/simulator')}
                    style={{
                      padding: '10px 24px', background: 'rgba(92, 225, 230, 0.1)', color: '#5ce1e6',
                      border: '1px solid rgba(92, 225, 230, 0.2)', borderRadius: '12px', fontWeight: '600', cursor: 'pointer'
                    }}
                  >
                    Launch Simulator
                  </button>
                </div>
              )}
            </section>

            {/* Profile Section */}
            <motion.section 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              style={{
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(2, 6, 23, 0.8))',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '24px',
                padding: '32px',
                display: 'flex',
                alignItems: 'center',
                gap: '24px'
              }}
            >
              <div style={{ 
                width: '80px', height: '80px', borderRadius: '24px', 
                background: 'linear-gradient(135deg, #c2a8f7, #5ce1e6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '32px', fontWeight: '800', color: '#000',
                boxShadow: '0 10px 30px rgba(92, 225, 230, 0.3)'
              }}>
                {getInitials()}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>{user?.user_metadata?.full_name || 'Electronics Enthusiast'}</h3>
                <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '8px' }}>{user?.email}</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                    background: `${planColor}20`, color: planColor, border: `1px solid ${planColor}40`
                  }}>
                    {PLAN_LABELS[plan]}
                  </span>
                  <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', color: '#64748b', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {formatLimit(TOKEN_LIMIT)} tokens/day
                  </span>
                  <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', color: '#64748b', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {formatLimit(MESSAGE_LIMIT)} messages/day
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button style={{ 
                  padding: '10px 20px', background: 'rgba(255,255,255,0.05)', color: '#fff', 
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontWeight: '600', cursor: 'pointer'
                }}>
                  Edit Profile
                </button>
              </div>
            </motion.section>

          </div>
        </main>
      </div>
    </div>
  );
}
