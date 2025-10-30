import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { DatePickerModal, TimePickerModal } from "react-native-paper-dates";
import { ThemedText } from "@/components/ThemedText";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useAuth } from "@/contexts/AuthContext";
import { DatabaseService } from "@/lib/database";

interface EventModalProps {
  visible: boolean;
  onClose: () => void;
  onEventCreated: (event: any) => void;
  preSelectedCircleId?: string;
  circles?: Array<{ id: string; name: string }>;
  editingEvent?: any | null;
}

interface NewEvent {
  title: string;
  date: string;
  time: string;
  location: string;
  location_url: string | null;
  description: string;
  circleId: string;
  interests: string[];
}

export default function EventModal({
  visible,
  onClose,
  onEventCreated,
  preSelectedCircleId,
  circles = [],
  editingEvent = null,
}: EventModalProps) {
  const { user } = useAuth();

  const PRIMARY = "#198F4B";
  const BG = "#FFFFFF";
  const SURFACE = "#FFFFFF";
  const TEXT = "#0F172A";
  const SUBTLE = "#6B7280";
  const BORDER = "#E5E7EB";

  const [newEvent, setNewEvent] = useState<NewEvent>({
    title: "",
    date: "",
    time: "",
    location: "",
    location_url: null,
    description: "",
    circleId: preSelectedCircleId || "",
    interests: [],
  });

  const [interests, setInterests] = useState<{ [category: string]: any[] }>({});
  const [uploading, setUploading] = useState(false);
  const [date, setDate] = useState(new Date());
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [isTimePickerVisible, setTimePickerVisible] = useState(false);
  const [selectedPhoto, setSelectedPhoto] =
    useState<ImagePicker.ImagePickerAsset | null>(null);

  // القيود على الأنواع
  const ALLOWED_MIME = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ]);
  const ALLOWED_EXT = new Set([".jpeg", ".jpg", ".png", ".webp"]);

  function hasAllowedExt(uriOrName: string) {
    const lower = uriOrName.toLowerCase();
    for (const ext of ALLOWED_EXT) if (lower.endsWith(ext)) return true;
    return false;
  }

  function isAllowedImage(asset: ImagePicker.ImagePickerAsset) {
    if (asset.mimeType && ALLOWED_MIME.has(asset.mimeType)) return true;
    if ((asset as any).fileName && hasAllowedExt((asset as any).fileName))
      return true;
    if (asset.uri && hasAllowedExt(asset.uri)) return true;
    return false;
  }

  function notifyTypeRestriction() {
    const msgWeb = "Allowed image types: PNG or JPEG (JPG).";
    const msgNativeTitle = "تحذير";
    const msgNativeBody = "الصور المسموح بها: PNG أو JPEG (JPG).";
    if (Platform.OS === "web") {
      globalThis?.alert?.(msgWeb);
    } else {
      Alert.alert(msgNativeTitle, msgNativeBody);
    }
  }

  useEffect(() => {
    if (preSelectedCircleId)
      setNewEvent((p) => ({ ...p, circleId: preSelectedCircleId }));
  }, [preSelectedCircleId]);

  useEffect(() => {
    if (editingEvent && visible) {
      setNewEvent({
        title: editingEvent.title || "",
        date: editingEvent.date || "",
        time: editingEvent.time || "",
        location: editingEvent.location || "",
        location_url: editingEvent.location_url || null,
        description: editingEvent.description || "",
        circleId: editingEvent.circleid || preSelectedCircleId || "",
        interests: editingEvent.interests || [],
      });
      if (editingEvent.date) {
        const eventDate = new Date(editingEvent.date);
        if (!isNaN(eventDate.getTime())) setDate(eventDate);
      } else {
        setDate(new Date());
      }
      setSelectedPhoto(
        editingEvent.photo_url ? ({ uri: editingEvent.photo_url } as any) : null
      );
    } else if (visible) {
      resetForm();
    }
  }, [editingEvent, visible, preSelectedCircleId]);

  useEffect(() => {
    if (visible) loadInterests();
  }, [visible]);

  const loadInterests = async () => {
    try {
      const { data, error } = await DatabaseService.getInterestsByCategory();
      if (!error) setInterests(data || {});
    } catch {}
  };

  const toggleEventInterest = (interestId: string) => {
    setNewEvent((prev) => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter((id) => id !== interestId)
        : [...prev.interests, interestId],
    }));
  };

  const resetForm = () => {
    setNewEvent({
      title: "",
      date: "",
      time: "",
      location: "",
      location_url: "",
      description: "",
      circleId: preSelectedCircleId || "",
      interests: [],
    } as any);
    setSelectedPhoto(null);
  };

  const onDismissDatePicker = React.useCallback(() => {
    setDatePickerVisible(false);
  }, [setDatePickerVisible]);

  const onConfirmDatePicker = React.useCallback(
    (params: { date?: Date; startDate?: Date; endDate?: Date }) => {
      setDatePickerVisible(false);
      if (params.date) {
        const localDate = params.date;
        setDate(localDate);
        const year = localDate.getFullYear();
        const month = String(localDate.getMonth() + 1).padStart(2, "0");
        const day = String(localDate.getDate()).padStart(2, "0");
        const formattedDate = `${year}-${month}-${day}`;
        setNewEvent((prev) => ({ ...prev, date: formattedDate }));
      }
    },
    [setDatePickerVisible, setDate]
  );

  const onDismissTimePicker = React.useCallback(() => {
    setTimePickerVisible(false);
  }, [setTimePickerVisible]);

  const onConfirmTimePicker = React.useCallback(
    ({ hours, minutes }: { hours: number; minutes: number }) => {
      setTimePickerVisible(false);
      const formattedHours = String(hours).padStart(2, "0");
      const formattedMinutes = String(minutes).padStart(2, "0");
      const timeIn24HourFormat = `${formattedHours}:${formattedMinutes}`;
      setNewEvent((prev) => ({ ...prev, time: timeIn24HourFormat }));
    },
    []
  );

  const pickEventPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Allow photo library access.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
      base64: false,
    });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];

    // النوع
    if (!isAllowedImage(asset)) {
      notifyTypeRestriction();
      return;
    }

    // الحجم
    if ((asset as any).fileSize && (asset as any).fileSize > 5 * 1024 * 1024) {
      if (Platform.OS === "web") {
        globalThis?.alert?.("Image must be under 5MB.");
      } else {
        Alert.alert("تحذير", "حجم الصورة يجب أن يكون أقل من 5MB.");
      }
      return;
    }

    setSelectedPhoto(asset);
  };

  const handleCreateEvent = async () => {
    if (!user?.id) return;
    if (!newEvent.title.trim() || !newEvent.date || !newEvent.time) {
      Alert.alert("Error", "Title, date, and time are required.");
      return;
    }

    setUploading(true);

    try {
      let eventDataForCallback: any = null;

      if (editingEvent) {
        const updateData: any = {
          title: newEvent.title.trim(),
          description: newEvent.description.trim(),
          date: newEvent.date,
          time: newEvent.time,
          location: newEvent.location.trim(),
          location_url: newEvent.location_url?.trim() || null,
        };
        if (selectedPhoto && selectedPhoto.uri !== editingEvent.photo_url) {
          updateData.photoAsset = selectedPhoto;
        }
        const { error } = await DatabaseService.updateEvent(
          editingEvent.id,
          updateData
        );
        if (error) throw error;

        await DatabaseService.updateEventInterests(
          editingEvent.id,
          newEvent.interests
        );
        eventDataForCallback = { ...editingEvent, ...updateData };

        Alert.alert("Success", "Event updated successfully!");
      } else {
        const interestObjects = newEvent.interests.map((interestId) => ({
          interestid: interestId,
        }));

        const { data: newEventFromDB, error } =
          await DatabaseService.createEvent({
            ...newEvent,
            location_url: newEvent.location_url?.trim() || null,
            interests: interestObjects,
            photoAsset: selectedPhoto,
          });

        if (error) throw error;

        eventDataForCallback = newEventFromDB;

        Alert.alert("Success", "Event created successfully!");
      }

      resetForm();
      onClose();

      if (eventDataForCallback) onEventCreated?.(eventDataForCallback);
    } catch (e: any) {
      console.log("OPERATION FAILED:", JSON.stringify(e, null, 2));
      Alert.alert("Error", e?.message || "Operation failed.");
    } finally {
      setUploading(false);
    }
  };

  const getCircleName = () => {
    if (preSelectedCircleId)
      return (
        circles.find((c) => c.id === preSelectedCircleId)?.name ||
        "Current Circle"
      );
    return null;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={[styles.modalContainer, { backgroundColor: BG }]}>
        {/* Header */}
        <View
          style={[
            styles.modalHeader,
            { backgroundColor: SURFACE, borderBottomColor: BORDER },
          ]}
        >
          <TouchableOpacity
            onPress={() => {
              resetForm();
              onClose();
            }}
          >
            <IconSymbol name="xmark" size={24} color={TEXT} />
          </TouchableOpacity>

          <ThemedText style={[styles.modalTitle, { color: TEXT }]}>
            {editingEvent ? "Edit Event" : "Create Event"}
          </ThemedText>

          <TouchableOpacity
            onPress={handleCreateEvent}
            disabled={
              uploading ||
              !newEvent.title.trim() ||
              !newEvent.date ||
              !newEvent.time
            }
            style={[
              styles.primaryBtn,
              {
                backgroundColor:
                  uploading ||
                  !newEvent.title.trim() ||
                  !newEvent.date ||
                  !newEvent.time
                    ? "#C7D2FE"
                    : PRIMARY,
                opacity:
                  uploading ||
                  !newEvent.title.trim() ||
                  !newEvent.date ||
                  !newEvent.time
                    ? 0.6
                    : 1,
              },
            ]}
          >
            <ThemedText style={styles.primaryBtnText}>
              {uploading
                ? editingEvent
                  ? "Updating..."
                  : "Creating..."
                : editingEvent
                ? "Update"
                : "Create"}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Body */}
        <ScrollView
          style={styles.modalBody}
          showsVerticalScrollIndicator={false}
        >
          {/* Context */}
          <View style={styles.inputSection}>
            <ThemedText style={[styles.postingInLabel, { color: SUBTLE }]}>
              {editingEvent ? "Editing event in:" : "Creating event in:"}
            </ThemedText>
            <ThemedText style={[styles.circleName, { color: PRIMARY }]}>
              {preSelectedCircleId ? getCircleName() : "General Event"}
            </ThemedText>
          </View>

          {/* Title */}
          <Field
            label="Event Title *"
            value={newEvent.title}
            onChangeText={(t: string) =>
              setNewEvent((p) => ({ ...p, title: t }))
            }
            placeholder="Enter event title"
            TEXT={TEXT}
            SURFACE={SURFACE}
            BORDER={BORDER}
            PRIMARY={PRIMARY}
          />

          {/* Description */}
          <Field
            label="Description"
            value={newEvent.description}
            onChangeText={(t: string) =>
              setNewEvent((p) => ({ ...p, description: t }))
            }
            placeholder="Event description"
            multiline
            numberOfLines={4}
            TEXT={TEXT}
            SURFACE={SURFACE}
            BORDER={BORDER}
            PRIMARY={PRIMARY}
          />

          {/* Date & Time */}
          <View style={styles.dateTimeRow}>
            <View style={[{ flex: 1, marginRight: 8 }]}>
              <ThemedText style={[styles.inputLabel, { color: TEXT }]}>
                Date *
              </ThemedText>
              <TouchableOpacity
                onPress={() => setDatePickerVisible(true)}
                style={[styles.textInput, { justifyContent: "center" }]}
              >
                <ThemedText style={{ color: newEvent.date ? TEXT : "#9CA3AF" }}>
                  {newEvent.date || "YYYY-MM-DD"}
                </ThemedText>
              </TouchableOpacity>
            </View>

            <View style={[{ flex: 1, marginLeft: 8 }]}>
              <ThemedText style={[styles.inputLabel, { color: TEXT }]}>
                Time *
              </ThemedText>
              <TouchableOpacity
                onPress={() => setTimePickerVisible(true)}
                style={[styles.textInput, { justifyContent: "center" }]}
              >
                <ThemedText style={{ color: newEvent.time ? TEXT : "#9CA3AF" }}>
                  {newEvent.time || "HH:MM"}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          <DatePickerModal
            locale="en"
            mode="single"
            visible={isDatePickerVisible}
            onDismiss={onDismissDatePicker}
            date={date}
            onConfirm={onConfirmDatePicker}
          />

          <TimePickerModal
            visible={isTimePickerVisible}
            onDismiss={onDismissTimePicker}
            onConfirm={onConfirmTimePicker}
            hours={12}
            minutes={0}
            use24HourClock={false}
          />

          {/* Location */}
          <Field
            label="Location"
            value={newEvent.location}
            onChangeText={(t: string) =>
              setNewEvent((p) => ({ ...p, location: t }))
            }
            placeholder="Event location"
            TEXT={TEXT}
            SURFACE={SURFACE}
            BORDER={BORDER}
            PRIMARY={PRIMARY}
          />

          {/* Location URL */}
          <Field
            label="Location URL (Optional)"
            value={newEvent.location_url}
            onChangeText={(t: string) =>
              setNewEvent((p) => ({ ...p, location_url: t }))
            }
            placeholder="https://maps.google.com/..."
            keyboardType="url"
            autoCapitalize="none"
            TEXT={TEXT}
            SURFACE={SURFACE}
            BORDER={BORDER}
            PRIMARY={PRIMARY}
          />

          {/* Photo */}
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: TEXT }]}>
              Event Photo
            </ThemedText>
            <TouchableOpacity
              onPress={pickEventPhoto}
              style={[
                styles.photoPickerButton,
                { backgroundColor: SURFACE, borderColor: BORDER },
                selectedPhoto && styles.selectedPhotoContainer,
              ]}
            >
              {selectedPhoto ? (
                <>
                  <Image
                    source={{ uri: selectedPhoto.uri }}
                    style={styles.selectedEventPhoto}
                  />
                  <View
                    style={[
                      styles.photoOverlay,
                      { backgroundColor: "rgba(0,0,0,0.55)" },
                    ]}
                  >
                    <IconSymbol name="camera" size={16} color="#fff" />
                    <ThemedText style={styles.changePhotoText}>
                      Change Photo
                    </ThemedText>
                  </View>
                </>
              ) : (
                <View style={styles.photoPlaceholder}>
                  <IconSymbol name="camera" size={28} color={PRIMARY} />
                  <ThemedText
                    style={[styles.photoPickerText, { color: PRIMARY }]}
                  >
                    Tap to add event photo
                  </ThemedText>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Circle selection */}
          {!preSelectedCircleId && (
            <View style={styles.inputGroup}>
              <ThemedText style={[styles.inputLabel, { color: TEXT }]}>
                Circle (Optional)
              </ThemedText>
              <View style={styles.pickerContainer}>
                <Chip
                  label="General"
                  active={newEvent.circleId === ""}
                  onPress={() => setNewEvent((p) => ({ ...p, circleId: "" }))}
                  tintColor={PRIMARY}
                />
                {circles.map((c) => (
                  <Chip
                    key={c.id}
                    label={c.name}
                    active={newEvent.circleId === c.id}
                    onPress={() =>
                      setNewEvent((p) => ({ ...p, circleId: c.id }))
                    }
                    tintColor={PRIMARY}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Interests */}
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: TEXT }]}>
              Event Interests
            </ThemedText>
            <ScrollView style={styles.interestsScrollView}>
              {Object.entries(interests).map(
                ([category, categoryInterests]) => (
                  <View key={category} style={styles.interestCategory}>
                    <ThemedText
                      style={[styles.categoryTitle, { color: SUBTLE }]}
                    >
                      {category}
                    </ThemedText>
                    <View style={styles.interestChips}>
                      {(categoryInterests as any[]).map((interest: any) => (
                        <Chip
                          key={interest.id}
                          label={interest.title}
                          active={newEvent.interests.includes(interest.id)}
                          onPress={() => toggleEventInterest(interest.id)}
                          tintColor={PRIMARY}
                        />
                      ))}
                    </View>
                  </View>
                )
              )}
            </ScrollView>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

/* helpers */
function Chip({
  label,
  active,
  onPress,
  tintColor,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  tintColor: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.tagButton,
        active
          ? { backgroundColor: tintColor, borderColor: tintColor }
          : { backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" },
      ]}
    >
      <ThemedText
        style={[styles.tagButtonText, { color: active ? "#fff" : "#111827" }]}
      >
        {label}
      </ThemedText>
    </TouchableOpacity>
  );
}

function Field(props: any) {
  const {
    label,
    value,
    onChangeText,
    placeholder,
    multiline,
    numberOfLines,
    keyboardType,
    autoCapitalize,
    containerStyle,
    TEXT,
    SURFACE,
    BORDER,
    PRIMARY,
  } = props;

  const [focused, setFocused] = React.useState(false);

  return (
    <View style={[styles.inputGroup, containerStyle]}>
      <ThemedText style={[styles.inputLabel, { color: TEXT }]}>
        {label}
      </ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        multiline={multiline}
        numberOfLines={numberOfLines}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        selectionColor={PRIMARY}
        underlineColorAndroid="transparent"
        style={[
          multiline ? styles.textAreaInput : styles.textInput,
          {
            backgroundColor: SURFACE,
            color: TEXT,
            borderColor: focused ? PRIMARY : BORDER,
            outlineWidth: 0,
            outlineColor: "transparent",
            outlineStyle: "none",
          } as any,
        ]}
      />
    </View>
  );
}

/* styles */
const styles = StyleSheet.create({
  modalContainer: { flex: 1, width: "100%", backgroundColor: "#FFFFFF" },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },

  primaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  modalBody: { flex: 1, padding: 16 },

  inputSection: { marginBottom: 14 },
  postingInLabel: { fontSize: 13 },
  circleName: { fontSize: 16, fontWeight: "700", marginTop: 2 },

  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 14, fontWeight: "700", marginBottom: 6 },

  textInput: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    fontSize: 15,
  },
  textAreaInput: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: "top",
  },

  dateTimeRow: { flexDirection: "row", alignItems: "center", marginBottom: 2 },

  pickerContainer: { flexDirection: "row", flexWrap: "wrap" },

  tagButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  tagButtonText: { fontSize: 12, fontWeight: "700" },

  interestsScrollView: { maxHeight: 220 },
  interestCategory: { marginBottom: 14 },
  categoryTitle: { fontSize: 13, fontWeight: "700", marginBottom: 6 },

  interestChips: { flexDirection: "row", flexWrap: "wrap" },

  photoPickerButton: {
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 18,
    minHeight: 120,
  },
  photoPlaceholder: { justifyContent: "center", alignItems: "center" },
  photoPickerText: { fontSize: 14, fontWeight: "700", marginTop: 8 },

  selectedPhotoContainer: {
    position: "relative",
    overflow: "hidden",
    width: "100%",
  },
  selectedEventPhoto: { width: "100%", height: 200, borderRadius: 10 },
  photoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  changePhotoText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
