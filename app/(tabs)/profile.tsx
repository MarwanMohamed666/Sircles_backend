import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Image,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { ThemedText } from "@/components/ThemedText";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { DatabaseService } from "@/lib/database";
import { supabase } from "@/lib/supabase";
import { StorageService } from "@/lib/storage";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  birthday?: string;
  gender?: string;
  avatar?: string;
  address_apartment?: string;
  address_building?: string;
  address_block?: string;
}

const COLORS = {
  primary: "#2b7a4b",
  darkPrimary: "#0E4416",
  pageBg: "#FFFFFF",
  white: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  fieldBg: "#F3F4F6",
  fieldBorder: "#E5E7EB",
  chipBg: "#EFEFEF",
  chipText: "#111827",
  cardBorder: "#EEEEEE",
};

const SHADOW = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 3 },
  default: {},
});

export default function ProfileScreen() {
  const { texts } = useLanguage();
  const { user, userProfile, updateUserProfile, loading } = useAuth();

  const [showInterestModal, setShowInterestModal] = useState(false);
  const [showLookForModal, setShowLookForModal] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [userInterests, setUserInterests] = useState<{
    [category: string]: any[];
  }>({});
  const [userLookFor, setUserLookFor] = useState<{ [category: string]: any[] }>(
    {}
  );
  const [availableInterests, setAvailableInterests] = useState<{
    [category: string]: any[];
  }>({});

  // ===== avatar =====
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please grant photo library access to change your avatar"
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length)
      await uploadAvatar(result.assets[0]);
  };

  const uploadAvatar = async (asset: any) => {
    if (!user?.id) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setUploading(true);
    try {
      let ext = asset.uri.startsWith("data:image/")
        ? asset.uri.match(/data:image\/([^;]+)/)?.[1] || "png"
        : asset.uri.split(".").pop()?.toLowerCase() || "png";
      if (ext === "jpeg") ext = "jpg";
      if (!["png", "jpg"].includes(ext)) {
        Alert.alert("Error", "Please select PNG or JPG");
        return;
      }

      const { data, error } = await StorageService.uploadAvatar(
        user.id,
        asset,
        ext
      );
      if (error || !data?.publicUrl) {
        Alert.alert("Error", error?.message || "Upload failed");
        return;
      }
      await DatabaseService.updateUserAvatar(user.id, data.publicUrl);
      setAvatarUrl(data.publicUrl);
      if (updateUserProfile)
        await updateUserProfile({ avatar: data.publicUrl });
      Alert.alert("Success", "Avatar updated successfully");
    } finally {
      setUploading(false);
    }
  };

  // ===== data =====
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user]);

  useEffect(() => {
    if (user?.id) {
      fetchUserInterests();
      fetchUserLookFor();
      checkExistingAvatar();
    }
    fetchAvailableInterests();
  }, [user?.id, userProfile?.avatar]);

  const checkExistingAvatar = async () => {
    if (!user?.id) return;
    if (userProfile?.avatar) {
      setAvatarUrl(userProfile.avatar);
      return;
    }
    const { exists, extension } = await StorageService.checkAvatarExists(
      user.id
    );
    if (exists && extension) {
      const url = StorageService.getAvatarUrl(user.id, extension);
      setAvatarUrl(url);
      await DatabaseService.updateUserAvatar(user.id, url);
    }
  };

  const fetchUserInterests = async () => {
    if (!user?.id) return;
    const { data } = await DatabaseService.getUserInterests(user.id);
    if (data) {
      const grouped: { [category: string]: any[] } = {};
      data.forEach((row: any) => {
        const cat = row.interests?.category || "Other";
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(row.interests);
      });
      setUserInterests(grouped);
    }
  };

  const fetchUserLookFor = async () => {
    if (!user?.id) return;
    const { data } = await DatabaseService.getUserLookFor(user.id);
    if (data) {
      const grouped: { [category: string]: any[] } = {};
      data.forEach((row: any) => {
        const cat = row.interests?.category || "Other";
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(row.interests);
      });
      setUserLookFor(grouped);
    }
  };

  const fetchAvailableInterests = async () => {
    const { data } = await DatabaseService.getInterestsByCategory();
    if (data) setAvailableInterests(data);
  };

  const toggleInterest = async (interest: any) => {
    if (!user?.id) return;
    const isSelected = Object.values(userInterests)
      .flat()
      .some((i) => i.id === interest.id);
    if (isSelected) {
      await supabase
        .from("user_interests")
        .delete()
        .eq("userid", user.id)
        .eq("interestid", interest.id);
    } else {
      await supabase
        .from("user_interests")
        .insert({ userid: user.id, interestid: interest.id });
    }
    await fetchUserInterests();
  };

  const toggleLookFor = async (interest: any) => {
    if (!user?.id) return;
    const isSelected = Object.values(userLookFor)
      .flat()
      .some((i) => i.id === interest.id);
    if (isSelected) {
      await supabase
        .from("user_look_for")
        .delete()
        .eq("userid", user.id)
        .eq("interestid", interest.id);
    } else {
      await supabase
        .from("user_look_for")
        .insert([{ userid: user.id, interestid: interest.id }]);
    }
    await fetchUserLookFor();
  };

  if (loading || !user) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ThemedText>Loading…</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const fullAddress =
    (userProfile?.address_apartment
      ? `Apt ${userProfile.address_apartment}`
      : "") +
    (userProfile?.address_building
      ? `${userProfile?.address_apartment ? ", " : ""}Building ${
          userProfile.address_building
        }`
      : "") +
    (userProfile?.address_block
      ? `${
          userProfile?.address_apartment || userProfile?.address_building
            ? ", "
            : ""
        }Block ${userProfile.address_block}`
      : "");

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.pageContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <ThemedText style={styles.headerTitle}>Your Profile</ThemedText>
          <TouchableOpacity
            onPress={() => router.push("/settings")}
            style={styles.headerGear}
          >
            <Ionicons name="settings-outline" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.centerColumn}>
          <TouchableOpacity
            onPress={pickImage}
            disabled={uploading}
            style={styles.avatarWrap}
          >
            <View style={styles.avatarGreen}>
              {avatarUrl || userProfile?.avatar ? (
                <Image
                  source={{ uri: avatarUrl || userProfile?.avatar }}
                  style={styles.avatarImg}
                />
              ) : (
                <View style={[styles.avatarImg, styles.avatarPlaceholder]}>
                  <ThemedText style={{ fontSize: 28 }}>👤</ThemedText>
                </View>
              )}
            </View>
            <View style={styles.editAvatarBtn}>
              <IconSymbol name="pencil" size={14} color="#FFF" />
            </View>
          </TouchableOpacity>

          <ThemedText style={styles.nameText}>
            {userProfile?.name || "User"}
          </ThemedText>
          <ThemedText style={styles.metaText}>
            {(userProfile?.gender || "Male") + " • Circle 27"}
          </ThemedText>

          <View style={[styles.blockCard, SHADOW]}>
            <Field
              label="Your Email"
              value={user?.email || "example123@gmail.com"}
              icon={
                <MaterialIcons name="email" size={18} color={COLORS.muted} />
              }
            />
            <Field
              label="Phone Number"
              value={userProfile?.phone || "+20 1200001000"}
              icon={<Ionicons name="call" size={18} color={COLORS.muted} />}
            />
            <Field
              label="Address"
              value={fullAddress || "Apt 8, Building 8, Block B"}
              icon={
                <Ionicons
                  name="location-sharp"
                  size={18}
                  color={COLORS.muted}
                />
              }
            />
          </View>

          <SectionWithEdit
            title="Interests"
            onEdit={() => setShowInterestModal(true)}
          >
            {Object.keys(userInterests).length === 0 ? (
              <ThemedText style={styles.emptyText}>
                {texts.notInterested || "No interests added yet"}
              </ThemedText>
            ) : (
              Object.entries(userInterests).map(([cat, list]) => (
                <View key={cat} style={{ marginBottom: 10 }}>
                  <ThemedText style={styles.catTitle}>{cat}</ThemedText>
                  <View style={styles.tagsRow}>
                    {list.map((interest: any) => (
                      <View key={interest.id} style={styles.tag}>
                        <ThemedText style={styles.tagText}>
                          {interest.title}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                </View>
              ))
            )}
          </SectionWithEdit>

          <SectionWithEdit
            title="Looking For"
            onEdit={() => setShowLookForModal(true)}
          >
            {Object.keys(userLookFor).length === 0 ? (
              <ThemedText style={styles.emptyText}>
                No looking for preferences added yet
              </ThemedText>
            ) : (
              Object.entries(userLookFor).map(([cat, list]) => (
                <View key={cat} style={{ marginBottom: 10 }}>
                  <ThemedText style={styles.catTitle}>{cat}</ThemedText>
                  <View style={styles.tagsRow}>
                    {list.map((interest: any) => (
                      <View key={interest.id} style={styles.tag}>
                        <ThemedText style={styles.tagText}>
                          {interest.title}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                </View>
              ))
            )}
          </SectionWithEdit>
        </View>
      </ScrollView>

      {/* Modals */}
      <Modal
        visible={showInterestModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowInterestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, SHADOW]}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              {texts.interests || "Edit Interests"}
            </ThemedText>
            <ScrollView style={{ maxHeight: 420 }}>
              {Object.entries(availableInterests).map(
                ([category, interests]) => (
                  <View key={category} style={{ marginBottom: 16 }}>
                    <ThemedText style={styles.catTitle}>{category}</ThemedText>
                    <View style={styles.optionGrid}>
                      {(interests as any[]).map((interest: any) => {
                        const selected = Object.values(userInterests)
                          .flat()
                          .some((i: any) => i.id === interest.id);
                        return (
                          <TouchableOpacity
                            key={interest.id}
                            onPress={() => toggleInterest(interest)}
                            style={[
                              styles.optionBtn,
                              {
                                backgroundColor: selected
                                  ? COLORS.primary
                                  : "transparent",
                                borderColor: COLORS.primary,
                              },
                            ]}
                          >
                            <ThemedText
                              style={[
                                styles.optionText,
                                { color: selected ? "#FFF" : COLORS.text },
                              ]}
                            >
                              {interest.title}
                            </ThemedText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalPrimary}
              onPress={() => setShowInterestModal(false)}
            >
              <ThemedText style={{ color: "#FFF", fontWeight: "600" }}>
                Done
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showLookForModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowLookForModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, SHADOW]}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              Edit Looking For
            </ThemedText>
            <ScrollView style={{ maxHeight: 420 }}>
              {Object.entries(availableInterests).map(
                ([category, interests]) => (
                  <View key={category} style={{ marginBottom: 16 }}>
                    <ThemedText style={styles.catTitle}>{category}</ThemedText>
                    <View style={styles.optionGrid}>
                      {(interests as any[]).map((interest: any) => {
                        const selected = Object.values(userLookFor)
                          .flat()
                          .some((i: any) => i.id === interest.id);
                        return (
                          <TouchableOpacity
                            key={interest.id}
                            onPress={() => toggleLookFor(interest)}
                            style={[
                              styles.optionBtn,
                              {
                                backgroundColor: selected
                                  ? COLORS.primary
                                  : "transparent",
                                borderColor: COLORS.primary,
                              },
                            ]}
                          >
                            <ThemedText
                              style={[
                                styles.optionText,
                                { color: selected ? "#FFF" : COLORS.text },
                              ]}
                            >
                              {interest.title}
                            </ThemedText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalPrimary}
              onPress={() => setShowLookForModal(false)}
            >
              <ThemedText style={{ color: "#FFF", fontWeight: "600" }}>
                Done
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const Field = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) => {
  return (
    <View style={{ marginBottom: 12 }}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <View style={styles.inputWrap}>
        <TextInput
          editable={false}
          value={value}
          style={styles.input}
          pointerEvents="none"
        />
        <View style={styles.inputIconRight}>{icon}</View>
      </View>
    </View>
  );
};

const SectionWithEdit = ({ title, onEdit, children }: any) => (
  <View style={[styles.sectionCard, SHADOW]}>
    <View style={styles.sectionHeader}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      <TouchableOpacity onPress={onEdit} style={styles.editIconBtn}>
        <IconSymbol name="pencil" size={14} color="#FFF" />
      </TouchableOpacity>
    </View>
    <View style={styles.sectionBody}>{children}</View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.pageBg },

  pageContent: { paddingBottom: 24 },

  hero: {
    width: "100%",
    height: 120,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
    position: "absolute",
    top: 15,
    left: 16,
  },
  headerGear: {
    position: "absolute",
    right: 16,
    top: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  centerColumn: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    paddingHorizontal: 16,
  },

  avatarWrap: {
    alignSelf: "center",
    marginTop: -46,
  },
  avatarGreen: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#FFF",
  },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  editAvatarBtn: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  nameText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
  },
  metaText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "400",
    color: COLORS.muted,
    textAlign: "center",
    marginBottom: 12,
  },

  blockCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    width: "100%",
  },

  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  },
  inputWrap: {
    position: "relative",
    backgroundColor: COLORS.fieldBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.fieldBorder,
    height: 46,
    justifyContent: "center",
  },
  input: {
    height: 46,
    color: COLORS.text,
    paddingHorizontal: 12,
    paddingRight: 44,
    fontSize: 14,
  },
  inputIconRight: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },

  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    width: "100%",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: COLORS.text },
  editIconBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionBody: { backgroundColor: "#F6F7F8", borderRadius: 12, padding: 12 },

  catTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.muted,
    marginBottom: 8,
  },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    backgroundColor: COLORS.chipBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tagText: { fontSize: 12, fontWeight: "600", color: COLORS.chipText },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: {
    textAlign: "center",
    marginBottom: 12,
    fontWeight: "700",
    color: COLORS.text,
  },
  modalPrimary: {
    marginTop: 8,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },

  optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionBtn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderColor: COLORS.primary,
  },
  optionText: { fontSize: 12, fontWeight: "600" },

  emptyText: {
    color: COLORS.muted,
    fontSize: 13,
    textAlign: "center",
    marginVertical: 8,
  },
});
