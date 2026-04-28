import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Cpu, Activity, Play } from 'lucide-react';
import Header from '../components/Header';
import circuitBg from '../assets/circuit-bg.jpg';
import FeatureCard, { FlowingLinesAnimation } from '../components/FeatureCard';
import DemoBrowser from '../components/DemoBrowser';
import InteractiveGlobe from '../components/InteractiveGlobe';
import { Layers, Shield } from 'lucide-react';

export default function LandingPage() {
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 }); // start offscreen

  useEffect(() => {
    let rafId = null;
    const handleMouseMove = (e) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setMousePos({ x: e.clientX, y: e.clientY });
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: '#020617', color: '#fff', overflowX: 'hidden', fontFamily: 'Inter, sans-serif' }}>
      <Header />
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundImage: `url(${circuitBg})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.15, zIndex: 0, pointerEvents: 'none' }} />

      {/* Torch effect glow following cursor */}
      <div style={{
        position: 'fixed',
        top: mousePos.y,
        left: mousePos.x,
        transform: 'translate(-50%, -50%)',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(92, 225, 230, 0.34) 0%, rgba(255, 0, 238, 0) 60%)',
        pointerEvents: 'none',
        zIndex: 0,
        transition: 'transform 0.1s ease-out'
      }} />

      {/* Hero Section */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 24px', zIndex: 2, textAlign: 'center' }}>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            style={{ fontSize: 'Clamp(50px, 8vw, 84px)', fontWeight: '800', lineHeight: '1.05', letterSpacing: '-2px', marginBottom: '24px' }}
          >
            Bridging the AI gap for<br />
            <span style={{ background: 'linear-gradient(90deg, #c2a8f7, #5ce1e6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              hardware simulation
            </span>
          </motion.h1>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            style={{ fontSize: 'Clamp(20px, 3vw, 28px)', fontWeight: '400', color: '#94a3b8', marginBottom: '48px', maxWidth: '800px', margin: '0 auto 48px auto' }}
          >
            The World's First AI-Powered circuit simulator.
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <Link to="/simulator" style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '16px 32px', background: 'linear-gradient(90deg, #c2a8f7, #5ce1e6)', color: '#000', textDecoration: 'none', borderRadius: '30px', fontSize: '18px', fontWeight: '700', transition: 'transform 0.2s', boxShadow: '0 10px 30px rgba(92, 225, 230, 0.3)'
            }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
              Launch Simulator <Play size={20} fill="currentColor" />
            </Link>
            <Link to="/embedded" style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '16px 32px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', textDecoration: 'none', borderRadius: '30px', fontSize: '18px', fontWeight: '600', transition: 'background 0.2s'
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
              Explore Embedded <Cpu size={20} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Vision Section */}
      <section style={{ padding: '120px 24px', background: '#0f172a', borderTop: '1px solid rgba(255,255,255,0.05)', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '64px', alignItems: 'center' }}
          >
            <div>
              <h2 style={{ fontSize: '40px', fontWeight: '800', marginBottom: '24px', letterSpacing: '-1px' }}>Our Vision</h2>
              <p style={{ fontSize: '18px', color: '#94a3b8', lineHeight: '1.7', marginBottom: '24px' }}>
                Founded by Tan Kang and Lee Ken Hyi, Undergraduates at Xiamen University Malaysia studying Robotics and Automation Engineering.
              </p>
              <p style={{ fontSize: '18px', color: '#94a3b8', lineHeight: '1.7' }}>
                Our company vision is to integrate AI heavily into hardware simulations. We are solving the harsh reality of spatial awareness for current AI, paving the way for further improvements as AI models advance nearer to AGI.
              </p>
            </div>

            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: '-20px', left: '-20px', right: '20px', bottom: '20px', border: '1px solid rgba(92, 225, 230, 0.3)', borderRadius: '16px' }} />
              <div style={{ background: '#1e293b', padding: '48px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', position: 'relative', zIndex: 1, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                <Activity color="#5ce1e6" size={48} style={{ marginBottom: '24px' }} />
                <h3 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '16px' }}>Spatial Awareness for AI</h3>
                <p style={{ color: '#cbd5e1', lineHeight: '1.7', fontSize: '16px' }}>
                  Current generation Large Language Models persistently struggle with spatial reasoning in 2D hardware topologies. CirSimAI provides the ultimate bridging mechanism allowing generative models to natively "see" and interact with the circuit schema.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 1. The Demo Section (Actual Video) */}
      <section style={{ padding: '50px 24px', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 style={{ fontSize: '48px', fontWeight: '800', marginBottom: '16px' }}>Experience the Performance</h2>
            <p style={{ color: '#94a3b8', fontSize: '20px' }}>Real-time hardware simulation at your fingertips.</p>
          </div>
          <DemoBrowser
            videoSrc="/videos/0428.mp4"
            accentColor="#5ce1e6"
          />
        </div>
      </section>

      {/* 2. The Features Grid (Spotlight Cards) */}
      <section style={{ padding: '150px 24px', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '32px' }}>
            <FeatureCard
              title="Intelligent AI CS"
              description="Seamlessly bridge the gap between text prompts and circuit netlists with our specialized LLM fine-tuning."
            >
              <FlowingLinesAnimation color="#5ce1e6" />
            </FeatureCard>

            <FeatureCard
              title="Automated Smart CRM"
              accentColor="#c2a8f7"
              description="Manage your circuit projects and component inventory with an integrated, AI-assisted dashboard."
            >
              <div style={{ padding: '20px', background: 'rgba(194, 168, 247, 0.05)', borderRadius: '12px', border: '1px dashed rgba(194, 168, 247, 0.2)', width: '100%', height: '180px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Layers color="#c2a8f7" size={32} />
                <div style={{ height: '8px', width: '60%', background: 'rgba(194, 168, 247, 0.2)', borderRadius: '4px' }} />
                <div style={{ height: '8px', width: '80%', background: 'rgba(194, 168, 247, 0.1)', borderRadius: '4px' }} />
                <div style={{ height: '8px', width: '40%', background: 'rgba(194, 168, 247, 0.1)', borderRadius: '4px' }} />
              </div>
            </FeatureCard>

            <FeatureCard
              title="High-Performance Simulation"
              accentColor="#5ce1e6"
              description="Engineered for speed. Run complex SPICE simulations directly in your browser with WASM technology."
            >
              <div style={{ position: 'relative', width: '100%', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'radial-gradient(circle, #5ce1e644 0%, transparent 70%)' }}
                />
                <Activity color="#5ce1e6" size={48} style={{ position: 'absolute' }} />
              </div>
            </FeatureCard>
          </div>
        </div>
      </section>

      {/* 3. The Globe Section */}
      <section style={{ padding: '160px 24px', background: '#020617', position: 'relative', zIndex: 5, overflow: 'visible' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
          <div style={{ maxWidth: '600px', position: 'relative', zIndex: 2 }}>
            <h2 style={{ fontSize: '56px', fontWeight: '800', marginBottom: '24px', letterSpacing: '-2px' }}>Global Infrastructure</h2>
            <p style={{ fontSize: '20px', color: '#94a3b8', lineHeight: '1.7', marginBottom: '32px' }}>
              Our simulation engine is distributed across global edge nodes, ensuring low latency for hardware engineers from Surabaya to Malaysia and beyond.
            </p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
                <div style={{ color: '#5ce1e6', fontWeight: '700', fontSize: '24px' }}>99.9%</div>
                <div style={{ color: '#64748b', fontSize: '14px' }}>Uptime</div>
              </div>
              <div style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
                <div style={{ color: '#c2a8f7', fontWeight: '700', fontSize: '24px' }}>&lt;50ms</div>
                <div style={{ color: '#64748b', fontSize: '14px' }}>Latency</div>
              </div>
            </div>
          </div>

          {/* Large Globe positioned behind the text */}
          <div style={{
            position: 'absolute',
            top: '60%',
            right: '-25%',
            transform: 'translateY(-50%)',
            width: '900px',
            height: '900px',
            zIndex: 1,
            pointerEvents: 'none',
            opacity: 1.0
          }}>
            <InteractiveGlobe color="#5ce1e6" height="100%" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '60px 24px', background: '#020617', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', zIndex: 2, position: 'relative' }}>
        <p style={{ color: '#64748b', fontSize: '15px' }}>© {new Date().getFullYear()} CirSimAI. All rights reserved. Pioneering AGI for Hardware.</p>
      </footer>
    </div>
  );
}
