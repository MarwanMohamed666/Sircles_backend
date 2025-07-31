
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useLanguage } from '@/contexts/LanguageContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { IconSymbol } from '@/components/ui/IconSymbol';

export default function SetupPasswordScreen() {
  const { texts, isRTL } = useLanguage();
  const { setupInitialPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const tintColor = useThemeColor({}, 'tint');
  const surfaceColor = useThemeColor({}, 'surface');
  const textColor = useThemeColor({}, 'text');

  const validatePassword = (pwd: string) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(pwd);
    const hasLowerCase = /[a-z]/.test(pwd);
    const hasNumbers = /\d/.test(pwd);
    const hasNonalphas = /\W/.test(pwd);

    return pwd.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasNonalphas;
  };

  const handleSetupPassword = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (!validatePassword(password)) {
      Alert.alert(
        'Password Requirements',
        'Password must be at least 8 characters long and contain:\n• At least one uppercase letter\n• At least one lowercase letter\n• At least one number\n• At least one special character'
      );
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await setupInitialPassword(email, password);
      
      if (error) {
        Alert.alert('Setup Error', error.message || 'Failed to set up password');
      } else {
        Alert.alert(
          'Success',
          'Your account has been created successfully!',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(tabs)'),
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ThemedView style={[styles.content, { direction: isRTL ? 'rtl' : 'ltr' }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.logoContainer, { backgroundColor: tintColor }]}>
              <IconSymbol name="person.badge.key.fill" size={36} color="#fff" />
            </View>
            
            <ThemedText type="title" style={[styles.title, isRTL && styles.rtlText]}>
              {texts.setupPassword || 'Set Up Your Password'}
            </ThemedText>
            
            <ThemedText style={[styles.subtitle, isRTL && styles.rtlText]}>
              {texts.setupPasswordSubtitle || 'Create your account by setting up your email and password'}
            </ThemedText>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <ThemedText style={[styles.label, isRTL && styles.rtlText]}>
                {texts.email || 'Email'}
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: surfaceColor,
                    color: textColor,
                    textAlign: isRTL ? 'right' : 'left'
                  }
                ]}
                placeholder={texts.enterEmail || 'Enter your email'}
                placeholderTextColor={textColor + '60'}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={[styles.label, isRTL && styles.rtlText]}>
                {texts.password || 'Password'}
              </ThemedText>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    { 
                      backgroundColor: surfaceColor,
                      color: textColor,
                      textAlign: isRTL ? 'right' : 'left'
                    }
                  ]}
                  placeholder={texts.enterPassword || 'Enter your password'}
                  placeholderTextColor={textColor + '60'}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                />
                <TouchableOpacity
                  style={[styles.eyeButton, isRTL && styles.eyeButtonRTL]}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <IconSymbol 
                    name={showPassword ? "eye.slash" : "eye"} 
                    size={20} 
                    color={textColor + '60'} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={[styles.label, isRTL && styles.rtlText]}>
                {texts.confirmPassword || 'Confirm Password'}
              </ThemedText>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    { 
                      backgroundColor: surfaceColor,
                      color: textColor,
                      textAlign: isRTL ? 'right' : 'left'
                    }
                  ]}
                  placeholder={texts.confirmPasswordPlaceholder || 'Confirm your password'}
                  placeholderTextColor={textColor + '60'}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoComplete="new-password"
                />
                <TouchableOpacity
                  style={[styles.eyeButton, isRTL && styles.eyeButtonRTL]}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <IconSymbol 
                    name={showConfirmPassword ? "eye.slash" : "eye"} 
                    size={20} 
                    color={textColor + '60'} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Password Requirements */}
            <View style={styles.requirementsContainer}>
              <ThemedText style={[styles.requirementsTitle, isRTL && styles.rtlText]}>
                {texts.passwordRequirements || 'Password Requirements:'}
              </ThemedText>
              <ThemedText style={[styles.requirement, isRTL && styles.rtlText]}>
                • {texts.minLength || 'At least 8 characters'}
              </ThemedText>
              <ThemedText style={[styles.requirement, isRTL && styles.rtlText]}>
                • {texts.uppercase || 'At least one uppercase letter'}
              </ThemedText>
              <ThemedText style={[styles.requirement, isRTL && styles.rtlText]}>
                • {texts.lowercase || 'At least one lowercase letter'}
              </ThemedText>
              <ThemedText style={[styles.requirement, isRTL && styles.rtlText]}>
                • {texts.number || 'At least one number'}
              </ThemedText>
              <ThemedText style={[styles.requirement, isRTL && styles.rtlText]}>
                • {texts.special || 'At least one special character'}
              </ThemedText>
            </View>

            {/* Setup Button */}
            <TouchableOpacity
              style={[
                styles.setupButton,
                { 
                  backgroundColor: tintColor,
                  opacity: loading ? 0.7 : 1
                }
              ]}
              onPress={handleSetupPassword}
              disabled={loading}
            >
              <ThemedText style={[styles.setupButtonText, { color: '#fff' }]}>
                {loading 
                  ? (texts.settingUp || 'Setting up...') 
                  : (texts.setupAccount || 'Set Up Account')
                }
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 15,
    padding: 4,
  },
  eyeButtonRTL: {
    right: 'auto',
    left: 16,
  },
  requirementsContainer: {
    marginBottom: 32,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  requirement: {
    fontSize: 13,
    opacity: 0.8,
    marginBottom: 4,
  },
  setupButton: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setupButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  rtlText: {
    textAlign: 'right',
  },
});
