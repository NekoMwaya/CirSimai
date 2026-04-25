import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import CircuitSimulator from './pages/CircuitSimulator';
import EmbeddedSimulator from './pages/EmbeddedSimulator';
import Enterprise from './pages/Enterprise';
import Pricing from './pages/Pricing';
import ContactUs from './pages/ContactUs';
import './index.css';

export default function App() {
  return (
    // AuthProvider wraps everything so any component can access the logged-in user
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/enterprise" element={<Enterprise />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/embedded" element={<EmbeddedSimulator />} />

          {/* /simulator is protected — guests are redirected to /auth */}
          <Route
            path="/simulator"
            element={
              <ProtectedRoute>
                <CircuitSimulator />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}