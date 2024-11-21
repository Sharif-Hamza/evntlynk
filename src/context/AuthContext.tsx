import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import type { User, Club } from '../types';

interface AuthContextType {
  user: User | null;
  userClub: Club | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [userClub, setUserClub] = useState<Club | null>(null);

  // Use React Query for session management
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['auth-session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  // Fetch user profile and club when session changes
  const { isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*, clubs(*)')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;

      if (profile) {
        setUser(profile);
        if (profile.club_id) {
          const { data: club, error: clubError } = await supabase
            .from('clubs')
            .select('*')
            .eq('id', profile.club_id)
            .single();

          if (clubError) throw clubError;
          setUserClub(club);

          // Update username for club admins if not set
          if (profile.role === 'club_admin' && (!profile.username || profile.username !== club.name)) {
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ 
                username: club.name,
                updated_at: new Date().toISOString()
              })
              .eq('id', profile.id);

            if (updateError) throw updateError;
          }
        }
      }
      return profile;
    },
    enabled: !!session?.user?.id,
  });

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setUserClub(null);
          navigate('/');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setUserClub(null);
      navigate('/');
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user,
        userClub,
        loading: sessionLoading || profileLoading,
        signOut 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}