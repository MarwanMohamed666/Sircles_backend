
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useLanguage } from '@/contexts/LanguageContext';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function PasswordSetupScreen() {
  const { texts, isRTL } = useLanguage();
  const { setupFirstTimePassword } = useAuth();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const tintColor = useThemeColor({}, 'tint');
  const surfaceColor = useThemeColor({}, 'surface');

  const handleSetupPassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Error', 'Please enter and confirm your password');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (!email) {
      Alert.alert('Error', 'Email is required');
      return;
    }

    setLoading(true);
    const { error } = await setupFirstTimePassword(email, password);
    
    if (error) {
      Alert.alert('Setup Error', error.message);
    } else {
      Alert.alert('Success', 'Password setup complete!', [
        {
          text: 'OK',
          onPress: () => router.replace('/(tabs)'),
        },
      ]);
    }
    setLoading(false);
  };

  return (
    <ThemedView style={[styles.container, { direction: isRTL ? 'rtl' : 'ltr' }]}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={[styles.logoContainer, { backgroundColor: tintColor }]}>
          <ThemedText style={[styles.logoText, { color: '#fff' }]}>S</ThemedText>
        </View>

        {/* Title */}
        <ThemedText type="title" style={styles.title}>
          Setup Your Password
        </ThemedText>

        <ThemedText type="subtitle" style={styles.welcomeText}>
          Welcome! Please set your password to continue.
        </ThemedText>

        {/* Email Display */}
        <View style={[styles.emailContainer, { backgroundColor: surfaceColor }]}>
          <ThemedText style={styles.emailLabel}>Email:</ThemedText>
          <ThemedText style={styles.emailText}>{email}</ThemedText>
        </View>

        {/* Password Setup Form */}
        <View style={styles.form}>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: surfaceColor, textAlign: isRTL ? 'right' : 'left' }
              ]}
              placeholder="Enter new password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
          </View>

          <TextInput
            style={[
              styles.input,
              { backgroundColor: surfaceColor, textAlign: isRTL ? 'right' : 'left' }
            ]}
            placeholder="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />

          {/* Show Password Toggle */}
          <TouchableOpacity
            style={[styles.showPasswordRow, isRTL && styles.showPasswordRowRTL]}
            onPress={() => setShowPassword(!showPassword)}
          >
            <ThemedText style={styles.showPasswordText}>
              {showPassword ? 'Hide Password' : 'Show Password'}
            </ThemedText>
          </TouchableOpacity>

          {/* Setup Button */}
          <TouchableOpacity
            style={[styles.setupButton, { backgroundColor: tintColor, opacity: loading ? 0.7 : 1 }]}
            onPress={handleSetupPassword}
            disabled={loading}
          >
            <ThemedText style={[styles.setupButtonText, { color: '#fff' }]}>
              {loading ? 'Setting up...' : 'Setup Password'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  title: {
    marginBottom: 8,
  },
  welcomeText: {
    marginBottom: 24,
    textAlign: 'center',
  },
  emailContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 32,
    width: '100%',
    maxWidth: 300,
  },
  emailLabel: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '500',
  },
  form: {
    width: '100%',
    maxWidth: 300,
  },
  input: {
    height: 50,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  passwordContainer: {
    position: 'relative',
  },
  showPasswordRow: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  showPasswordRowRTL: {
    alignItems: 'flex-start',
  },
  showPasswordText: {
    fontSize: 14,
    opacity: 0.7,
  },
  setupButton: {
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setupButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
