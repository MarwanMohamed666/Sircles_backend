import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// =========================
// Load ENV variables
// =========================
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Debugging logs
console.log('🔹 Supabase Config Debug:');
console.log('URL:', supabaseUrl || '❌ MISSING');
console.log('Anon Key:', supabaseAnonKey ? 'Set' : '❌ MISSING');

// Throw clear error if missing variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    `❌ Missing Supabase environment variables!
Make sure you have set them correctly in your .env file:
EXPO_PUBLIC_SUPABASE_URL=your-url-here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here`
  );
}

// =========================
// Create Supabase client
// =========================
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'react-native-app',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  db: {
    schema: 'public',
  },
});

// =========================
// Test Supabase connection
// =========================
(async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('❌ Supabase connection test failed:', error.message);
    } else {
      console.log('✅ Supabase connection test successful:', data.session ? 'Session Found' : 'No Active Session');
    }
  } catch (err) {
    console.error('❌ Supabase connection test threw error:', err);
  }
})();
