import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useLanguage } from "@/contexts/LanguageContext";
import { Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

// لوحة ألوان متوافقة مع اللقطات
const palette = {
  primary: "#198F4B",
  primaryDark: "#0A5C2B",
  bg: "#FFFFFF",
  surface: "#F8F9FA",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  chipBg: "#F3F4F6",
  chipText: "#111827",
  success: "#22C55E",
};
const handleLogout = async () => {
  try {
    // امسحي أي بيانات مستخدم محفوظة
    await AsyncStorage.removeItem("userToken");
    await AsyncStorage.removeItem("userData");

    // رجّعي المستخدم لصفحة اللوجين
    router.replace("/login");
  } catch (error) {
    console.log("Logout error:", error);
  }
};
export default function SettingsScreen() {
  const { texts, language, toggleLanguage, isRTL } = useLanguage();

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  // لا دارك مود هنا. الطابع في الشots فاتح + أخضر
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [notifications, setNotifications] = useState({
    messages: true,
    events: true,
    circleUpdates: true,
    communityPosts: false,
  });

  const handlePasswordChange = () => {
    if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
      Alert.alert(
        texts.error || "Error",
        texts.fillAllFields || "Please fill in all fields."
      );
      return;
    }
    if (passwordData.new !== passwordData.confirm) {
      Alert.alert(
        texts.error || "Error",
        texts.passwordMismatch || "New passwords do not match."
      );
      return;
    }
    if (passwordData.new.length < 6) {
      Alert.alert(
        texts.error || "Error",
        "Password must be at least 6 characters long."
      );
      return;
    }
    Alert.alert(
      texts.success || "Success",
      texts.passwordChanged || "Password changed successfully!"
    );
    setShowPasswordModal(false);
    setPasswordData({ current: "", new: "", confirm: "" });
  };

  const toggleTheme = () => {
    // مجرد تبديل نصي لإبقاء السويتش كما هو لو محتاجه
    setIsDarkMode(!isDarkMode);
    Alert.alert("Theme", `Switched to ${!isDarkMode ? "Dark" : "Light"} mode`);
  };

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.bg }]}>
      {/* Header أخضر صلب */}
      <View style={[styles.header, { backgroundColor: palette.primary }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol
            name={isRTL ? "chevron.right" : "chevron.left"}
            size={24}
            color={"#FFFFFF"}
          />
        </TouchableOpacity>
        <ThemedText
          type="title"
          style={[
            styles.headerTitle,
            { color: "#FFFFFF" },
            isRTL && styles.rtlText,
          ]}
        >
          {texts.settings || "Settings"}
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Password Settings */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              borderWidth: 1,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <IconSymbol name="lock" size={20} color={palette.primary} />
            <ThemedText
              type="defaultSemiBold"
              style={[
                styles.sectionTitle,
                { color: palette.text },
                isRTL && styles.rtlText,
              ]}
            >
              {texts.passwordSettings || "Password Settings"}
            </ThemedText>
          </View>

          <TouchableOpacity
            style={[styles.settingItem, isRTL && styles.settingItemRTL]}
            onPress={() => setShowPasswordModal(true)}
          >
            <View style={[styles.settingInfo, isRTL && styles.settingInfoRTL]}>
              <IconSymbol name="key.fill" size={20} color={palette.primary} />
              <ThemedText
                style={[
                  styles.settingLabel,
                  { color: palette.text },
                  isRTL && styles.rtlText,
                ]}
              >
                {texts.changePassword || "Change Password"}
              </ThemedText>
            </View>
            <IconSymbol
              name={isRTL ? "chevron.left" : "chevron.right"}
              size={16}
              color={palette.muted}
            />
          </TouchableOpacity>
        </View>

        {/* Theme Settings */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              borderWidth: 1,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <IconSymbol
              name={isDarkMode ? "moon.fill" : "sun.max.fill"}
              size={20}
              color={palette.primary}
            />
            <ThemedText
              type="defaultSemiBold"
              style={[
                styles.sectionTitle,
                { color: palette.text },
                isRTL && styles.rtlText,
              ]}
            >
              {texts.themeSettings || "Theme Settings"}
            </ThemedText>
          </View>

          <View style={[styles.settingItem, isRTL && styles.settingItemRTL]}>
            <View style={[styles.settingInfo, isRTL && styles.settingInfoRTL]}>
              <IconSymbol
                name={isDarkMode ? "moon.fill" : "sun.max.fill"}
                size={20}
                color={palette.primary}
              />
              <View>
                <ThemedText
                  style={[
                    styles.settingLabel,
                    { color: palette.text },
                    isRTL && styles.rtlText,
                  ]}
                >
                  {texts.darkMode || "Dark Mode"}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.settingDescription,
                    { color: palette.muted },
                    isRTL && styles.rtlText,
                  ]}
                >
                  {isDarkMode ? "Dark theme enabled" : "Light theme enabled"}
                </ThemedText>
              </View>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: palette.border, true: palette.primary }}
              thumbColor={"#FFFFFF"}
            />
          </View>
        </View>

        {/* Language Settings */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              borderWidth: 1,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <IconSymbol name="globe" size={20} color={palette.primary} />
            <ThemedText
              type="defaultSemiBold"
              style={[
                styles.sectionTitle,
                { color: palette.text },
                isRTL && styles.rtlText,
              ]}
            >
              {texts.languageSettings || "Language Settings"}
            </ThemedText>
          </View>

          <TouchableOpacity
            style={[styles.settingItem, isRTL && styles.settingItemRTL]}
            onPress={toggleLanguage}
          >
            <View style={[styles.settingInfo, isRTL && styles.settingInfoRTL]}>
              <IconSymbol name="globe" size={20} color={palette.primary} />
              <View>
                <ThemedText
                  style={[
                    styles.settingLabel,
                    { color: palette.text },
                    isRTL && styles.rtlText,
                  ]}
                >
                  {texts.language || "Language"}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.settingDescription,
                    { color: palette.muted },
                    isRTL && styles.rtlText,
                  ]}
                >
                  {language === "en" ? "English" : "العربية"}
                </ThemedText>
              </View>
            </View>
            {/* Chip بنفس طابع الشيبس الرمادي */}
            <View
              style={[
                styles.languageToggle,
                {
                  backgroundColor: palette.chipBg,
                  borderColor: palette.border,
                  borderWidth: 1,
                },
              ]}
            >
              <ThemedText
                style={[styles.languageToggleText, { color: palette.chipText }]}
              >
                {language === "en" ? "ع" : "EN"}
              </ThemedText>
            </View>
          </TouchableOpacity>
        </View>

        {/* Notification Settings */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              borderWidth: 1,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <IconSymbol name="bell" size={20} color={palette.primary} />
            <ThemedText
              type="defaultSemiBold"
              style={[
                styles.sectionTitle,
                { color: palette.text },
                isRTL && styles.rtlText,
              ]}
            >
              {texts.notificationSettings || "Notification Settings"}
            </ThemedText>
          </View>

          {[
            {
              key: "messages" as const,
              icon: "message.fill",
              label: texts.messageNotifications || "Message Notifications",
              desc: "Get notified about new messages",
            },
            {
              key: "events" as const,
              icon: "calendar",
              label: texts.eventNotifications || "Event Notifications",
              desc: "Get notified about upcoming events",
            },
            {
              key: "circleUpdates" as const,
              icon: "person.3.fill",
              label: texts.circleUpdates || "Circle Updates",
              desc: "Get notified about circle activities",
            },
            {
              key: "communityPosts" as const,
              icon: "megaphone.fill",
              label: texts.communityPosts || "Community Posts",
              desc: "Get notified about admin posts",
            },
          ].map((item) => (
            <View
              key={item.key}
              style={[styles.settingItem, isRTL && styles.settingItemRTL]}
            >
              <View
                style={[styles.settingInfo, isRTL && styles.settingInfoRTL]}
              >
                <IconSymbol
                  name={item.icon}
                  size={20}
                  color={palette.primary}
                />
                <View>
                  <ThemedText
                    style={[
                      styles.settingLabel,
                      { color: palette.text },
                      isRTL && styles.rtlText,
                    ]}
                  >
                    {item.label}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.settingDescription,
                      { color: palette.muted },
                      isRTL && styles.rtlText,
                    ]}
                  >
                    {item.desc}
                  </ThemedText>
                </View>
              </View>
              <Switch
                value={notifications[item.key]}
                onValueChange={() => toggleNotification(item.key)}
                trackColor={{ false: palette.border, true: palette.primary }}
                thumbColor={"#FFFFFF"}
              />
            </View>
          ))}
        </View>
        <View style={styles.containerLogOut}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View
          style={[
            styles.modalOverlay,
            { backgroundColor: "rgba(17,24,39,0.5)" },
          ]}
        >
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: palette.bg,
                borderColor: palette.border,
                borderWidth: 1,
              },
            ]}
          >
            <ThemedText
              type="subtitle"
              style={[
                styles.modalTitle,
                { color: palette.text },
                isRTL && styles.rtlText,
              ]}
            >
              {texts.changePassword || "Change Password"}
            </ThemedText>

            <View style={styles.formField}>
              <ThemedText
                style={[
                  styles.fieldLabel,
                  { color: palette.muted },
                  isRTL && styles.rtlText,
                ]}
              >
                {texts.currentPassword || "Current Password"}
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: palette.surface,
                    color: palette.text,
                    textAlign: isRTL ? "right" : "left",
                    borderColor: palette.border,
                    borderWidth: 1,
                  },
                ]}
                placeholder={
                  texts.enterCurrentPassword || "Enter current password"
                }
                placeholderTextColor={palette.muted}
                secureTextEntry
                value={passwordData.current}
                onChangeText={(text) =>
                  setPasswordData({ ...passwordData, current: text })
                }
              />
            </View>

            <View style={styles.formField}>
              <ThemedText
                style={[
                  styles.fieldLabel,
                  { color: palette.muted },
                  isRTL && styles.rtlText,
                ]}
              >
                {texts.newPassword || "New Password"}
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: palette.surface,
                    color: palette.text,
                    textAlign: isRTL ? "right" : "left",
                    borderColor: palette.border,
                    borderWidth: 1,
                  },
                ]}
                placeholder={texts.enterNewPassword || "Enter new password"}
                placeholderTextColor={palette.muted}
                secureTextEntry
                value={passwordData.new}
                onChangeText={(text) =>
                  setPasswordData({ ...passwordData, new: text })
                }
              />
            </View>

            <View style={styles.formField}>
              <ThemedText
                style={[
                  styles.fieldLabel,
                  { color: palette.muted },
                  isRTL && styles.rtlText,
                ]}
              >
                {texts.confirmPassword || "Confirm Password"}
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: palette.surface,
                    color: palette.text,
                    textAlign: isRTL ? "right" : "left",
                    borderColor: palette.border,
                    borderWidth: 1,
                  },
                ]}
                placeholder={texts.confirmNewPassword || "Confirm new password"}
                placeholderTextColor={palette.muted}
                secureTextEntry
                value={passwordData.confirm}
                onChangeText={(text) =>
                  setPasswordData({ ...passwordData, confirm: text })
                }
              />
            </View>

            <View
              style={[styles.modalActions, isRTL && styles.modalActionsRTL]}
            >
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                  { backgroundColor: palette.bg, borderColor: palette.border },
                ]}
                onPress={() => setShowPasswordModal(false)}
              >
                <ThemedText style={{ color: palette.text }}>
                  {texts.cancel || "Cancel"}
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: palette.primary },
                ]}
                onPress={handlePasswordChange}
              >
                <ThemedText style={{ color: "#FFFFFF" }}>{"Change"}</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, flex: 1, textAlign: "center" },
  headerSpacer: { width: 32 },

  content: { flex: 1, padding: 16 },

  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: "600" },

  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  settingItemRTL: { flexDirection: "row-reverse" },
  settingInfo: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  settingInfoRTL: { flexDirection: "row-reverse" },
  settingLabel: { fontSize: 16, fontWeight: "600" },
  settingDescription: { fontSize: 12, marginTop: 2 },

  languageToggle: {
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  languageToggleText: { fontSize: 12, fontWeight: "700" },

  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalContent: {
    width: "90%",
    maxHeight: "80%",
    padding: 20,
    borderRadius: 12,
  },
  modalTitle: { textAlign: "center", marginBottom: 16 },

  formField: { marginBottom: 16 },
  fieldLabel: { fontSize: 14, fontWeight: "600", marginBottom: 8 },

  textInput: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },

  modalActions: { flexDirection: "row", gap: 12 },
  modalActionsRTL: { flexDirection: "row-reverse" },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
  },
  cancelButton: {},

  rtlText: { textAlign: "right" },
  containerLogOut: {
    flexGrow: 1,
    justifyContent: "space-between",
    padding: 20,
    backgroundColor: "#fff",
  },
  logoutContainer: {
    marginTop: 40,
  },
  logoutButton: {
    backgroundColor: "#E53935",
    paddingVertical: 15,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
