import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

// Plan quota definitions
const PLAN_QUOTAS = {
  free:  { tokenLimit: 20_000,  messageLimit: 20 },
  pro:   { tokenLimit: 250_000, messageLimit: 200 },
  team:  { tokenLimit: Infinity, messageLimit: Infinity },
};

// This context provides the logged-in user to any component in the app.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // null = not logged in
  const [isLoading, setIsLoading] = useState(true); // true while checking session

  const [tokenUsage, setTokenUsage]   = useState(0);
  const [messageUsage, setMessageUsage] = useState(0);
  const [recentCircuits, setRecentCircuits] = useState([]);
  const [plan, setPlan] = useState('free'); // 'free' | 'pro' | 'team'

  // Derive limits from plan
  const TOKEN_LIMIT   = PLAN_QUOTAS[plan]?.tokenLimit   ?? 20_000;
  const MESSAGE_LIMIT = PLAN_QUOTAS[plan]?.messageLimit ?? 20;

  const fetchUserData = async (userId) => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Fetch profile plan
      const { data: profileData } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', userId)
        .maybeSingle();

      if (profileData?.plan) setPlan(profileData.plan);

      // Fetch token + message usage
      const { data: usageData } = await supabase
        .from('daily_token_usage')
        .select('tokens_used, messages_sent')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle();

      if (usageData) {
        setTokenUsage(usageData.tokens_used ?? 0);
        setMessageUsage(usageData.messages_sent ?? 0);
      }

      // Fetch recent circuits (both types) — order by id desc as a safe fallback
      try {
        const { data: circuitsData, error: circuitsError } = await supabase
          .from('circuit_projects')
          .select('id, name, project_type, created_at')
          .eq('user_id', userId)
          .order('id', { ascending: false })
          .limit(6);

        if (circuitsError) console.warn('Could not load recent circuits:', circuitsError.message);
        else if (circuitsData) setRecentCircuits(circuitsData);
      } catch (circuitsErr) {
        console.warn('Recent circuits fetch failed:', circuitsErr);
      }
    } catch (err) {
      console.error('Error fetching user dashboard data:', err);
    }
  };

  useEffect(() => {
    // 1. On first load, check session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) fetchUserData(u.id);
      setIsLoading(false);
    });

    // 2. Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) fetchUserData(u.id);
      else {
        setTokenUsage(0);
        setMessageUsage(0);
        setRecentCircuits([]);
        setPlan('free');
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Helper to sign out
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      signOut,
      plan,
      tokenUsage,
      messageUsage,
      TOKEN_LIMIT,
      MESSAGE_LIMIT,
      // Legacy alias kept for backward compatibility
      DAILY_LIMIT: TOKEN_LIMIT,
      recentCircuits,
      refreshData: () => user && fetchUserData(user.id),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook — any component can call useAuth() to get { user, isLoading, signOut, ... }
export function useAuth() {
  return useContext(AuthContext);
}
