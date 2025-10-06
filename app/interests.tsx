// app/interests.tsx
import { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { router } from "expo-router";

const MAX = 5;
const GREEN = "#198F4B";
const BG = "#ffffff";
const FG = "#111111";
const SUB = "#6b7280";
const BORDER = "#e5e7eb";

const DATA = [
  // Teaching
  { id: "int_teaching_arabic", title: "Arabic", category: "Teaching" },
  { id: "int_teaching_english", title: "English", category: "Teaching" },
  { id: "int_teaching_math", title: "Math", category: "Teaching" },
  { id: "int_teaching_physics", title: "Physics", category: "Teaching" },
  { id: "int_teaching_quran_memorization", title: "Quran Memorization", category: "Teaching" },
  { id: "int_teaching_reading_club", title: "Reading Club", category: "Teaching" },
  { id: "int_teaching_language_exchange", title: "Language Exchange", category: "Teaching" },

  // Engineering
  { id: "int_eng_civil", title: "Civil", category: "Engineering" },
  { id: "int_eng_mechanical", title: "Mechanical", category: "Engineering" },
  { id: "int_eng_agriculture", title: "Agriculture", category: "Engineering" },

  // Sports
  { id: "int_sports_walking", title: "Walking", category: "Sports" },
  { id: "int_sports_hiking", title: "Hiking", category: "Sports" },
  { id: "int_sports_swimming", title: "Swimming", category: "Sports" },
  { id: "int_sports_football", title: "Football", category: "Sports" },
  { id: "int_sports_tennis", title: "Tennis", category: "Sports" },
  { id: "int_sports_paddle_tennis", title: "Paddle Tennis", category: "Sports" },
  { id: "int_sports_basketball", title: "Basketball", category: "Sports" },
  { id: "int_sports_volleyball", title: "Volleyball", category: "Sports" },
  { id: "int_sports_running", title: "Running", category: "Sports" },
  { id: "int_sports_cycling", title: "Cycling", category: "Sports" },
  { id: "int_sports_gym_workouts", title: "Gym Workouts", category: "Sports" },
  { id: "int_sports_zumba", title: "Zumba", category: "Sports" },
  { id: "int_sports_crossfit", title: "CrossFit", category: "Sports" },

  // Art
  { id: "int_art_painting", title: "Painting", category: "Art" },
  { id: "int_art_movies", title: "Movies", category: "Art" },
  { id: "int_art_piano", title: "Piano", category: "Art" },
  { id: "int_art_guitar", title: "Guitar", category: "Art" },
  { id: "int_art_acting_theater", title: "Acting/Theater", category: "Art" },
  { id: "int_art_photography", title: "Photography", category: "Art" },
  { id: "int_art_drawing_for_kids", title: "Drawing for Kids", category: "Art" },

  // Handcrafts
  { id: "int_hand_pottery", title: "Pottery", category: "Handcrafts" },
  { id: "int_hand_crochet", title: "Crochet", category: "Handcrafts" },
  { id: "int_hand_car_mechanics", title: "Car Mechanics", category: "Handcrafts" },
  { id: "int_hand_plumbing", title: "Plumbing", category: "Handcrafts" },
  { id: "int_hand_carpentry", title: "Carpentry", category: "Handcrafts" },
  { id: "int_hand_handmade_accessories", title: "Handmade Accessories", category: "Handcrafts" },

  // Kids Activities
  { id: "int_kids_face_painting", title: "Face Painting", category: "Kids Activities" },
  { id: "int_kids_puppet_shows", title: "Puppet Shows", category: "Kids Activities" },
  { id: "int_kids_outdoor_games", title: "Outdoor Games", category: "Kids Activities" },
  { id: "int_kids_storytelling", title: "Storytelling", category: "Kids Activities" },
  { id: "int_kids_kids_yoga", title: "Kids Yoga", category: "Kids Activities" },

  // Community
  { id: "int_comm_gardening", title: "Gardening", category: "Community" },
  { id: "int_comm_bbq_night", title: "BBQ Night", category: "Community" },
  { id: "int_comm_movie_night", title: "Movie Night", category: "Community" },
  { id: "int_comm_board_games", title: "Board Games", category: "Community" },
  { id: "int_comm_potluck_dinner", title: "Potluck Dinner", category: "Community" },
  { id: "int_comm_recycling_activities", title: "Recycling Activities", category: "Community" },

  // Pets
  { id: "int_pets_pet_walking", title: "Pet Walking", category: "Pets" },
  { id: "int_pets_pet_training", title: "Pet Training", category: "Pets" },
  { id: "int_pets_dog_playdates", title: "Dog Playdates", category: "Pets" },

  // Wellness
  { id: "int_well_meditation", title: "Meditation", category: "Wellness" },
  { id: "int_well_yoga", title: "Yoga", category: "Wellness" },
  { id: "int_well_pilates", title: "Pilates", category: "Wellness" },
  { id: "int_well_massage_workshop", title: "Massage Workshop", category: "Wellness" },
  { id: "int_well_nutrition_coaching", title: "Nutrition Coaching", category: "Wellness" },

  // Tech & DIY
  { id: "int_techdiy_coding_for_kids", title: "Coding for Kids", category: "Tech & DIY" },
  { id: "int_techdiy_tech_meetups", title: "Tech Meetups", category: "Tech & DIY" },
  { id: "int_techdiy_robotics_club", title: "Robotics Club", category: "Tech & DIY" },
  { id: "int_techdiy_drone_flying", title: "Drone Flying", category: "Tech & DIY" },
  { id: "int_techdiy_diy_home_repairs", title: "DIY Home Repairs", category: "Tech & DIY" },
];

export default function InterestsScreen() {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const grouped = useMemo(() => {
    const items = DATA.filter((i) =>
      i.title.toLowerCase().includes(q.trim().toLowerCase())
    );
    return items.reduce<Record<string, typeof DATA>>((acc, it) => {
      acc[it.category] = acc[it.category] || [];
      acc[it.category].push(it);
      return acc;
    }, {});
  }, [q]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX) return prev;
      return [...prev, id];
    });
  };

  const removeSel = (id: string) =>
    setSelected((prev) => prev.filter((x) => x !== id));

  const onConfirm = () => router.replace("/(tabs)");
  const onSkip = () => router.replace("/(tabs)");

  return (
    <View style={[styles.screen]}>
      <View style={styles.card}>
        <Text style={styles.title}>Hello,{"\n"}Choose Your Interests!</Text>

        {/* search */}
        <View style={styles.searchWrap}>
          <TextInput
            placeholder="Search Interests"
            placeholderTextColor={SUB}
            value={q}
            onChangeText={setQ}
            style={styles.search}
          />
        </View>

        {/* selected chips */}
        {selected.length > 0 && (
          <View style={styles.selectedRow}>
            {selected.map((id) => {
              const t = DATA.find((x) => x.id === id)?.title ?? id;
              return (
                <TouchableOpacity
                  key={id}
                  onPress={() => removeSel(id)}
                  style={[styles.selChip]}
                >
                  <Text style={styles.selChipText}>{t} ×</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.divider} />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {Object.entries(grouped).map(([cat, items]) => (
            <View key={cat} style={{ marginBottom: 20 }}>
              <Text style={styles.sectionTitle}>{cat}</Text>
              <View style={styles.grid}>
                {items.map((it) => {
                  const isSel = selected.includes(it.id);
                  return (
                    <TouchableOpacity
                      key={it.id}
                      onPress={() => toggle(it.id)}
                      style={[
                        styles.chip,
                        {
                          borderColor: isSel ? GREEN : BORDER,
                          backgroundColor: isSel ? "#E6F5EC" : "#f3f4f6",
                        },
                      ]}
                    >
                      <Text
                        style={[styles.chipText, { color: isSel ? GREEN : FG }]}
                      >
                        {it.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* bottom actions */}
      <View style={styles.bottom}>
        <TouchableOpacity style={styles.skipBtn} onPress={onSkip}>
          <Text style={[styles.skipText]}>Skip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cta, { opacity: selected.length === 0 ? 0.5 : 1 }]}
          onPress={onConfirm}
          disabled={selected.length === 0}
        >
          <Text style={styles.ctaText}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#ffffff" },
  card: {
    flex: 1,
    margin: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: BG,
  },
  title: { fontSize: 20, fontWeight: "700", color: FG, marginBottom: 12 },

  // ↓ غيّر
  searchWrap: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f9fafb",
    ...Platform.select({
      web: {
        outlineStyle: "none",
        outlineWidth: 0,
        outlineColor: "transparent",
        boxShadow: "none",
      } as any,
    }),
  },

  // ↓ غيّر
  search: {
    color: FG,
    fontSize: 14,
    padding: 0,
    ...Platform.select({
      web: {
        outlineStyle: "none",
        outlineWidth: 0,
        outlineColor: "transparent",
        boxShadow: "none",
      } as any,
    }),
  },

  selectedRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  selChip: {
    backgroundColor: GREEN,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  selChipText: { color: "#fff", fontWeight: "600" },
  divider: { height: 1, backgroundColor: BORDER, marginVertical: 12 },
  sectionTitle: { color: FG, fontWeight: "700", marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: { fontWeight: "600" },

  bottom: { padding: 16, gap: 12 },
  cta: {
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
  },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  skipBtn: {
    height: 48,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  skipText: { color: GREEN, fontWeight: "700", fontSize: 16 },
});
