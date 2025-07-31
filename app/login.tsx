import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useLanguage } from '@/contexts/LanguageContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Colors } from '@/constants/Colors';

export default function LoginScreen() {
  const { texts, toggleLanguage, language, isRTL } = useLanguage();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const tintColor = useThemeColor({}, 'tint');
  const surfaceColor = useThemeColor({}, 'surface');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);

    if (error) {
      Alert.alert('Login Error', error.message);
    } else {
      // Check if admin user (you can customize this logic)
      if (email === 'admin@example.com') {
        router.replace('/admin');
      } else {
        router.replace('/(tabs)');
      }
    }
    setLoading(false);
  };

  return (
    <ThemedView style={[styles.container, { direction: isRTL ? 'rtl' : 'ltr' }]}>
      {/* Language Toggle */}
      <View style={[styles.languageToggle, isRTL && styles.languageToggleRTL]}>
        <TouchableOpacity
          style={[styles.langButton, { backgroundColor: surfaceColor }]}
          onPress={toggleLanguage}
        >
          <ThemedText style={styles.langText}>
            {language === 'en' ? 'العربية' : 'English'}
          </ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Logo */}
        <View style={[styles.logoContainer, { backgroundColor: tintColor }]}>
          <ThemedText style={[styles.logoText, { color: '#fff' }]}>S</ThemedText>
        </View>

        {/* App Title */}
        <ThemedText type="title" style={styles.title}>
          {texts.appName}
        </ThemedText>

        <ThemedText type="subtitle" style={styles.welcomeText}>
          {texts.welcome}
        </ThemedText>

        {/* Login Form */}
        <View style={styles.form}>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: surfaceColor, textAlign: isRTL ? 'right' : 'left' }
            ]}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <View style={styles.passwordContainer}>
            <TextInput
              style={[
                styles.input,
                styles.passwordInput,
                { backgroundColor: surfaceColor, textAlign: isRTL ? 'right' : 'left' }
              ]}
              placeholder={password ? texts.password : "Password (leave empty for new users)"}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={[styles.eyeButton, isRTL && styles.eyeButtonRTL]}
              onPress={() => setShowPassword(!showPassword)}
            >
              <ThemedText>{showPassword ? '👁️' : '👁️‍🗨️'}</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Remember Me */}
          <View style={[styles.rememberRow, isRTL && styles.rememberRowRTL]}>
            <Switch
              value={rememberMe}
              onValueChange={setRememberMe}
              trackColor={{ false: '#767577', true: tintColor }}
              thumbColor={rememberMe ? '#fff' : '#f4f3f4'}
            />
            <ThemedText style={styles.rememberText}>{texts.rememberMe}</ThemedText>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity style={[styles.forgotPassword, isRTL && styles.forgotPasswordRTL]}>
            <ThemedText style={[styles.forgotText, { color: tintColor }]}>
              {texts.forgotPassword}
            </ThemedText>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: tintColor, opacity: loading ? 0.7 : 1 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            <ThemedText style={[styles.loginButtonText, { color: '#fff' }]}>
              {loading ? 'Signing in...' : texts.login}
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
  languageToggle: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  languageToggleRTL: {
    alignItems: 'flex-start',
  },
  langButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  langText: {
    fontSize: 14,
    fontWeight: '500',
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
    marginBottom: 40,
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
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 15,
  },
  eyeButtonRTL: {
    right: 'auto',
    left: 16,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  rememberRowRTL: {
    flexDirection: 'row-reverse',
  },
  rememberText: {
    marginLeft: 8,
    fontSize: 14,
  },
  forgotPassword: {
    alignItems: 'flex-end',
    marginBottom: 32,
  },
  forgotPasswordRTL: {
    alignItems: 'flex-start',
  },
  forgotText: {
    fontSize: 14,
  },
  loginButton: {
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});