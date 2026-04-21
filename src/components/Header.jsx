import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronDown, Zap } from 'lucide-react';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
                  style={{
                    position: 'absolute', top: '100%', left: '-20px', paddingTop: '10px'
                  }}
                >
                  <div style={{
                    background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px', padding: '8px', minWidth: '220px', backdropFilter: 'blur(10px)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                  }}>
                    <Link to="/simulator" style={{ display: 'block', padding: '12px 16px', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontSize: '15px' }} onMouseEnter={(e) => e.currentTarget.style.background='rgba(92,225,230,0.1)'} onMouseLeave={(e) => e.currentTarget.style.background='transparent'}>
                      Circuit Simulator
                    </Link>
                    <Link to="/embedded" style={{ display: 'block', padding: '12px 16px', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontSize: '15px' }} onMouseEnter={(e) => e.currentTarget.style.background='rgba(92,225,230,0.1)'} onMouseLeave={(e) => e.currentTarget.style.background='transparent'}>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Link to="/" style={{ color: '#fff', textDecoration: 'none', fontSize: '16px', fontWeight: '600' }}>Log in</Link>
          <Link to="/simulator" style={{ 
            background: 'linear-gradient(90deg, #c2a8f7, #5ce1e6)', color: '#000', 
            textDecoration: 'none', padding: '10px 20px', borderRadius: '24px', 
            fontSize: '16px', fontWeight: '700', transition: 'transform 0.2s',
            boxShadow: '0 4px 12px rgba(92, 225, 230, 0.4)'
          }} onMouseEnter={(e) => e.currentTarget.style.transform='scale(1.05)'} onMouseLeave={(e) => e.currentTarget.style.transform='scale(1)'}>
            Try Simulator
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
