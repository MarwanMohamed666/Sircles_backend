import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  useWindowDimensions,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

const SEEN_KEY = "@onboarding_seen";


const GREEN = "#195F3A";
const GREEN_DARK = "#0F3D25";

const CIRCLE_DURATION = 800;
const LOGO_DELAY = 200;
const LOGO_DURATION = 600;

export default function Splash() {
  const { width, height } = useWindowDimensions();
  const { session } = useAuth();

  const circleScale = useRef(new Animated.Value(0)).current;

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current; 
  const iconTranslate = useRef(new Animated.Value(-12)).current;
  const textTranslate = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.timing(circleScale, {
      toValue: 1,
      duration: CIRCLE_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: LOGO_DURATION,
          delay: LOGO_DELAY,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(logoScale, {
            toValue: 1.12, // bigger
            duration: LOGO_DURATION,
            delay: LOGO_DELAY,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(logoScale, {
            toValue: 1.0, // settle
            duration: 220,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(iconTranslate, {
          toValue: 0,
          duration: LOGO_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(textTranslate, {
          toValue: 0,
          duration: LOGO_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTimeout(routeNext, 650);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const routeNext = async () => {
    if (session) {
      router.replace("/(tabs)");
      return;
    }
    const seen = await AsyncStorage.getItem(SEEN_KEY);
    router.replace(seen === "true" ? "/login" : "/onboarding");
  };

  const diameter = Math.sqrt(width * width + height * height) * 1.1;

  return (
    <View style={styles.container}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "#fff" }]} />

      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={[GREEN, GREEN_DARK]}
          start={{ x: 0.2, y: 0.1 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <Animated.View
        style={{
          position: "absolute",
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          backgroundColor: GREEN,
          transform: [{ scale: circleScale }],
        }}
      />

      <Animated.View
        style={[
          styles.logoRow,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
      >
        <Animated.View style={{ transform: [{ translateX: iconTranslate }] }}>
          <Ionicons name="home" size={34} color="#fff" />
        </Animated.View>
        <Animated.Text
          style={[styles.brand, { transform: [{ translateX: textTranslate }] }]}
        >
          Sircles
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  logoRow: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brand: { color: "#fff", fontSize: 34, fontWeight: "800" },
});
