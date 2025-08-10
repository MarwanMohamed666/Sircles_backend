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
  checkUserExists: (email: string) => Promise<{ exists: boolean; error: any }>;
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
  checkUserExists: async () => ({ exists: false, error: null }),
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

  const fetchUserProfile = async (authUser: AuthUser) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error);
        return;
      }

      if (data) {
        setUserProfile(data);
      } else {
        // Create user profile if it doesn't exist
        const newProfile = {
          id: authUser.id, // Use auth.uid() directly as the user ID
          email: authUser.email || '',
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
          phone: null,
          dob: null,
          gender: null,
          address_apartment: null,
          address_building: null,
          address_block: null,
          avatar_url: null,
          creationdate: new Date().toISOString(),
        };

        const { data: insertedUser, error: insertError } = await supabase
          .from('users')
          .insert(newProfile)
          .select()
          .single();

        if (insertError) {
          console.error('Error creating user profile:', insertError);
        } else {
          setUserProfile(insertedUser);
        }
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user);
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
        fetchUserProfile(session.user);
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

    return { error };
  };

  const updateUserProfile = async (profile: Partial<User>) => {
    if (!user || !userProfile) return { error: new Error('No user logged in') };

    try {
      const { data, error } = await supabase
        .from('users')
        .update(profile)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        return { error };
      }

      if (data) {
        setUserProfile(data);
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    console.log('🔴 AUTH CONTEXT: signOut function called');
    
    try {
      console.log('🔴 AUTH CONTEXT: About to call supabase.auth.signOut()');
      const { error } = await supabase.auth.signOut();
      
      console.log('🔴 AUTH CONTEXT: supabase.auth.signOut() completed');
      console.log('🔴 AUTH CONTEXT: signOut result:', { error });
      
      if (error) {
        console.error('🔴 AUTH CONTEXT ERROR: Supabase signOut error:', error);
        throw error;
      }
      
      console.log('🔴 AUTH CONTEXT: signOut successful, clearing state');
      
    } catch (error) {
      console.error('🔴 AUTH CONTEXT CATCH: Error signing out:', error);
      console.log('🔴 AUTH CONTEXT: Setting user/profile/session to null due to error');
      setUser(null);
      setUserProfile(null);
      setSession(null);
      throw error;
    }
  };

  const checkUserExists = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { exists: false, error: null };
        }
        console.error('Error checking user existence:', error);
        return { exists: false, error };
      }

      return { exists: !!data, error: null };
    } catch (error) {
      console.error('Error in checkUserExists:', error);
      return { exists: false, error };
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
    checkUserExists,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};