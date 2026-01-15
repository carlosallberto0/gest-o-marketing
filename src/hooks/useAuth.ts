import { useEffect, useState, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

const fetchProfile = async (userId: string): Promise<Profile | null> => {
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
};

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const queryClient = useQueryClient();

  const userId = user?.id;

  // Use React Query for profile with caching
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000,   // 10 minutes in garbage collector
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (!newSession?.user) {
          // Clear profile cache when user logs out
          queryClient.removeQueries({ queryKey: ['profile'] });
        }
        
        setInitialLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setInitialLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const loading = useMemo(() => {
    if (initialLoading) return true;
    if (userId && profileLoading) return true;
    return false;
  }, [initialLoading, userId, profileLoading]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.removeQueries({ queryKey: ['profile'] });
    setSession(null);
    setUser(null);
  }, [queryClient]);

  const hasModule = useCallback((module: 'media' | 'merchandising' | 'financeiro') => {
    // Financeiro module has special access rules (not stored in profile.modules)
    if (module === 'financeiro') {
      // Super Admin always has access
      if (profile?.role === 'super_admin') return true;
      // Directors and Coordinators can view (read-only)
      if (['director', 'coordenador_compras'].includes(profile?.role || '')) return true;
      return false;
    }
    // For other modules, check profile.modules
    return profile?.modules?.includes(module as 'media' | 'merchandising') ?? false;
  }, [profile]);

  const canAccessRoute = useCallback((allowedRoles: string[]) => {
    if (!profile) return false;
    return allowedRoles.includes(profile.role);
  }, [profile]);

  return {
    user,
    session,
    profile: profile ?? null,
    loading,
    isAuthenticated: !!session,
    signOut,
    hasModule,
    canAccessRoute,
  };
}
