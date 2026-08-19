import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const fetchProfile = useCallback(async (accessToken) => {
    setProfileLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/profiles/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      setProfile(res.ok ? data.profile : null);
    } catch {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!session?.access_token) {
      setProfile(null);
      return;
    }
    fetchProfile(session.access_token);
  }, [session?.user?.id, session?.access_token, fetchProfile]);

  async function signOut() {
    await supabase.auth.signOut();
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    profileLoading,
    refetchProfile: () => (session?.access_token ? fetchProfile(session.access_token) : Promise.resolve()),
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
