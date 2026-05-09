// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { supabase, type UserProfile } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  loading: boolean;
  fetchUserProfile: (userId: string, authUser?: User | null) => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const ensureUserProfile = useCallback(async (authUser: User): Promise<UserProfile | null> => {
    const metadata = authUser.user_metadata ?? {};
    const profilePayload = {
      id: authUser.id,
      first_name: metadata.first_name ?? '',
      middle_name: metadata.middle_name ?? null,
      last_name: metadata.last_name ?? '',
      email: authUser.email ?? metadata.email ?? '',
      phone: metadata.phone ?? '',
      gender: metadata.gender ?? null,
      nationality: metadata.nationality ?? 'Tanzanian',
      nida_number: metadata.nida_number ?? null,
      id_type: metadata.id_type ?? null,
      id_number: metadata.id_number ?? null,
      passport_number: metadata.passport_number ?? null,
      role: metadata.role ?? 'citizen',
      is_verified: Boolean(metadata.is_verified),
      is_diaspora: Boolean(metadata.is_diaspora),
      region: metadata.region ?? null,
      district: metadata.district ?? null,
      ward: metadata.ward ?? null,
      street: metadata.street ?? null,
    };

    const { data, error } = await supabase
      .from('users')
      .upsert(profilePayload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as UserProfile;
  }, []);

  const fetchUserProfile = useCallback(async (userId: string, authUser?: User | null): Promise<void> => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .rpc('get_user_profile', { user_id: userId });

      if (error) throw error;

      const profile = Array.isArray(data) ? data[0] : data;
      if (profile) {
        setUser(profile as UserProfile);
        setLoading(false);
        return;
      }

      if (authUser) {
        const createdProfile = await ensureUserProfile(authUser);
        setUser(createdProfile);
        setLoading(false);
        return;
      }

      setUser(null);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      setUser(null);
      setLoading(false);
    }
  }, [ensureUserProfile]);

  // Initialize auth + realtime listener
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();

        if (isMounted) {
          setSession(initialSession);
          if (initialSession?.user?.id) {
            await fetchUserProfile(initialSession.user.id, initialSession.user);
          } else {
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    // Realtime auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !currentSession)) {
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setSession(currentSession);

      if (currentSession?.user?.id) {
        setLoading(true);
        window.setTimeout(() => {
          if (!isMounted) return;
          void fetchUserProfile(currentSession.user.id, currentSession.user);
        }, 0);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) {
      await fetchUserProfile(session.user.id, session.user);
    }
  }, [session, fetchUserProfile]);

  // Stable context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    session,
    loading,
    fetchUserProfile,
    refreshProfile,
    signOut,
  }), [user, session, loading, fetchUserProfile, refreshProfile, signOut]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}