import React, { useState, useRef, useEffect } from "react";
import { Platform, useWindowDimensions } from "react-native";
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
  error: "#D32F2F",
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
  errorText?: string | null;
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
  errorText = null,
}: FloatingInputProps) => {
  const [focused, setFocused] = useState(false);
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;
  const { width } = useWindowDimensions();

  const baseLabel = width > 400 ? 15 : 14;
  const smallLabel = baseLabel - 1;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: focused || !!value ? 1 : 0,
      duration: 160,
      useNativeDriver: false,
    }).start();
  }, [focused, value]);

  const labelTop = anim.interpolate({ inputRange: [0, 1], outputRange: [20, 2] });
  const labelSize = anim.interpolate({ inputRange: [0, 1], outputRange: [baseLabel, smallLabel] });

  const underlineColor = errorText ? COLORS.error : underline;

  return (
    <View style={{ marginBottom: errorText ? 8 : 24 }}>
      <View style={{ justifyContent: "center" }}>
        <Animated.Text
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            top: labelTop,
            fontSize: labelSize,
            fontWeight: "500",
            color: errorText ? COLORS.error : "#000000ff",
            backgroundColor: "#fff",
            paddingHorizontal: 4,
            zIndex: 1,
          }}
        >
          {label}
        </Animated.Text>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TextInput
            style={[styles.inputBase, errorText && { color: COLORS.error }]}
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
            selectionColor={COLORS.green}
          />

          {showToggle ? (
            <TouchableOpacity
              accessibilityLabel="toggle password visibility"
              onPress={onToggleSecure}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name={secureTextEntry ? "eye" : "eye-off"} size={18} color="#000" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={{ height: 1, backgroundColor: underlineColor, marginTop: 6 }} />
      </View>

      {errorText ? (
        <ThemedText style={{ color: COLORS.error, fontSize: 12, marginTop: 6 }}>
          {errorText}
        </ThemedText>
      ) : null}
    </View>
  );
};

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // field errors
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [passErr, setPassErr] = useState<string | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);

  const backgroundColor = useThemeColor({}, "background");

  const { width, height } = useWindowDimensions();
  const isSmallH = height < 700 || width < 360;
  const isTablet = width >= 768;
  const isSmallPhone = width <= 375 || height <= 740;

  const homeIconSize = width >= 420 ? 60 : width >= 360 ? 56 : 52;
  const brandSize = width >= 420 ? 50 : width >= 360 ? 46 : 42;
  const tagSize = width >= 420 ? 20 : width >= 360 ? 18 : 16;

  const baseRatio = 0.77;
  const imgW = isTablet
    ? Math.min(width * 0.70, 640)
    : isSmallPhone
    ? Math.min(width * 0.80, 330)
    : Math.min(width * 0.92, 420);
  const imgH = imgW * baseRatio;

  const imgLeft = isTablet
    ? -Math.max(0.12 * width, 60)
    : isSmallPhone
    ? -Math.max(0.08 * width, 36)
    : -Math.max(0.14 * width, 56);

  const imgBottom = isTablet
    ? -Math.max(0.04 * height, 20)
    : isSmallPhone
    ? -Math.max(0.07 * height, 26)
    : -Math.max(0.05 * height, 22);

  const contentPadBottom = isTablet
    ? Math.min(Math.max(imgH * 0.55, 180), 300)
    : isSmallPhone
    ? Math.min(Math.max(imgH * 0.60, 160), 260)
    : Math.min(Math.max(imgH * 0.55, 160), 240);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

  const validate = () => {
    let ok = true;
    setFormErr(null);

    const e = email.trim();
    const p = password;

    if (!e) {
      setEmailErr("Email is required");
      ok = false;
    } else if (!emailRegex.test(e)) {
      setEmailErr("Invalid email format");
      ok = false;
    } else {
      setEmailErr(null);
    }

    if (!p) {
      setPassErr("Password is required");
      ok = false;
    } else if (p.length < 6) {
      setPassErr("Password must be at least 6 characters");
      ok = false;
    } else {
      setPassErr(null);
    }

    return ok;
  };

  const handleLogin = async () => {
    if (!validate()) {
      if (!email.trim() && !password) {
        Alert.alert("Required", "Please enter your email and password");
      }
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn(email.trim(), password);
      if (error) {
        const msg = normalizeAuthError(error);
        setFormErr(msg);
        Alert.alert("Sign-in error", msg);
      } else {
     router.replace("/first-time-setup");
      }
    } catch (e: any) {
      setFormErr("Unexpected error. Please try again.");
      Alert.alert("Error", "Unexpected error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <ThemedView style={[styles.content, { paddingBottom: contentPadBottom }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.houseIcon}>
            <Ionicons name="home" size={homeIconSize} color={COLORS.text} />
          </View>
          <ThemedText style={[styles.brandTitle, { fontSize: brandSize }]}>Sircles</ThemedText>
          <ThemedText style={[styles.tagline, { fontSize: tagSize }]}>
            Your Community, Your Space
          </ThemedText>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <FloatingInput
            label="Email"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (emailErr) setEmailErr(null);
              if (formErr) setFormErr(null);
            }}
            underline={COLORS.underline}
            autoCapitalize="none"
            keyboardType="email-address"
            errorText={emailErr}
          />

          <FloatingInput
            label="Password"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (passErr) setPassErr(null);
              if (formErr) setFormErr(null);
            }}
            secureTextEntry={!showPassword}
            showToggle
            onToggleSecure={() => setShowPassword((p) => !p)}
            underline={COLORS.underline}
            errorText={passErr}
          />

          {formErr ? (
            <ThemedText style={{ color: COLORS.error, fontSize: 12, marginTop: -6, marginBottom: 12 }}>
              {formErr}
            </ThemedText>
          ) : null}

          <TouchableOpacity style={styles.forgotBtn}>
            <ThemedText style={styles.forgotText}>Forgot Password?</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.signInButton,
              { marginTop: isSmallH ? 28 : 40 },
              (loading || !email.trim() || !password) && { opacity: 0.7 },
            ]}
            onPress={handleLogin}
            disabled={loading || !email.trim() || !password}
          >
            <ThemedText style={styles.signInText}>
              {loading ? "Signing in..." : "Sign in"}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <View pointerEvents="none" style={[styles.illustration, { left: imgLeft, bottom: imgBottom }]}>
          <Image
            source={require("../assets/images/login-illustration.png")}
            style={{ width: imgW, height: imgH, resizeMode: "contain" }}
          />
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

function normalizeAuthError(error: any): string {
  const msg = (error?.message || "").toLowerCase();
  const code = (error?.code || error?.status || "").toString().toLowerCase();

  if (code.includes("invalid_credentials") || msg.includes("invalid login credentials")) {
    return "Email or password is incorrect";
  }
  if (code.includes("auth/invalid-credential") || msg.includes("invalid-credential")) {
    return "Email or password is incorrect";
  }
  if (code.includes("auth/user-not-found") || msg.includes("user not found")) {
    return "User not found";
  }
  if (code.includes("auth/wrong-password") || msg.includes("wrong password")) {
    return "Wrong password";
  }
  if (code.includes("auth/too-many-requests") || msg.includes("too many")) {
    return "Too many attempts. Try again later.";
  }
  if (code.includes("network") || msg.includes("network")) {
    return "Network issue. Check your connection and try again.";
  }
  return "Could not sign in. Check your credentials and try again.";
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 40,
    backgroundColor: "#fff",
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
    fontWeight: "800",
    color: "#2d5a3d",
    marginTop: 8,
    marginBottom: 40,
  },
  tagline: { color: COLORS.text, fontWeight: "600" },
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
    alignItems: "flex-start",
    width: "100%",
    paddingLeft: 12,
  },
});
