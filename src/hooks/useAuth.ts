import { useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true,
  });

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data;
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
        }));

        if (session?.user) {
          setTimeout(async () => {
            const profile = await fetchProfile(session.user.id);
            setState(prev => ({ ...prev, profile, loading: false }));
          }, 0);
        } else {
          setState(prev => ({ ...prev, profile: null, loading: false }));
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
      }));

      if (session?.user) {
        fetchProfile(session.user.id).then(profile => {
          setState(prev => ({ ...prev, profile, loading: false }));
        });
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState({
      user: null,
      session: null,
      profile: null,
      loading: false,
    });
  }, []);

  const hasModule = useCallback((module: 'media' | 'merchandising' | 'financeiro') => {
    // Financeiro module has special access rules (not stored in profile.modules)
    if (module === 'financeiro') {
      // Super Admin always has access
      if (state.profile?.role === 'super_admin') return true;
      // Directors and Coordinators can view (read-only)
      if (['director', 'coordenador_compras'].includes(state.profile?.role || '')) return true;
      return false;
    }
    // For other modules, check profile.modules
    return state.profile?.modules?.includes(module as 'media' | 'merchandising') ?? false;
  }, [state.profile]);

  const canAccessRoute = useCallback((allowedRoles: string[]) => {
    if (!state.profile) return false;
    return allowedRoles.includes(state.profile.role);
  }, [state.profile]);

  return {
    user: state.user,
    session: state.session,
    profile: state.profile,
    loading: state.loading,
    isAuthenticated: !!state.session,
    signOut,
    hasModule,
    canAccessRoute,
  };
}
