// CirclesScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  Image,
  Animated,
  Easing,
  LayoutChangeEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { ThemedText } from "@/components/ThemedText";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  getCircles,
  createCircle,
  joinCircle,
  leaveCircle,
  getCirclesByUser,
  DatabaseService,
} from "@/lib/database";
import { supabase } from "@/lib/supabase";
import { StorageService } from "@/lib/storage";

interface Circle {
  id: string;
  name: string;
  description: string;
  privacy: string;
  creationDate: string;
  memberCount?: number;
  isJoined?: boolean;
  member_count?: number;
  circle_profile_url?: string;
  creator?: string;
  hasPendingRequest?: boolean;
}

// ألوان
const COLORS = {
  primary: "#2B7A4B",
  screenBg: "#FFFFFF", // خلفية الصفحة أبيض
  surface: "#FFFFFF", // الكارد أبيض
  gray100: "#F8FAFC",
  gray200: "#EAECF0",
  gray300: "#D0D5DD",
  text: "#101828",
  textMuted: "#667085",
  danger: "#EF5350",
  dangerSoft: "#FFE9E9",
  control: "#EEF2F6", // عناصر التحكم الفاتحة
};

// Segmented بإنيميشن pill
function AnimatedSegment({
  options,
  value,
  onChange,
  height = 36,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  height?: number;
}) {
  const idx = Math.max(
    0,
    options.findIndex((o) => o.key === value)
  );
  const anim = useRef(new Animated.Value(idx)).current;
  const [w, setW] = useState(0);

  useEffect(() => {
    const i = Math.max(
      0,
      options.findIndex((o) => o.key === value)
    );
    Animated.timing(anim, {
      toValue: i,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [value]);

  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const pillW = w / Math.max(1, options.length);
  const translateX = anim.interpolate({
    inputRange: options.map((_, i) => i),
    outputRange: options.map((_, i) => i * pillW),
  });

  return (
    <View
      style={[
        styles.segment,
        { height: height + 12, padding: 6, backgroundColor: COLORS.control },
      ]}
      onLayout={onLayout}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            margin: 6,
            width: pillW - 12,
            height,
            borderRadius: height / 2,
            backgroundColor: COLORS.primary,
            transform: [{ translateX }],
          },
        ]}
      />
      {options.map((o) => {
        const active = o.key === value;
        return (
          <TouchableOpacity
            key={o.key}
            style={[styles.segmentBtn, { height }]}
            activeOpacity={0.9}
            onPress={() => onChange(o.key)}
          >
            <ThemedText
              style={[
                styles.segmentTxt,
                active && { color: "#000", fontWeight: "700" },
              ]}
            >
              {o.label}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function CirclesScreen() {
  const { user, userProfile } = useAuth();
  const { texts, isRTL } = useLanguage();

  const [circles, setCircles] = useState<Circle[]>([]);
  const [myCircles, setMyCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "my">("all");
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [newCircle, setNewCircle] = useState({
    name: "",
    description: "",
    privacy: "public" as "public" | "private",
    interests: [] as string[],
    image: null as string | null,
  });
  const [selectedImage, setSelectedImage] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [interests, setInterests] = useState<{ [key: string]: any[] }>({});
  const [loadingInterests, setLoadingInterests] = useState(false);

  const filtered = (activeTab === "all" ? circles : myCircles).filter(
    (c) =>
      c.name?.toLowerCase().includes(query.trim().toLowerCase()) ||
      c.description?.toLowerCase().includes(query.trim().toLowerCase())
  );

  const loadCircles = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: allCircles, error: circlesError } = await getCircles();
      if (circlesError) {
        setError("Unable to load circles. Please try again.");
        setCircles([]);
        return;
      }

      let joinedIds = new Set<string>();
      let pendingIds = new Set<string>();

      if (userProfile?.id) {
        const { data: userCirclesResult } = await getCirclesByUser(
          userProfile.id
        );
        joinedIds = new Set(userCirclesResult?.map((uc) => uc.circleId) || []);

        if (allCircles) {
          for (const circle of allCircles) {
            if (circle.privacy === "private" && !joinedIds.has(circle.id)) {
              const { data: pendingRequest } =
                await DatabaseService.getUserPendingRequest(
                  circle.id,
                  userProfile.id
                );
              if (pendingRequest) pendingIds.add(circle.id);
            }
          }
        }
      }

      const prepared =
        allCircles?.map((c) => ({
          ...c,
          isJoined: joinedIds.has(c.id),
          hasPendingRequest: pendingIds.has(c.id),
          memberCount: c.member_count || 0,
        })) || [];

      setCircles(prepared);
      setMyCircles(prepared.filter((c) => c.isJoined));
    } catch {
      setError("Something went wrong. Please try again.");
      setCircles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCircles();
    setRefreshing(false);
  };

  const loadInterests = async () => {
    setLoadingInterests(true);
    try {
      const { data } = await DatabaseService.getInterestsByCategory();
      if (data) setInterests(data);
    } finally {
      setLoadingInterests(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please grant photo library access.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });
    if (!result.canceled && result.assets?.length)
      setSelectedImage(result.assets[0]);
  };

  const handleCreateCircle = async () => {
    if (!newCircle.name.trim()) {
      Alert.alert("Error", "Circle name is required");
      return;
    }
    if (!user?.id) {
      Alert.alert("Error", "You must be logged in");
      return;
    }

    try {
      const { data, error } = await createCircle({
        name: newCircle.name.trim(),
        description: newCircle.description.trim(),
        privacy: newCircle.privacy,
        creator: user.id,
      });
      if (error) {
        Alert.alert("Error", "Failed to create circle");
        return;
      }

      let circleProfileUrl: string | null = null;
      if (selectedImage && data) {
        const { data: uploadData } =
          await StorageService.uploadCircleProfilePicture(
            data.id,
            selectedImage
          );
        circleProfileUrl = uploadData?.publicUrl || null;
      }
      if (circleProfileUrl && data) {
        await supabase
          .from("circles")
          .update({ circle_profile_url: circleProfileUrl })
          .eq("id", data.id);
      }

      if (data && newCircle.interests.length) {
        for (const interestId of newCircle.interests) {
          await supabase
            .from("circle_interests")
            .insert({ circleid: data.id, interestid: interestId });
        }
      }

      setShowCreateModal(false);
      setNewCircle({
        name: "",
        description: "",
        privacy: "public",
        interests: [],
        image: null,
      });
      setSelectedImage(null);
      await loadCircles();
      Alert.alert("Success", "Circle created successfully");
    } catch {
      Alert.alert("Error", "Failed to create circle");
    }
  };

  const toggleInterest = (interestId: string) => {
    setNewCircle((prev) => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter((id) => id !== interestId)
        : [...prev.interests, interestId],
    }));
  };

  const handleJoinLeave = async (
    circleId: string,
    isJoined: boolean,
    circleName: string,
    circlePrivacy: string
  ) => {
    if (!userProfile?.id) {
      Alert.alert("Error", "You must be logged in");
      return;
    }

    if (isJoined) {
      const { error } = await leaveCircle(userProfile.id, circleId);
      if (error) {
        Alert.alert("Error", "Failed to leave circle");
        return;
      }
      await loadCircles();
      return;
    }

    if (circlePrivacy === "private") {
      const message = window.prompt(
        `Send a request to join "${circleName}"`,
        ""
      );
      if (message !== null) {
        const { error } = await DatabaseService.requestToJoinCircle(
          userProfile.id,
          circleId,
          message
        );
        if (error) {
          Alert.alert("Error", error.message || "Failed to send request");
          return;
        }
        Alert.alert("Success", "Join request sent");
      }
    } else {
      const { error } = await joinCircle(userProfile.id, circleId);
      if (error) {
        Alert.alert("Error", "Unable to join circle");
        return;
      }
      await loadCircles();
    }
  };

  const handleDeleteCircle = async (circleId: string, circleName: string) => {
    if (!user?.id) {
      Alert.alert("Error", "You must be logged in");
      return;
    }
    const confirmed = window.confirm(`Delete "${circleName}" permanently?`);
    if (!confirmed) return;
    const { error } = await DatabaseService.deleteCircle(circleId, user.id);
    if (error) {
      Alert.alert("Error", error.message || "Failed to delete circle");
      return;
    }
    await loadCircles();
  };

  useEffect(() => {
    loadCircles();
  }, [userProfile]);
  useFocusEffect(
    useCallback(() => {
      loadCircles();
    }, [userProfile])
  );

  const renderCircle = (circle: Circle) => {
    const isJoined = !!circle.isJoined;
    const hasPending = !!circle.hasPendingRequest;

    return (
      <TouchableOpacity
        key={circle.id}
        style={styles.card}
        onPress={() => router.push(`/circle/${circle.id}`)}
        activeOpacity={0.9}
      >
        {circle.creator === user?.id && (
          <TouchableOpacity
            style={styles.deleteFab}
            onPress={(e) => {
              e.stopPropagation();
              handleDeleteCircle(circle.id, circle.name);
            }}
          >
            <IconSymbol name="trash" size={16} color={COLORS.danger} />
          </TouchableOpacity>
        )}

        {circle.circle_profile_url && (
          <Image
            source={{ uri: circle.circle_profile_url }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        )}

        <View style={styles.metaRow}>
          <View style={styles.metaGroup}>
            <IconSymbol
              name={circle.privacy === "private" ? "lock.fill" : "globe"}
              size={14}
              color={COLORS.textMuted}
            />
            <ThemedText style={styles.metaText}>
              {circle.privacy === "private"
                ? texts.private || "Private"
                : texts.public || "Public"}
            </ThemedText>
          </View>
          <View style={styles.metaGroup}>
            <IconSymbol name="person.3" size={14} color={COLORS.textMuted} />
            <ThemedText style={styles.metaText}>
              {circle.memberCount || 0}
            </ThemedText>
          </View>
        </View>

        <ThemedText
          type="defaultSemiBold"
          style={[styles.title, isRTL && styles.rtl]}
        >
          {circle.name}
        </ThemedText>
        <ThemedText style={[styles.sub, isRTL && styles.rtl]}>
          {circle.description || "No description"}
        </ThemedText>

        <View style={styles.footerRow}>
          {isJoined ? (
            <TouchableOpacity
              onPress={() =>
                handleJoinLeave(circle.id, true, circle.name, circle.privacy)
              }
              style={styles.leaveLight}
            >
              <ThemedText style={styles.leaveLightTxt}>leave</ThemedText>
            </TouchableOpacity>
          ) : hasPending ? (
            <View style={styles.pendingPill}>
              <ThemedText style={styles.pendingTxt}>Pending</ThemedText>
            </View>
          ) : (
            <View />
          )}

          {isJoined ? (
            <TouchableOpacity
              onPress={() => router.push(`/circle/${circle.id}`)}
              style={styles.openTextBtn}
            >
              <ThemedText style={styles.openTxt}>Open</ThemedText>
              <IconSymbol
                name="square.and.arrow.up"
                size={14}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          ) : !hasPending ? (
            <TouchableOpacity
              style={styles.joinBtn}
              onPress={() =>
                handleJoinLeave(circle.id, false, circle.name, circle.privacy)
              }
            >
              <ThemedText style={styles.joinTxt}>
                {circle.privacy === "private" ? "Request" : "Join"}
              </ThemedText>
            </TouchableOpacity>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerWrap}>
        <ThemedText type="title" style={styles.headerTitle}>
          {texts.circles || "Circles"}
        </ThemedText>
        <TouchableOpacity
          style={styles.addFab}
          onPress={() => {
            setShowCreateModal(true);
            loadInterests();
          }}
        >
          <IconSymbol name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <IconSymbol name="magnifyingglass" size={16} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={texts.search || "Search Circles"}
          placeholderTextColor={COLORS.textMuted + "AA"}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {/* Segmented */}
      <AnimatedSegment
        options={[
          { key: "all", label: texts.allCircles || "All Circles" },
          { key: "my", label: texts.myCircles || "My Circles" },
        ]}
        value={activeTab}
        onChange={(v) => setActiveTab(v as "all" | "my")}
        height={36}
      />

      {/* List */}
      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading ? (
          <View style={styles.centerPad}>
            <ThemedText>Loading...</ThemedText>
          </View>
        ) : error ? (
          <View style={styles.centerPad}>
            <ThemedText style={styles.emptyText}>{error}</ThemedText>
            <TouchableOpacity style={styles.retryBtn} onPress={loadCircles}>
              <ThemedText style={styles.retryTxt}>
                {texts.retry || "Retry"}
              </ThemedText>
            </TouchableOpacity>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.centerPad}>
            <ThemedText style={styles.emptyText}>
              {activeTab === "all"
                ? "No circles available"
                : "You haven't joined any circles yet"}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.grid}>{filtered.map(renderCircle)}</View>
        )}
      </ScrollView>

      {/* Create Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <TouchableOpacity
                onPress={() => setShowCreateModal(false)}
                style={styles.backBtn}
              >
                <IconSymbol name="chevron.left" size={18} color={COLORS.text} />
              </TouchableOpacity>
              <ThemedText type="subtitle" style={styles.sheetTitle}>
                {texts.createCircle || "New Circle"}
              </ThemedText>
              <View style={{ width: 32 }} />
            </View>

            <ScrollView
              style={styles.sheetBody}
              showsVerticalScrollIndicator={false}
            >
              {/* Image */}
              <TouchableOpacity style={styles.coverPicker} onPress={pickImage}>
                {selectedImage ? (
                  <Image
                    source={{ uri: selectedImage.uri }}
                    style={styles.coverImg}
                  />
                ) : (
                  <View style={styles.coverEmpty}>
                    <IconSymbol
                      name="camera"
                      size={28}
                      color={COLORS.primary}
                    />
                    <ThemedText
                      style={[styles.coverTxt, { color: COLORS.primary }]}
                    >
                      {texts.profilePicture || "Add a circle image"}
                    </ThemedText>
                  </View>
                )}
              </TouchableOpacity>

              {/* Name */}
              <View style={styles.field}>
                <ThemedText style={styles.label}>
                  {texts.name || "Circle name"}
                </ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder={texts.enterCircleName || "e.g. Sport Circle"}
                  placeholderTextColor={COLORS.textMuted + "AA"}
                  value={newCircle.name}
                  onChangeText={(t) => setNewCircle({ ...newCircle, name: t })}
                />
              </View>

              {/* Description */}
              <View style={styles.field}>
                <ThemedText style={styles.label}>
                  {texts.description || "Description"}
                </ThemedText>
                <TextInput
                  style={styles.textarea}
                  placeholder={
                    texts.enterDescription || "What's this circle about?"
                  }
                  placeholderTextColor={COLORS.textMuted + "AA"}
                  value={newCircle.description}
                  onChangeText={(t) =>
                    setNewCircle({ ...newCircle, description: t })
                  }
                  multiline
                  numberOfLines={4}
                />
              </View>

              {/* Privacy */}
              <View style={styles.field}>
                <ThemedText style={styles.label}>
                  {texts.privacy || "Privacy"}
                </ThemedText>
                <AnimatedSegment
                  options={[
                    { key: "public", label: texts.public || "Public" },
                    { key: "private", label: texts.private || "Private" },
                  ]}
                  value={newCircle.privacy}
                  onChange={(v) =>
                    setNewCircle({
                      ...newCircle,
                      privacy: v as "public" | "private",
                    })
                  }
                  height={40}
                />
              </View>

              {/* Interests */}
              <View style={styles.field}>
                <ThemedText style={styles.label}>
                  {texts.interests || "Interests"}
                </ThemedText>
                <View style={styles.interestsBox}>
                  {loadingInterests ? (
                    <ThemedText style={styles.emptyText}>
                      Loading interests...
                    </ThemedText>
                  ) : Object.keys(interests).length === 0 ? (
                    <ThemedText style={styles.emptyText}>
                      No interests available
                    </ThemedText>
                  ) : (
                    Object.entries(interests).map(([cat, items]) => (
                      <View key={cat} style={{ marginBottom: 12 }}>
                        <ThemedText style={styles.catTitle}>{cat}</ThemedText>
                        <View style={styles.chips}>
                          {items.map((it: any) => {
                            const selected = newCircle.interests.includes(
                              it.id
                            );
                            return (
                              <TouchableOpacity
                                key={it.id}
                                style={[
                                  styles.chip,
                                  {
                                    backgroundColor: selected
                                      ? COLORS.primary
                                      : COLORS.surface,
                                  },
                                ]}
                                onPress={() => toggleInterest(it.id)}
                              >
                                <ThemedText
                                  style={[
                                    styles.chipTxt,
                                    { color: selected ? "#fff" : COLORS.text },
                                  ]}
                                >
                                  {it.title}
                                </ThemedText>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </View>
            </ScrollView>

            <View style={styles.sheetFooter}>
              <TouchableOpacity
                style={styles.btnGhost}
                onPress={() => {
                  setShowCreateModal(false);
                  setNewCircle({
                    name: "",
                    description: "",
                    privacy: "public",
                    interests: [],
                    image: null,
                  });
                  setSelectedImage(null);
                }}
              >
                <ThemedText style={styles.btnGhostTxt}>
                  {texts.cancel || "Cancel"}
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={handleCreateCircle}
              >
                <ThemedText style={styles.btnPrimaryTxt}>
                  {texts.create || "Create Circle"}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.screenBg },

  headerWrap: {
    backgroundColor: COLORS.screenBg,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 24, color: COLORS.text },

  addFab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },

  searchWrap: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.control,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },

  segment: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    backgroundColor: COLORS.control,
    overflow: "hidden",
  },
  segmentBtn: {
    flex: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentTxt: { fontSize: 13, fontWeight: "600", color: COLORS.textMuted },

  list: { flex: 1 },
  grid: { paddingHorizontal: 16, paddingBottom: 24, gap: 16 },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardImage: {
    width: "100%",
    height: 170,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    marginBottom: 10,
  },
  deleteFab: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  metaGroup: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 12, color: COLORS.textMuted },

  title: { fontSize: 16, marginBottom: 6, color: COLORS.text },
  sub: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 19,
    marginBottom: 10,
  },

  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  leaveLight: {
    paddingHorizontal: 16,
    height: 30,
    borderRadius: 16,
    backgroundColor: COLORS.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  leaveLightTxt: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "lowercase",
  },
  pendingPill: {
    paddingHorizontal: 14,
    height: 30,
    borderRadius: 16,
    backgroundColor: "#FFE7C2",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  pendingTxt: { color: "#8A5200", fontSize: 12, fontWeight: "700" },
  openTextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  openTxt: { color: COLORS.textMuted, fontSize: 13, fontWeight: "700" },
  joinBtn: {
    paddingHorizontal: 18,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  joinTxt: { color: "#fff", fontSize: 13, fontWeight: "700" },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  sheet: {
    width: "92%",
    maxHeight: "90%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: COLORS.surface,
  },
  sheetHeader: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    backgroundColor: COLORS.surface,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitle: { fontSize: 18, color: COLORS.text },
  sheetBody: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
  },

  coverPicker: {
    height: 140,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    marginBottom: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.primary,
  },
  coverImg: { width: "100%", height: "100%" },
  coverEmpty: { alignItems: "center", justifyContent: "center", gap: 6 },
  coverTxt: { fontWeight: "700" },

  field: { marginBottom: 14 },
  label: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
    color: COLORS.text,
    opacity: 0.85,
  },
  input: {
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 15,
    backgroundColor: COLORS.gray100,
    color: COLORS.text,
  },
  textarea: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    height: 96,
    fontSize: 14,
    textAlignVertical: "top",
    backgroundColor: COLORS.gray100,
    color: COLORS.text,
  },

  interestsBox: {
    borderRadius: 12,
    backgroundColor: COLORS.gray100,
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  catTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
    opacity: 0.8,
    marginBottom: 6,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  chipTxt: { fontSize: 12, fontWeight: "600", color: COLORS.text },

  sheetFooter: {
    padding: 12,
    gap: 10,
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    backgroundColor: COLORS.surface,
  },
  btnGhost: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.gray300,
    backgroundColor: COLORS.surface,
  },
  btnGhostTxt: { fontWeight: "700", color: COLORS.text },
  btnPrimary: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  btnPrimaryTxt: { color: "#fff", fontWeight: "800" },

  rtl: { textAlign: "right" },
});
