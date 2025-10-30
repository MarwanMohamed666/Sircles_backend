import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import { IconSymbol } from "./ui/IconSymbol";
import { Circle } from "@/lib/circlePrefs";
import { AppTexts } from "@/constants/AppTexts";

interface CircleCardProps {
  circle: Circle;
  onJoin: (circleId: string) => Promise<void> | void;
  onLeave?: (circleId: string) => Promise<void> | void;
  onDismiss: (circleId: string) => void; // يزيل من السلايدر في الأب
  onSnooze: (circleId: string, days?: number) => void;
  initialJoined?: boolean;
}

export function CircleCard({
  circle,
  onJoin,
  onLeave,
  onDismiss,
  onSnooze,
  initialJoined,
}: CircleCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [joined, setJoined] = useState<boolean>(
    !!(
      initialJoined ??
      (circle as any)?.joined ??
      (circle as any)?.is_member ??
      (circle as any)?.isMember
    )
  );

  const SURFACE = "#FFFFFF";
  const TEXT = "#111827";
  const SUBTEXT = "#6B7280";
  const GREEN = "#198F4B";
  const REMOVE_BG = "#E5E7EB";
  const DANGER = "#EF4444";

  const handleMenuAction = (action: "dismiss" | "snooze") => {
    setShowMenu(false);
    if (action === "dismiss") {
      Alert.alert(
        AppTexts.en.notInterested || "Not Interested",
        AppTexts.en.dismissCircleConfirm ||
          `Remove "${circle.name}" from suggestions?`,
        [
          { text: AppTexts.en.cancel || "Cancel", style: "cancel" },
          {
            text: AppTexts.en.remove || "Remove",
            style: "destructive",
            onPress: () => onDismiss(circle.id),
          },
        ]
      );
    } else {
      Alert.alert(
        AppTexts.en.snoozeCircle || "Snooze Circle",
        AppTexts.en.snoozeCircleConfirm || `Hide "${circle.name}" for 30 days?`,
        [
          { text: AppTexts.en.cancel || "Cancel", style: "cancel" },
          {
            text: AppTexts.en.snooze || "Snooze",
            onPress: () => onSnooze(circle.id, 30),
          },
        ]
      );
    }
  };

  const navigateToCircle = () => {
    if (!circle?.id) return;
    router.push(`/circle/${circle.id}`);
  };

  const handleJoinPress = async () => {
    if (!circle?.id || joining) return;
    try {
      setJoining(true);
      await Promise.resolve(onJoin(circle.id)); // 1) Join
      setJoined(true);
      setShowMenu(false);
      navigateToCircle(); // 2) افتح صفحة السيركل
      onDismiss(circle.id); // 3) اشيل الكارد من السلايدر مباشرة
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to join circle");
    } finally {
      setJoining(false);
    }
  };

  const handleLeavePress = async () => {
    if (!circle?.id || leaving) return;
    if (!onLeave) {
      Alert.alert(
        "Unavailable",
        "Leaving requires onLeave handler in parent component."
      );
      return;
    }
    Alert.alert("Leave Circle", `Leave "${circle.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            setLeaving(true);
            await Promise.resolve(onLeave(circle.id));
            setJoined(false);
            setShowMenu(false);
          } catch (e: any) {
            Alert.alert("Error", e?.message || "Failed to leave circle");
          } finally {
            setLeaving(false);
          }
        },
      },
    ]);
  };

  return (
    <ThemedView style={[styles.card, { backgroundColor: SURFACE }]}>
      <TouchableOpacity
        style={styles.heroWrap}
        onPress={navigateToCircle}
        activeOpacity={0.85}
      >
        {circle.circle_profile_url ? (
          <Image
            source={{ uri: circle.circle_profile_url }}
            style={styles.heroImg}
          />
        ) : (
          <View style={styles.heroPlaceholder}>
            <IconSymbol name="photo" size={28} color={SUBTEXT} />
          </View>
        )}
        <TouchableOpacity
          style={styles.menuFab}
          onPress={() => setShowMenu((s) => !s)}
        >
          <IconSymbol name="ellipsis" size={18} color={TEXT} />
        </TouchableOpacity>
      </TouchableOpacity>

      <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
        <ThemedText
          numberOfLines={1}
          style={[styles.circleName, { color: TEXT }]}
        >
          {circle.name}
        </ThemedText>

        {(circle as any)?.score > 0 && (
          <ThemedText style={[styles.matchText, { color: GREEN }]}>
            {(circle as any).score} interest match
            {(circle as any).score > 1 ? "es" : ""}
          </ThemedText>
        )}

        {!!circle.description && (
          <ThemedText
            numberOfLines={2}
            style={[styles.description, { color: SUBTEXT }]}
          >
            {circle.description}
          </ThemedText>
        )}
      </View>

      {showMenu && (
        <View style={[styles.menuOverlay, { backgroundColor: SURFACE }]}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuAction("dismiss")}
          >
            <IconSymbol name="hand.thumbsdown" size={16} color={DANGER} />
            <ThemedText style={[styles.menuItemText, { color: DANGER }]}>
              {AppTexts.en.notInterested || "Not Interested"}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuAction("snooze")}
          >
            <IconSymbol name="clock" size={16} color={TEXT} />
            <ThemedText style={[styles.menuItemText, { color: TEXT }]}>
              {AppTexts.en.snooze30Days || "Snooze 30 days"}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setShowMenu(false)}
          >
            <IconSymbol name="xmark" size={16} color={TEXT} />
            <ThemedText style={[styles.menuItemText, { color: TEXT }]}>
              {AppTexts.en.cancel || "Cancel"}
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.buttonsRow}>
        {!joined ? (
          <TouchableOpacity
            style={[
              styles.btn,
              { backgroundColor: GREEN, opacity: joining ? 0.7 : 1 },
            ]}
            onPress={handleJoinPress}
            disabled={joining || leaving}
          >
            {joining ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={[styles.btnTxt, { color: "#fff" }]}>
                {AppTexts.en.joinCircle || "Join"}
              </ThemedText>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.btn,
              { backgroundColor: REMOVE_BG, opacity: leaving ? 0.7 : 1 },
            ]}
            onPress={handleLeavePress}
            disabled={joining || leaving}
          >
            {leaving ? (
              <ActivityIndicator color={DANGER} />
            ) : (
              <ThemedText style={[styles.btnTxt, { color: DANGER }]}>
                {AppTexts.en.leaveCircle || "Leave"}
              </ThemedText>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: REMOVE_BG }]}
          onPress={() => onDismiss(circle.id)}
          disabled={joining || leaving}
        >
          <ThemedText style={[styles.btnTxt, { color: TEXT }]}>
            {AppTexts.en.remove || "Remove"}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  heroWrap: {
    width: "100%",
    height: 120,
    position: "relative",
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  heroImg: { width: "100%", height: "100%", borderRadius: 10 },
  heroPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  menuFab: {
    position: "absolute",
    top: 8,
    right: 8,
    padding: 6,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 14,
  },

  circleName: { fontSize: 14, fontWeight: "700" },
  matchText: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  description: { fontSize: 12, marginTop: 6 },

  buttonsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  btn: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  btnTxt: { fontSize: 13, fontWeight: "700" },

  menuOverlay: {
    position: "absolute",
    top: 34,
    right: 8,
    minWidth: 170,
    borderRadius: 8,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 1000,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  menuItemText: { fontSize: 14, fontWeight: "500" },
});
