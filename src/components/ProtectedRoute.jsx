import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Wrap any <Route> with this to require login.
 * If the user is not logged in, they are sent to /auth instead.
 * While the session is still being checked (first page load), shows nothing.
 */
export default function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    // Brief loading state — avoids a flash redirect before session is confirmed
    return (
      <div style={{
        minHeight: '100vh', background: '#020617',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#5ce1e6', fontFamily: 'Inter, sans-serif', fontSize: '18px'
      }}>
        Loading…
      </div>
    );
  }

  if (!user) {
    // Not logged in → redirect to the auth page
    return <Navigate to="/auth" replace />;
  }

  return children;
}
