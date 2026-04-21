import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import CircuitSimulator from './pages/CircuitSimulator';
import EmbeddedSimulator from './pages/EmbeddedSimulator';
import Enterprise from './pages/Enterprise';
import Pricing from './pages/Pricing';
import ContactUs from './pages/ContactUs';
import './index.css';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/enterprise" element={<Enterprise />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/simulator" element={<CircuitSimulator />} />
        <Route path="/embedded" element={<EmbeddedSimulator />} />
      </Routes>
    </Router>
  );
}