
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useLanguage } from '@/contexts/LanguageContext';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function LoginScreen() {
  const { texts, toggleLanguage, language, isRTL } = useLanguage();
  const { signIn, checkUserExists, checkFirstLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  const handleLogin = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);

    try {
      // If no password is provided, check if user exists and handle first-time setup
      if (!password) {
        const { exists, error: checkError } = await checkUserExists(email);

        if (checkError) {
          Alert.alert('Error', 'Failed to check user status');
          setLoading(false);
          return;
        }

        if (!exists) {
          // New user - redirect to password setup
          router.push({
            pathname: '/password-setup',
            params: { email }
          });
          setLoading(false);
          return;
        } else {
          // Existing user but no password provided
          Alert.alert('Error', 'Please enter your password');
          setLoading(false);
          return;
        }
      }

      // Regular login flow with email and password
      const { error } = await signIn(email, password);

      if (error) {
        // For any authentication error, show generic message for security
        if (error.message?.includes('Invalid login credentials') || 
            error.message?.includes('Email not confirmed') ||
            error.message?.includes('Invalid') ||
            error.message?.includes('Wrong')) {
          Alert.alert('Login Error', 'Wrong email or password. Please try again.');
        } else {
          // For other errors, check if user exists
          const { exists } = await checkUserExists(email);
          if (!exists) {
            Alert.alert(
              'Account Not Found',
              'This email is not registered. Please check your email or create a new account.',
              [
                {
                  text: 'Create Account',
                  onPress: () => router.push({
                    pathname: '/password-setup',
                    params: { email }
                  })
                },
                { text: 'Cancel' }
              ]
            );
          } else {
            Alert.alert('Login Error', 'Wrong email or password. Please try again.');
          }
        }
      } else {
        // Check if admin user
        if (email === 'admin@example.com') {
          router.replace('/admin');
        } else {
          // Check if this is first login
          const { data: isFirstLogin } = await checkFirstLogin();

          if (isFirstLogin) {
            router.replace('/first-time-setup');
          } else {
            router.replace('/(tabs)');
          }
        }
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <ThemedView style={styles.content}>
        {/* Language Toggle */}
        <View style={styles.languageToggle}>
          <TouchableOpacity
            style={styles.langButton}
            onPress={toggleLanguage}
          >
            <ThemedText style={styles.langText}>
              {language === 'en' ? 'العربية' : 'English'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Header with House Icon and Branding */}
        <View style={styles.header}>
          <View style={styles.houseIcon}>
            <ThemedText style={styles.houseText}>🏠</ThemedText>
          </View>
          <ThemedText style={styles.brandTitle}>Sircles</ThemedText>
          <ThemedText style={styles.tagline}>Your Community, Your Space</ThemedText>
        </View>

        {/* Login Form */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, { color: textColor }]}
              placeholder="Username"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <View style={styles.underline} />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[styles.input, styles.passwordInput, { color: textColor }]}
                placeholder="Password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <ThemedText style={styles.eyeText}>👁️</ThemedText>
              </TouchableOpacity>
            </View>
            <View style={styles.underline} />
          </View>

          {/* Forgot Password */}
          <TouchableOpacity style={styles.forgotPassword}>
            <ThemedText style={styles.forgotText}>Forget Password?</ThemedText>
          </TouchableOpacity>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.signInButton, { opacity: loading ? 0.7 : 1 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            <ThemedText style={styles.signInButtonText}>
              {loading ? 'Signing in...' : 'Sign in'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Community Illustration */}
        <View style={styles.illustrationContainer}>
          <ThemedText style={styles.illustration}>🌳🏠🌿👥</ThemedText>
          <ThemedText style={styles.illustrationText}>Join your community</ThemedText>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  languageToggle: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  langButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  langText: {
    fontSize: 14,
    fontWeight: '500',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 80,
  },
  houseIcon: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  houseText: {
    fontSize: 40,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2d5a3d',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    marginBottom: 60,
  },
  inputContainer: {
    marginBottom: 32,
  },
  input: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
  },
  eyeIcon: {
    padding: 8,
  },
  eyeText: {
    fontSize: 16,
  },
  underline: {
    height: 1,
    backgroundColor: '#ddd',
    marginTop: 4,
  },
  forgotPassword: {
    alignItems: 'flex-end',
    marginBottom: 40,
  },
  forgotText: {
    fontSize: 14,
    color: '#999',
  },
  signInButton: {
    backgroundColor: '#2d5a3d',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  illustrationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 40,
  },
  illustration: {
    fontSize: 40,
    marginBottom: 16,
  },
  illustrationText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
