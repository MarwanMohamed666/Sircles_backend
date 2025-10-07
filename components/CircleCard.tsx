import React, { useState } from "react";
import { View, TouchableOpacity, Image, StyleSheet, Alert } from "react-native";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import { IconSymbol } from "./ui/IconSymbol";
import { Circle } from "@/lib/circlePrefs";
import { AppTexts } from "@/constants/AppTexts";

interface CircleCardProps {
  circle: Circle;
  onJoin: (circleId: string) => void;
  onDismiss: (circle: Circle) => void;
  onSnooze: (circle: Circle, days?: number) => void;
}

export function CircleCard({
  circle,
  onJoin,
  onDismiss,
  onSnooze,
}: CircleCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  // ثابتة طبقًا للتصميم
  const SURFACE = "#FFFFFF";
  const TEXT = "#111827";
  const SUBTEXT = "#6B7280";
  const GREEN = "#198F4B";
  const REMOVE_BG = "#E5E7EB";

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
            onPress: () => onDismiss(circle),
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
            onPress: () => onSnooze(circle, 30),
          },
        ]
      );
    }
  };

  return (
    <ThemedView style={[styles.card, { backgroundColor: SURFACE }]}>
      {/* صورة عريضة بزاوية دائرية */}
      <View style={styles.heroWrap}>
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
          onPress={() => setShowMenu(!showMenu)}
        >
          <IconSymbol name="ellipsis" size={18} color={TEXT} />
        </TouchableOpacity>
      </View>

      {/* النصوص */}
      <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
        <ThemedText
          numberOfLines={1}
          style={[styles.circleName, { color: TEXT }]}
        >
          {circle.name}
        </ThemedText>

        {circle.score > 0 && (
          <ThemedText style={[styles.matchText, { color: GREEN }]}>
            {circle.score} interest match{circle.score > 1 ? "es" : ""}
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

      {/* القائمة المنسدلة */}
      {showMenu && (
        <View style={[styles.menuOverlay, { backgroundColor: SURFACE }]}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuAction("dismiss")}
          >
            <IconSymbol name="hand.thumbsdown" size={16} color="#EF5350" />
            <ThemedText style={[styles.menuItemText, { color: "#EF5350" }]}>
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

      {/* الأزرار */}
      <View style={styles.buttonsRow}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: GREEN }]}
          onPress={() => onJoin(circle.id)}
        >
          <ThemedText style={[styles.btnTxt, { color: "#fff" }]}>
            {AppTexts.en.joinCircle || "Join"}
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: REMOVE_BG }]}
          onPress={() => onDismiss(circle)}
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
