import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User as AuthUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types/database';

interface AuthContextType {
  user: AuthUser | null;
  userProfile: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateUserProfile: (profile: Partial<User>) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  session: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  updateUserProfile: async () => ({ error: null }),
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);

        // If user doesn't exist, create a minimal profile from auth data
        if (error.code === 'PGRST116') {
          const { data: authUser } = await supabase.auth.getUser();
          if (authUser.user) {
            const minimalProfile = {
              id: userId,
              email: authUser.user.email || '',
              name: authUser.user.user_metadata?.name || authUser.user.email?.split('@')[0] || 'User',
              phone: null,
              dob: null,
              gender: null,
              address_apartment: null,
              address_building: null,
              address_block: null,
              avatar_url: null,
              bio: null,
              creationdate: new Date().toISOString(),
            };

            // Try to insert the profile
            const { data: insertedUser, error: insertError } = await supabase
              .from('users')
              .insert(minimalProfile)
              .select()
              .single();

            if (insertError) {
              console.error('Error creating user profile:', insertError);
              // If insert fails due to RLS, still set the minimal profile in state
              setUserProfile(minimalProfile as any);
            } else {
              setUserProfile(insertedUser);
            }
          }
        }
        return;
      }

      setUserProfile(data);
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      // In case of any error, try to get auth user data
      try {
        const { data: authUser } = await supabase.auth.getUser();
        if (authUser.user) {
          setUserProfile({
            id: userId,
            email: authUser.user.email || '',
            name: authUser.user.user_metadata?.name || authUser.user.email?.split('@')[0] || 'User',
          } as any);
        }
      } catch (authError) {
        console.error('Error getting auth user:', authError);
      }
    }
  };

  const createUserProfile = async (authUser: any) => {
    const newProfile = {
      id: authUser.id,
      email: authUser.email,
      name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
      creationdate: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('users')
      .insert(newProfile)
      .select()
      .single();

    if (!error && data) {
      setUserProfile(data);
    } else {
      console.error('Error creating user profile:', error);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    // Create user profile after signup
    if (!error && data.user) {
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email,
          name: data.user.email?.split('@')[0] || 'User',
          creationdate: new Date().toISOString(),
        });

      if (profileError) {
        console.error('Error creating user profile:', profileError);
      }
    }

    return { error };
  };

  const updateUserProfile = async (profile: Partial<User>) => {
    if (!user) return { error: new Error('No user logged in') };

    const { error } = await supabase
      .from('users')
      .update(profile)
      .eq('id', user.id);

    if (!error) {
      // Refresh user profile
      await fetchUserProfile(user.id);
    }

    return { error };
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        throw error;
      }
      // State will be cleared automatically by the auth state change listener
    } catch (error) {
      console.error('Error signing out:', error);
      // Clear state manually if signOut fails
      setUser(null);
      setUserProfile(null);
      setSession(null);
      throw error;
    }
  };

  const value = {
    user,
    userProfile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};