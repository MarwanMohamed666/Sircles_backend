import React, { useState, useRef, useEffect } from "react";
import { Platform } from "react-native";
import { useFonts, Agbalumo_400Regular } from "@expo-google-fonts/agbalumo";
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Image,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";

const COLORS = {
  green: "#198F4B",
  text: "#000000",
  subtext: "#797979",
  underline: "#000000",
};

import type { KeyboardTypeOptions } from "react-native";

type FloatingInputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  color?: string;
  underline?: string;
  secureTextEntry?: boolean;
  showToggle?: boolean;
  onToggleSecure?: () => void;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: KeyboardTypeOptions;
};

const FloatingInput = ({
  label,
  value,
  onChangeText,
  color = COLORS.text,
  underline = COLORS.underline,
  secureTextEntry = false,
  showToggle = false,
  onToggleSecure,
  autoCapitalize = "none",
  keyboardType = "default",
}: FloatingInputProps) => {
  const [focused, setFocused] = useState(false);
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: focused || !!value ? 1 : 0,
      duration: 160,
      useNativeDriver: false,
    }).start();
  }, [focused, value]);

  const labelTop = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 6],
  });
  const labelSize = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 13],
  });

  return (
    <View style={{ marginBottom: 24 }}>
      <View style={{ justifyContent: "center" }}>
        <Animated.Text
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            top: labelTop,
            fontSize: labelSize,
            fontWeight: "500",
            color: "#000000ff",
            backgroundColor: "#fff",
            paddingHorizontal: 4,
            zIndex: 1,
          }}
        >
          {label}
        </Animated.Text>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TextInput
            style={styles.inputBase}
            value={value}
            onChangeText={onChangeText}
            secureTextEntry={secureTextEntry}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoCapitalize={autoCapitalize}
            keyboardType={keyboardType}
            autoCorrect={false}
            autoComplete={secureTextEntry ? "new-password" : "off"}
            importantForAutofill="no"
            selectionColor="#198F4B"
          />

          {showToggle ? (
            <TouchableOpacity
              accessibilityLabel="toggle password visibility"
              onPress={onToggleSecure}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={secureTextEntry ? "eye" : "eye-off"}
                size={18}
                color="#000"
              />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={{ height: 1, backgroundColor: underline, marginTop: 6 }} />
      </View>
    </View>
  );
};

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");

  const handleLogin = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        Alert.alert(
          "Login Error",
          "Wrong email or password. Please try again."
        );
      } else {
        router.replace("/(tabs)");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <ThemedView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.houseIcon}>
            <Ionicons name="home" size={60} color={COLORS.text} />
          </View>
          <ThemedText style={styles.brandTitle}>Sircles</ThemedText>
          <ThemedText style={styles.tagline}>
            Your Community, Your Space
          </ThemedText>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <FloatingInput
            label="Username"
            value={email}
            onChangeText={setEmail}
            color={textColor as unknown as string}
            underline={COLORS.underline}
            autoCapitalize="none"
            keyboardType="email-address"
            onToggleSecure={() => {}} // Added to satisfy required prop
          />

          <FloatingInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            showToggle
            onToggleSecure={() => setShowPassword((p) => !p)}
            color={textColor as unknown as string}
            underline={COLORS.underline}
          />

          <TouchableOpacity style={styles.forgotBtn}>
            <ThemedText style={styles.forgotText}>Forget Password?</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.signInButton,
              { marginTop: 40 },
              loading && { opacity: 0.7 },
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            <ThemedText style={styles.signInText}>
              {loading ? "Signing in..." : "Sign in"}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <View pointerEvents="none" style={styles.illustration}>
          <Image
            source={require("../assets/images/login-illustration.png")}
            style={{ width: 390, height: 300, resizeMode: "contain" }}
          />
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 40,
    backgroundColor: "#fff",
    // paddingBottom: 220,
  },
  header: { alignItems: "center", marginTop: 10, marginBottom: 36 },
  houseIcon: {
    marginTop: 50,
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 51,
    fontWeight: "800",
    color: "#2d5a3d",
    marginTop: 8,
    marginBottom: 40,
  },
  tagline: { fontSize: 20, color: COLORS.text, fontWeight: "600" },
  form: { marginTop: 10 },

  inputBase: {
    fontSize: 12,
    paddingVertical: 10,
    paddingTop: 26,
    paddingBottom: 8,
    flex: 1,
    backgroundColor: "transparent",
    color: "#4d4d4dff",
    borderWidth: 0,
    borderColor: "transparent",
    ...Platform.select({
      web: {
        outlineStyle: "none",
        outlineWidth: 0,
        outlineColor: "transparent",
        boxShadow: "0 0 0px 1000px #fff inset",
        appearance: "none",
      } as any,
      default: {},
    }),
  },

  forgotBtn: { alignItems: "flex-end", marginTop: -10, marginBottom: 24 },
  forgotText: { fontSize: 12, color: COLORS.subtext },
  signInButton: {
    backgroundColor: COLORS.green,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  signInText: { color: "#fff", fontSize: 18, fontWeight: "700" },

  illustration: {
    position: "absolute",
    left: -60,
    bottom: -30,
    alignItems: "flex-start",
    width: "100%",
    paddingLeft: 12,
  },
});
