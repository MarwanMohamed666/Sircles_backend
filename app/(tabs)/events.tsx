import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Image,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Linking from "expo-linking";

import { ThemedText } from "@/components/ThemedText";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { DatabaseService } from "@/lib/database";
import EventModal from "@/components/EventModal";

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  location_url?: string;
  description: string;
  circleid?: string;
  circleName?: string;
  createdby: string;
  photo_url?: string;
  going_count?: number;
  interested_count?: number;
  maybe_count?: number;
  not_going_count?: number;
  userRsvpStatus?: "going" | "maybe" | "not_going" | null;
  event_interests?: Array<{
    interests: { id: string; title: string; category: string };
  }>;
}

type RSVPFilter = "any" | "going" | "maybe" | "not_going" | "none";

export default function EventsScreen() {
  const { texts, isRTL } = useLanguage();
  const { user } = useAuth();

  const PRIMARY = "#198F4B";
  const BG = "#FFFFFF";
  const TEXT = "#0F172A";
  const SUBTLE = "#6B7280";
  const BORDER = "#E5E7EB";
  const WARNING = "#F59E0B";
  const DANGER = "#EF4444";

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [circles, setCircles] = useState<{ id: string; name: string }[]>([]);
  const [deletableEvents, setDeletableEvents] = useState<Set<string>>(
    new Set()
  );

  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [query, setQuery] = useState("");

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [circleId, setCircleId] = useState<string | "any">("any");
  const [selectedInterests, setSelectedInterests] = useState<Set<string>>(
    new Set()
  );
  const [withPhoto, setWithPhoto] = useState(false);
  const [rsvpFilter, setRsvpFilter] = useState<RSVPFilter>("any");

  useEffect(() => {
    if (user) {
      fetchEvents();
      fetchUserCircles();
    }
  }, [user]);

  const fetchEvents = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await DatabaseService.getEvents();
      setEvents(data || []);
      if (data) await checkDeletableEvents(data);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserCircles = async () => {
    if (!user) return;
    try {
      const { data } = await DatabaseService.getUserCircles(user.id);
      if (data)
        setCircles(
          data.map((uc: any) => ({
            id: uc.circleid,
            name: uc.circles?.name || "Unknown Circle",
          }))
        );
    } catch {}
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!eventId) return Alert.alert("Error", "Invalid event ID");
    const { error } = await DatabaseService.deleteEvent(eventId);
    if (error)
      return Alert.alert("Error", "Failed to delete event: " + error.message);
    Alert.alert("Success", "Event deleted successfully");
    fetchEvents();
  };

  const checkIfCircleAdmin = async (circleIdX: string, userId: string) => {
    try {
      const { data } = await DatabaseService.isCircleAdmin(circleIdX, userId);
      return data?.isAdmin || false;
    } catch {
      return false;
    }
  };

  const checkDeletableEvents = async (fetchedEvents: Event[]) => {
    if (!user) return;
    const deletable = new Set<string>();
    for (const e of fetchedEvents) {
      if (e.createdby === user.id) deletable.add(e.id);
      else if (e.circleid && (await checkIfCircleAdmin(e.circleid, user.id)))
        deletable.add(e.id);
    }
    setDeletableEvents(deletable);
  };

  const handleRsvp = async (
    eventId: string,
    status: "going" | "maybe" | "not_going"
  ) => {
    if (!user) return;
    const event = events.find((e) => e.id === eventId);
    const current = event?.userRsvpStatus;
    let error;
    if (current) {
      if (current === status)
        ({ error } = await DatabaseService.deleteEventRsvp(eventId));
      else ({ error } = await DatabaseService.updateEventRsvp(eventId, status));
    } else ({ error } = await DatabaseService.createEventRsvp(eventId, status));
    if (error) return Alert.alert("Error", "Failed to update RSVP");
    fetchEvents();
  };

  const canEditEvent = async (event: Event) => {
    if (!user?.id) return false;
    if (event.createdby === user.id) return true;
    if (event.circleid) {
      try {
        const { data } = await DatabaseService.isCircleAdmin(
          event.circleid,
          user.id
        );
        return data?.isAdmin || false;
      } catch {
        return false;
      }
    }
    return false;
  };

  const handleEditEvent = async (event: Event) => {
    const ok = await canEditEvent(event);
    if (!ok)
      return Alert.alert(
        "Error",
        "You do not have permission to edit this event"
      );
    setEditingEvent({
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      location: event.location,
      location_url: event.location_url,
      circleid: event.circleid,
      interests: event.event_interests?.map((ei: any) => ei.interests.id) || [],
      photo_url: event.photo_url,
    });
    setShowEditEventModal(true);
  };

  const toDate = (e: Event) => new Date(e.date);
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const allInterests = useMemo(() => {
    const map: Record<string, string> = {};
    events.forEach((e) =>
      e.event_interests?.forEach((i) => {
        map[i.interests.id] = i.interests.title;
      })
    );
    return Object.entries(map).map(([id, title]) => ({ id, title }));
  }, [events]);

  const filteredSorted = useMemo(() => {
    const now = new Date();
    const q = query.trim().toLowerCase();
    const base = events.filter((e) =>
      tab === "upcoming"
        ? toDate(e) >= startOfDay(now)
        : toDate(e) < startOfDay(now)
    );
    const byQuery = q
      ? base.filter((e) => {
          const interestText = (e.event_interests || [])
            .map((i) => i.interests.title)
            .join(" ");
          const bucket = `${e.title} ${e.description} ${e.location} ${
            e.circleName || ""
          } ${interestText}`.toLowerCase();
          return bucket.includes(q);
        })
      : base;

    const byFilters = byQuery.filter((e) => {
      if (circleId !== "any" && e.circleid !== circleId) return false;
      if (withPhoto && !e.photo_url) return false;
      if (rsvpFilter !== "any") {
        if (rsvpFilter === "none" && e.userRsvpStatus) return false;
        if (rsvpFilter !== "none" && e.userRsvpStatus !== rsvpFilter)
          return false;
      }
      if (selectedInterests.size > 0) {
        const ids = new Set(
          (e.event_interests || []).map((i) => i.interests.id)
        );
        for (const id of selectedInterests) if (!ids.has(id)) return false;
      }
      return true;
    });

    return byFilters.sort((a, b) =>
      tab === "upcoming" ? +toDate(a) - +toDate(b) : +toDate(b) - +toDate(a)
    );
  }, [events, tab, query, circleId, selectedInterests, withPhoto, rsvpFilter]);

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const clearFilters = () => {
    setCircleId("any");
    setSelectedInterests(new Set());
    setWithPhoto(false);
    setRsvpFilter("any");
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: BG }]}>
      {/* Header */}
      <View style={styles.topBar}>
        <ThemedText type="title" style={[styles.brand, { color: PRIMARY }]}>
          Sircles
        </ThemedText>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: PRIMARY }]}
          onPress={() => setShowCreateModal(true)}
        >
          <IconSymbol name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <ThemedText type="title" style={[styles.heroTitle, { color: TEXT }]}>
          Find the perfect event for you.
        </ThemedText>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={[styles.searchBox, { borderColor: BORDER }]}>
          <IconSymbol name="magnifyingglass" size={18} color={SUBTLE} />
          <TextInput
            placeholder={texts.searchEvents || "Search Events"}
            placeholderTextColor={SUBTLE}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            underlineColorAndroid="transparent"
            selectionColor={PRIMARY}
            style={[
              styles.searchInput,
              { color: TEXT },
              isRTL && { textAlign: "right" },
              styles.inputNoOutline, // no yellow/orange outline
            ]}
          />
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity onPress={() => setTab("upcoming")}>
          <ThemedText
            style={[
              styles.tabText,
              tab === "upcoming"
                ? {
                    color: PRIMARY,
                    borderBottomColor: PRIMARY,
                    borderBottomWidth: 2,
                  }
                : { color: SUBTLE },
            ]}
          >
            {texts.upcoming || "Upcoming"}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab("past")}>
          <ThemedText
            style={[
              styles.tabText,
              tab === "past"
                ? {
                    color: PRIMARY,
                    borderBottomColor: PRIMARY,
                    borderBottomWidth: 2,
                  }
                : { color: SUBTLE },
            ]}
          >
            {texts.past || "Past"}
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* List */}
      <ScrollView
        style={styles.eventsList}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loading}>
            <ThemedText>Loading...</ThemedText>
          </View>
        ) : filteredSorted.length === 0 ? (
          <View style={styles.empty}>
            <ThemedText style={{ color: SUBTLE }}>No events yet</ThemedText>
          </View>
        ) : (
          filteredSorted.map((event) => {
            const showImage = !!event.photo_url;
            const interestArr = event.event_interests || [];
            const firstTwo = interestArr.slice(0, 2);
            const moreCount = Math.max(0, interestArr.length - 2);

            return (
              <TouchableOpacity
                key={event.id}
                style={styles.card}
                onPress={() => setSelectedEvent(event)}
              >
                {showImage && (
                  <Image
                    source={{ uri: event.photo_url! }}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                )}

                <View
                  style={[
                    styles.cardBody,
                    !showImage && styles.cardBodyRounded,
                  ]}
                >
                  {firstTwo.length > 0 && (
                    <View style={styles.interestsRow}>
                      {firstTwo.map((ei, idx) => (
                        <View
                          key={idx}
                          style={[styles.pill, { backgroundColor: PRIMARY }]}
                        >
                          <ThemedText style={styles.pillText}>
                            {ei.interests.title}
                          </ThemedText>
                        </View>
                      ))}
                      {moreCount > 0 && (
                        <ThemedText style={styles.moreInterests}>
                          +{moreCount} more
                        </ThemedText>
                      )}
                    </View>
                  )}

                  <ThemedText
                    type="defaultSemiBold"
                    style={[styles.title, isRTL && styles.rtl]}
                  >
                    {event.title}
                  </ThemedText>
                  {event.description?.trim()?.length > 0 && (
                    <ThemedText style={styles.eventDescription}>
                      {event.description}
                    </ThemedText>
                  )}

                  {event.circleid ? (
                    event.circleName && (
                      <ThemedText style={[styles.metaSmall, { color: SUBTLE }]}>
                        • {event.circleName}
                      </ThemedText>
                    )
                  ) : (
                    <ThemedText style={[styles.metaSmall, { color: SUBTLE }]}>
                      • General
                    </ThemedText>
                  )}

                  <View style={styles.metaRow}>
                    <IconSymbol name="calendar" size={16} color={SUBTLE} />
                    <ThemedText style={[styles.metaText, { color: SUBTLE }]}>
                      {event.date}
                    </ThemedText>
                    <IconSymbol name="clock" size={16} color={SUBTLE} />
                    <ThemedText style={[styles.metaText, { color: SUBTLE }]}>
                      {event.time}
                    </ThemedText>
                  </View>
                  <View style={styles.metaRow}>
                    <IconSymbol name="location" size={16} color={SUBTLE} />
                    {event.location_url ? (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(event.location_url!)}
                      >
                        <ThemedText
                          style={[
                            styles.metaText,
                            { color: PRIMARY, textDecorationLine: "underline" },
                          ]}
                        >
                          {event.location}
                        </ThemedText>
                      </TouchableOpacity>
                    ) : (
                      <ThemedText style={[styles.metaText, { color: SUBTLE }]}>
                        {event.location || "no location"}
                      </ThemedText>
                    )}
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.rsvpButtons}>
                    <TouchableOpacity
                      style={[
                        styles.rsvpBtn,
                        {
                          borderColor: PRIMARY,
                          backgroundColor:
                            event.userRsvpStatus === "going" ? PRIMARY : BG,
                        },
                      ]}
                      onPress={() => handleRsvp(event.id, "going")}
                    >
                      <IconSymbol
                        name="checkmark.circle.fill"
                        size={16}
                        color={
                          event.userRsvpStatus === "going" ? "#fff" : PRIMARY
                        }
                      />
                      <ThemedText
                        style={[
                          styles.rsvpText,
                          {
                            color:
                              event.userRsvpStatus === "going"
                                ? "#fff"
                                : PRIMARY,
                          },
                        ]}
                      >
                        Going ({event.going_count || 0})
                      </ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.rsvpBtn,
                        {
                          borderColor: WARNING,
                          backgroundColor:
                            event.userRsvpStatus === "maybe" ? WARNING : BG,
                        },
                      ]}
                      onPress={() => handleRsvp(event.id, "maybe")}
                    >
                      <IconSymbol
                        name="star.fill"
                        size={16}
                        color={
                          event.userRsvpStatus === "maybe" ? "#fff" : WARNING
                        }
                      />
                      <ThemedText
                        style={[
                          styles.rsvpText,
                          {
                            color:
                              event.userRsvpStatus === "maybe"
                                ? "#fff"
                                : WARNING,
                          },
                        ]}
                      >
                        Maybe ({event.maybe_count || 0})
                      </ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.rsvpBtn,
                        {
                          borderColor: DANGER,
                          backgroundColor:
                            event.userRsvpStatus === "not_going" ? DANGER : BG,
                        },
                      ]}
                      onPress={() => handleRsvp(event.id, "not_going")}
                    >
                      <IconSymbol
                        name="xmark.circle.fill"
                        size={16}
                        color={
                          event.userRsvpStatus === "not_going" ? "#fff" : DANGER
                        }
                      />
                      <ThemedText
                        style={[
                          styles.rsvpText,
                          {
                            color:
                              event.userRsvpStatus === "not_going"
                                ? "#fff"
                                : DANGER,
                          },
                        ]}
                      >
                        Can't Go ({event.not_going_count || 0})
                      </ThemedText>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={() => setSelectedEvent(event)}
                    style={styles.moreLinkWrap}
                  >
                    <ThemedText style={[styles.moreLink, { color: PRIMARY }]}>
                      For more details ›
                    </ThemedText>
                  </TouchableOpacity>
                </View>

                {deletableEvents.has(event.id) && (
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => handleEditEvent(event)}
                    >
                      <IconSymbol name="pencil" size={16} color={PRIMARY} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => handleDeleteEvent(event.id)}
                    >
                      <IconSymbol name="trash" size={16} color="#ff4444" />
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Details Modal */}
      <Modal
        visible={!!selectedEvent}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedEvent(null)}
      >
        {selectedEvent && (
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: "#FFFFFF" }]}>
              <View
                style={[styles.modalHeader, isRTL && styles.modalHeaderRTL]}
              >
                <ThemedText
                  type="subtitle"
                  style={[styles.modalTitle, { color: TEXT }]}
                >
                  {selectedEvent.title}
                </ThemedText>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setSelectedEvent(null)}
                >
                  <IconSymbol name="xmark" size={24} color={TEXT} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {selectedEvent.description?.trim()?.length > 0 && (
                  <ThemedText
                    style={{ color: TEXT, marginBottom: 12, lineHeight: 20 }}
                  >
                    {selectedEvent.description}
                  </ThemedText>
                )}
                <View style={styles.metaRow}>
                  <IconSymbol name="calendar" size={18} color={SUBTLE} />
                  <ThemedText style={[styles.metaText, { color: SUBTLE }]}>
                    {selectedEvent.date}
                  </ThemedText>
                </View>
                <View style={styles.metaRow}>
                  <IconSymbol name="clock" size={18} color={SUBTLE} />
                  <ThemedText style={[styles.metaText, { color: SUBTLE }]}>
                    {selectedEvent.time}
                  </ThemedText>
                </View>
                <View style={styles.metaRow}>
                  <IconSymbol name="location" size={18} color={SUBTLE} />
                  {selectedEvent.location_url ? (
                    <TouchableOpacity
                      onPress={() =>
                        Linking.openURL(selectedEvent.location_url!)
                      }
                    >
                      <ThemedText
                        style={[
                          styles.metaText,
                          { color: PRIMARY, textDecorationLine: "underline" },
                        ]}
                      >
                        {selectedEvent.location}
                      </ThemedText>
                    </TouchableOpacity>
                  ) : (
                    <ThemedText style={[styles.metaText, { color: SUBTLE }]}>
                      {selectedEvent.location}
                    </ThemedText>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>

      {/* Filters Sheet */}
      <Modal
        visible={filtersOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setFiltersOpen(false)}
      >
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { backgroundColor: BG }]}>
            <View className="header" style={styles.sheetHeader}>
              <ThemedText type="subtitle" style={{ color: TEXT }}>
                Filters
              </ThemedText>
              <TouchableOpacity onPress={() => setFiltersOpen(false)}>
                <IconSymbol name="xmark" size={22} color={TEXT} />
              </TouchableOpacity>
            </View>

            <ThemedText style={styles.sectionTitle}>Circle</ThemedText>
            <View style={styles.rowWrap}>
              <Chip
                label="Any"
                active={"any" === circleId}
                onPress={() => setCircleId("any")}
                tintColor={PRIMARY}
              />
              {circles.map((c) => (
                <Chip
                  key={c.id}
                  label={c.name}
                  active={circleId === c.id}
                  onPress={() => setCircleId(c.id)}
                  tintColor={PRIMARY}
                />
              ))}
            </View>

            <ThemedText style={styles.sectionTitle}>Interests</ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 8 }}
            >
              <View style={[styles.rowWrap, { paddingRight: 12 }]}>
                {allInterests.map((i) => (
                  <Chip
                    key={i.id}
                    label={i.title}
                    active={selectedInterests.has(i.id)}
                    onPress={() => toggleInterest(i.id)}
                    tintColor={PRIMARY}
                  />
                ))}
              </View>
            </ScrollView>

            <ThemedText style={styles.sectionTitle}>More</ThemedText>
            <View style={styles.rowWrap}>
              <Toggle
                label="With photo"
                value={withPhoto}
                onToggle={() => setWithPhoto((v) => !v)}
                tintColor={PRIMARY}
              />
            </View>

            <ThemedText style={styles.sectionTitle}>My RSVP</ThemedText>
            <View style={styles.rowWrap}>
              {(
                ["any", "going", "maybe", "not_going", "none"] as RSVPFilter[]
              ).map((k) => (
                <Chip
                  key={k}
                  label={
                    k === "any"
                      ? "Any"
                      : k === "not_going"
                      ? "Can't go"
                      : k === "none"
                      ? "No response"
                      : k.charAt(0).toUpperCase() + k.slice(1)
                  }
                  active={rsvpFilter === k}
                  onPress={() => setRsvpFilter(k)}
                  tintColor={PRIMARY}
                />
              ))}
            </View>

            <View style={styles.sheetActions}>
              <TouchableOpacity
                style={[styles.sheetBtn, styles.clearBtn]}
                onPress={clearFilters}
              >
                <ThemedText>Clear</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetBtn, { backgroundColor: PRIMARY }]}
                onPress={() => setFiltersOpen(false)}
              >
                <ThemedText style={{ color: "#fff" }}>Apply</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add/Edit */}
      <EventModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onEventCreated={fetchEvents}
        circles={circles}
      />
      <EventModal
        visible={showEditEventModal}
        onClose={() => setShowEditEventModal(false)}
        onEventCreated={fetchEvents}
        circles={circles}
        editingEvent={editingEvent}
      />
    </SafeAreaView>
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
        {
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 16,
          borderWidth: 1,
          marginRight: 8,
        },
        active
          ? { backgroundColor: tintColor, borderColor: tintColor }
          : { borderColor: "#E5E7EB" },
      ]}
    >
      <ThemedText
        style={{
          color: active ? "#fff" : "#111827",
          fontSize: 12,
          fontWeight: "600",
        }}
      >
        {label}
      </ThemedText>
    </TouchableOpacity>
  );
}
function Toggle({
  label,
  value,
  onToggle,
  tintColor,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
  tintColor: string;
}) {
  return (
    <TouchableOpacity onPress={onToggle} style={styles.toggle}>
      <View
        style={[
          styles.toggleTrack,
          { backgroundColor: value ? tintColor : "#E5E7EB" },
        ]}
      >
        <View
          style={[
            styles.toggleThumb,
            value ? { alignSelf: "flex-end" } : { alignSelf: "flex-start" },
          ]}
        />
      </View>
      <ThemedText style={{ marginLeft: 8 }}>{label}</ThemedText>
    </TouchableOpacity>
  );
}

/* styles */
const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: { fontSize: 28, fontWeight: "800" },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: { paddingHorizontal: 16, paddingVertical: 8 },
  heroTitle: { fontSize: 22, lineHeight: 28, fontWeight: "700" },

  searchWrap: { paddingHorizontal: 16, paddingTop: 8 },
  searchBox: {
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },
  inputNoOutline: {
    outlineStyle: "none" as any,
    outlineWidth: 0 as any,
    outlineColor: "transparent" as any,
    boxShadow: "none" as any,
  },

  tabsRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    gap: 20,
  },
  tabText: { fontSize: 14, fontWeight: "700", paddingBottom: 6 },

  eventsList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 14,
    position: "relative",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  cardImage: {
    width: "100%",
    height: 140,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  cardBody: {
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  cardBodyRounded: { borderTopLeftRadius: 12, borderTopRightRadius: 12 },

  interestsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  pillText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  moreInterests: { fontSize: 12, color: "#6B7280", fontWeight: "600" },

  title: { fontSize: 16, marginTop: 4, marginBottom: 4, color: "#000000ff", },
  eventDescription: {
    color: "#3d3d3dff",
    opacity: 0.9,
    marginBottom: 6,
    lineHeight: 20,
  },

  metaSmall: { fontSize: 12, marginBottom: 6 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  metaText: { fontSize: 14 },
  divider: {
    height: 1,
    width: "100%",
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: "#E5E7EB",
  },

  rsvpButtons: { flexDirection: "row", gap: 8 },
  rsvpBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  rsvpText: { fontSize: 12, fontWeight: "700" },

  moreLinkWrap: { alignItems: "flex-end", marginTop: 10 },
  moreLink: { fontSize: 12, fontWeight: "600" },

  cardActions: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },

  loading: { paddingVertical: 40, alignItems: "center" },
  empty: { paddingVertical: 40, alignItems: "center" },
  rtl: { textAlign: "right" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxHeight: "80%",
    padding: 20,
    borderRadius: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalHeaderRTL: { flexDirection: "row-reverse" },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  closeButton: { padding: 4 },

  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: "85%",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: { marginTop: 8, marginBottom: 6, fontWeight: "700" },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: 8,
  },
  sheetActions: { flexDirection: "row", gap: 8, marginTop: 8 },
  sheetBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  clearBtn: { borderWidth: 1, borderColor: "#E5E7EB" },

  toggle: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
    marginBottom: 8,
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: "center",
    backgroundColor: "#E5E7EB",
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
    alignSelf: "flex-start",
  },
});
