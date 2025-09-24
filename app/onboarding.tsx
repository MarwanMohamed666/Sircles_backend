import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  StatusBar,
  useWindowDimensions,
  StyleSheet as RNStyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

export const options = { headerShown: false };
const SEEN_KEY = "@onboarding_seen";

const slides = [
  {
    key: "s1",
    title: "Welcome to Circle — Your Community, Your Space",
    body: "Discover events and activities made for your compound. Stay connected with neighbors anytime, anywhere.",
    image: require("../assets/images/istockphoto1.jpg"),
  },
  {
    key: "s2",
    title: "Join Forces to Make Your Community Thrive",
    body: "Post, organize, and gather with a click. A safe space to belong and stay informed.",
    image: require("../assets/images/istockphoto2.jpg"),
  },
  {
    key: "s3",
    title: "Join your community on Sircles",
    body: "Create an account to join your compound, follow updates, and connect with neighbors.",
    image: require("../assets/images/istockphoto3.jpg"),
  },
];

export default function Onboarding() {
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems?.length > 0) setIndex(viewableItems[0].index ?? 0);
  }).current;
  const viewConfigRef = useRef({
    viewAreaCoveragePercentThreshold: 60,
  }).current;

  const finish = async () => {
    try {
      await AsyncStorage.setItem(SEEN_KEY, "true");
    } catch {}
    router.replace("/login");
  };

  const goNext = () => {
    if (index < slides.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      finish();
    }
  };

  const renderItem = ({ item }: { item: (typeof slides)[number] }) => (
    <View style={[styles.slide, { width, height }]}>
      <Image
        source={item.image}
        style={[RNStyleSheet.absoluteFillObject, { width, height }]}
        resizeMode="cover"
      />

      <View style={styles.topBar}>
        <View style={styles.langPill}>
          <Text style={styles.langText}>العربية</Text>
        </View>
      </View>

      <LinearGradient
        colors={[
          "transparent",
          "rgba(0,0,0,0.25)",
          "rgba(0,0,0,0.55)",
          "rgba(0,0,0,0.85)",
        ]}
        locations={[0, 0.35, 0.6, 1]}
        style={[styles.gradient, { height: Math.max(0.55 * height, 340) }]}
      />

      <View style={styles.textBox}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.body}>{item.body}</Text>
      </View>
    </View>
  );

  const isLast = index === slides.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(s) => s.key}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewConfigRef}
        getItemLayout={(_, i) => ({
          length: width,
          offset: width * i,
          index: i,
        })}
      />

      {isLast ? (
        <View style={[styles.controls, { justifyContent: "center" }]}>
          <TouchableOpacity style={styles.ctaPrimary} onPress={finish}>
            <Text style={styles.ctaTextPrimary}>Join us</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.controls}>
          <TouchableOpacity
            onPress={finish}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.skip}>Skip</Text>
          </TouchableOpacity>

          <View style={styles.dots}>
            {slides.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === index && styles.dotActive]}
              />
            ))}
          </View>

          <TouchableOpacity
            onPress={goNext}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.next}>Next</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const FG = "#FFFFFF";
const ACCENT = "#198F4B";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  slide: { flex: 1 },

  topBar: { position: "absolute", top: 40, right: 14, zIndex: 6 },
  langPill: {
    backgroundColor: ACCENT,
    paddingHorizontal: 26,
    paddingVertical: 7,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  langText: { color: "#fff", fontSize: 13, fontWeight: "500" },

  gradient: { position: "absolute", left: 0, right: 0, bottom: 0 },

  textBox: {
    position: "absolute",
    left: 22,
    right: 22,
    bottom: 110,
    alignItems: "flex-start",
  },
  title: {
    color: FG,
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 32,
    textAlign: "left",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowRadius: 8,
    marginBottom: 10,
  },
  body: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "left",
    maxWidth: 340,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowRadius: 6,
  },

  controls: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  skip: { color: "#E6E6E6", fontSize: 13, fontWeight: "600" },
  next: { color: "#E6E6E6", fontSize: 13, fontWeight: "600" },

  dots: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 5,
    flexDirection: "row",
    justifyContent: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.45)",
    marginHorizontal: 5,
  },
  dotActive: { width: 22, borderRadius: 5, backgroundColor: FG },

  // Final slide CTA
  ctaPrimary: {
    backgroundColor: ACCENT,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    minWidth: 220,
    alignItems: "center",
  },
  ctaTextPrimary: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
