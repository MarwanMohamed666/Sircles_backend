import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User as AuthUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types/database';
import { router } from 'expo-router';

// Assuming DatabaseService is correctly imported and has the necessary methods
// import DatabaseService from '@/lib/databaseService'; // Placeholder for actual import

// Dummy DatabaseService for demonstration purposes if not provided
const DatabaseService = {
  updateUser: async (userId: string, updates: Partial<User>) => {
    console.log(`DatabaseService.updateUser called for ${userId} with`, updates);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
    // Simulate returning a user object similar to what supabase might return
    const dummyUser: User = {
      id: userId,
      email: `${userId}@example.com`,
      name: 'Dummy User',
      phone: null,
      dob: null,
      gender: null,
      address_apartment: null,
      address_building: null,
      address_block: null,
      avatar_url: null,
      creationdate: new Date().toISOString(),
      first_login: false, // Defaulting to false for simulation
      ...updates
    };
    return { data: dummyUser, error: null };
  },
  checkFirstLogin: async (userId: string) => {
    console.log(`DatabaseService.checkFirstLogin called for ${userId}`);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
    // Simulate checking the first_login column
    // In a real scenario, this would query the 'users' table for the user and return the 'first_login' value.
    // For this example, let's assume we fetch the user profile and check it.
    const { data, error } = await supabase
      .from('users')
      .select('first_login')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error checking first login:', error);
        return { data: false, error: error };
    }

    return { data: data?.first_login || false, error: null };
  }
};


interface AuthContextType {
  user: AuthUser | null;
  userProfile: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ data: { session: Session | null; user: AuthUser } | null; error: any }>;
  signUp: (email: string, password: string) => Promise<{ data: { session: Session | null; user: AuthUser } | null; error: any }>;
  signOut: () => Promise<void>;
  updateUserProfile: (profile: Partial<User>) => Promise<{ error: any }>;
  checkUserExists: (email: string) => Promise<{ exists: boolean; error: any }>;
  checkFirstLogin: () => Promise<{ data: boolean; error: any }>; // Added checkFirstLogin
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  session: null,
  loading: true,
  signIn: async () => ({ data: { session: null, user: null as any }, error: null }),
  signUp: async () => ({ data: { session: null, user: null as any }, error: null }),
  signOut: async () => {},
  updateUserProfile: async () => ({ error: null }),
  checkUserExists: async () => ({ exists: false, error: null }),
  checkFirstLogin: async () => ({ data: false, error: null }), // Default value
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

  // Function to load user profile and check first login status
  const loadUserAndCheckLogin = async (authUser: AuthUser) => {
    try {
      // Fetch user profile first
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
        // Check first login status from fetched profile
        if (data.first_login) {
          console.log('User is logging in for the first time. Will be directed to interests selection.');
          // Check first login status
          const { data: firstLoginData, error: firstLoginError } = await DatabaseService.checkFirstLogin(authUser.id);
          console.log('First login check result:', { data: firstLoginData, error: firstLoginError });

          if (firstLoginError) {
            console.error('Error checking first login:', firstLoginError);
          }

          if (firstLoginData === true) {
            console.log('User needs first-time setup, redirecting...');
            router.replace('/first-time-setup');
            return;
          }

          console.log('User has completed setup, proceeding to app...');
        }
      } else {
        // Create user profile if it doesn't exist
        const newProfile: User = {
          id: authUser.id,
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
          first_login: true, // Mark as first login if profile is newly created
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
          console.log('New user profile created. Directing to interests selection.');
        }
      }
    } catch (error) {
      console.error('Error in loadUserAndCheckLogin:', error);
    }
  };


  useEffect(() => {
    const fetchSession = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (session?.user) {
          setUser(session.user);
          await loadUserAndCheckLogin(session.user); // Call the combined function
        } else {
          setUser(null);
          setUserProfile(null);
        }
      } catch (error) {
        console.error("Error fetching session:", error);
        setUser(null);
        setUserProfile(null);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setUser(session.user);
        loadUserAndCheckLogin(session.user); // Call the combined function
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Mock loadUser function if it's intended to be used elsewhere, otherwise integrate logic directly
  const loadUser = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile in loadUser:', error);
        return;
      }

      if (data) {
        setUserProfile(data);
        // Check first login status here as well if needed, or rely on loadUserAndCheckLogin
        if (data.first_login) {
          console.log('User logging in again, first_login is true.');
          // Logic to redirect to interests page
        }
      }
    } catch (error) {
      console.error('Error in loadUser:', error);
    }
  };


  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && data.user) {
      // loadUser(data.user.id); // Original call, now superseded by loadUserAndCheckLogin in useEffect
      await loadUserAndCheckLogin(data.user); // Ensure profile and first login check happens
    }

    return { data, error };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    // If signup is successful, create the user profile and set first_login to true
    if (!error && data.user) {
      try {
        const newProfile: User = {
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
          phone: null,
          dob: null,
          gender: null,
          address_apartment: null,
          address_building: null,
          address_block: null,
          avatar_url: null,
          creationdate: new Date().toISOString(),
          first_login: true, // Mark as first login
        };

        const { error: insertError } = await supabase
          .from('users')
          .insert(newProfile);

        if (insertError) {
          console.error('Error creating user profile after signup:', insertError);
          // Handle error appropriately, maybe return an error to the caller
          return { data, error: insertError };
        }
      } catch (e) {
        console.error('Exception creating user profile after signup:', e);
        return { data, error: e };
      }
    }

    return { data, error };
  };

  const updateUserProfile = async (profile: Partial<User>) => {
    if (!user?.id) return { error: new Error('No user logged in') };

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

  // Function to check the first login status using the new DatabaseService method
  const checkFirstLogin = async () => {
    if (!user?.id) return { data: false, error: new Error('No user logged in') };
    // Ensure DatabaseService is correctly imported and checkFirstLogin is available
    return await DatabaseService.checkFirstLogin(user.id);
  };


  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Supabase signOut error:', error);
        throw error;
      }

      // Clear auth state
      setUser(null);
      setUserProfile(null);
      setSession(null);

    } catch (error) {
      console.error('Error signing out:', error);
      // Clear state even on error to ensure user gets logged out
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
    checkFirstLogin, // Export checkFirstLogin
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};