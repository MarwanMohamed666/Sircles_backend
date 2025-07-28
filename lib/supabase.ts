
import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://vilusrqckdqwzxgwuixt.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpbHVzcnFja2Rxd3p4Z3d1aXh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2ODYzMTIsImV4cCI6MjA2OTI2MjMxMn0.vqKutz7UnGe_3LPy7nliIZy-iDXkq0UdxPBtNLgB5pk"

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
