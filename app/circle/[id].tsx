import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Image,
  RefreshControl,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { DatabaseService } from "@/lib/database";
import { uploadCircleProfileImage } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { StorageService } from "@/lib/storage";
import EventModal from "@/components/EventModal";

interface Circle {
  id: string;
  name: string;
  description: string;
  privacy: "public" | "private";
  createdby: string;
  memberCount: number;
  isJoined: boolean;
  isAdmin: boolean;
  isMainAdmin: boolean;
  interests?: string[];
  creator?: string;
  circle_profile_url?: string;
  hasPendingRequest?: boolean;
}

interface Post {
  id: string;
  content: string;
  image?: string;
  creationdate: string;
  author: {
    name: string;
    avatar_url?: string;
  };
  likes: any[];
  comments: any[];
  likes_count?: number;
  userLiked?: boolean;
}

interface Member {
  id: string;
  name: string;
  avatar_url?: string;
  isAdmin: boolean;
}

interface JoinRequest {
  id: string;
  message: string;
  creationdate: string;
  users: {
    name: string;
    avatar?: string;
  };
}

/** تصميم الألوان */
const PALETTE = {
  background: "#FFFFFF",
  surface: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  muted: "#6B7280",
  tint: "#0E7F45", // الأخضر الأساسي
  success: "#0E7F45", // نفس الأخضر
  warning: "#F59E0B", // برتقالي
  danger: "#EF4444", // أحمر
  link: "#0EA5E9", // أزرق خفيف للروابط إن لزم
  overlay: "rgba(0,0,0,0.6)",
};

export default function CircleScreen() {
  const { id, tab = "feed" } = useLocalSearchParams();
  const circleId = Array.isArray(id) ? id[0] : id || "";

  const { user } = useAuth();
  const { texts, isRTL } = useLanguage();

  // تجاهل ألوان الثيم واستخدم البالِت لتطابق التصميم
  const backgroundColor = PALETTE.background;
  const surfaceColor = PALETTE.surface;
  const tintColor = PALETTE.tint;
  const textColor = PALETTE.text;
  const successColor = PALETTE.success;

  if (!circleId || circleId === "undefined") {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <View style={styles.centeredContainer}>
          <ThemedText>Invalid circle ID</ThemedText>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: tintColor }]}
            onPress={() => router.back()}
          >
            <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const [activeTab, setActiveTab] = useState<
    "feed" | "members" | "admin" | "events"
  >("feed");
  const [posts, setPosts] = useState<Post[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [selectedPostImage, setSelectedPostImage] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [requestSearchQuery, setRequestSearchQuery] = useState("");

  const [newPostContent, setNewPostContent] = useState("");
  const [createPostLoading, setCreatePostLoading] = useState(false);
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editPostContent, setEditPostContent] = useState("");
  const [editPostId, setEditPostId] = useState<string | null>(null);
  const [deletePostLoading, setDeletePostLoading] = useState<string | null>(
    null
  );
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [editedCircle, setEditedCircle] = useState({
    name: "",
    description: "",
    privacy: "public" as "public" | "private",
    interests: [] as string[],
    circle_profile_url: undefined as string | undefined,
    _selectedImageAsset: undefined as any,
  });
  const [allInterests, setAllInterests] = useState<any[]>([]);
  const [interestsByCategory, setInterestsByCategory] = useState<{
    [key: string]: any[];
  }>({});

  const [interests, setInterests] = useState<{ [category: string]: any[] }>({});
  const [uploading, setUploading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [circle, setCircle] = useState<Circle | null>(null);

  const loadEvents = async () => {
    if (!circleId) return;
    try {
      const { data, error } = await DatabaseService.getEventsByCircle(
        circleId as string
      );
      if (error) {
        console.error("Error loading events:", error);
        return;
      }
      setEvents(data || []);
    } catch (error) {
      console.error("Error loading events:", error);
    }
  };

  const loadInterests = async () => {
    try {
      const { data, error } = await DatabaseService.getInterestsByCategory();
      if (error) {
        console.error("Error loading interests:", error);
        return;
      }
      setInterests(data || {});
    } catch (error) {
      console.error("Error loading interests:", error);
    }
  };

  const handleSaveCircleChanges = async () => {
    console.log("Saving edited circle data...");
    await handleSaveChanges();
  };

  const deleteEvent = async (eventId: string) => {
    console.log(
      "🗑️ CIRCLE PAGE: Delete event button pressed for eventId:",
      eventId
    );
    if (!eventId) {
      console.error("🗑️ CIRCLE PAGE: No eventId provided");
      Alert.alert("Error", "Invalid event ID");
      return;
    }
    try {
      const { data, error } = await DatabaseService.deleteEvent(eventId);
      if (error) {
        console.error("🗑️ CIRCLE PAGE: Error deleting event:", error);
        Alert.alert("Error", "Failed to delete event: " + error.message);
        return;
      }
      Alert.alert("Success", "Event deleted successfully");
      await loadEvents();
    } catch (error) {
      console.error("🗑️ CIRCLE PAGE: Unexpected error deleting event:", error);
      Alert.alert("Error", "An unexpected error occurred.");
    }
  };

  const handleEditEvent = (event: any) => {
    setEditingEvent({
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      location: event.location,
      circleid: event.circleid,
      interests: event.event_interests?.map((ei: any) => ei.interests.id) || [],
      photo_url: event.photo_url,
    });
    setShowEditEventModal(true);
  };

  const handleSaveEventChanges = async () => {
    if (!editingEvent || !user?.id) {
      Alert.alert("Error", "Unable to save changes. Please try again.");
      return;
    }
    try {
      setLoading(true);
      let updateData: any = {
        title: editingEvent.title,
        description: editingEvent.description,
        date: editingEvent.date,
        time: editingEvent.time,
        location: editingEvent.location,
      };

      if (editingEvent._selectedImageAsset) {
        try {
          const { data: uploadData, error: uploadError } =
            await StorageService.uploadEventPhoto(
              editingEvent.id,
              editingEvent._selectedImageAsset,
              user.id
            );
          if (!uploadError && uploadData?.publicUrl)
            updateData.photo_url = uploadData.publicUrl;
        } catch {}
      }

      const { error } = await supabase
        .from("events")
        .update(updateData)
        .eq("id", editingEvent.id);
      if (error) {
        Alert.alert("Error", error.message || "Failed to update event");
        return;
      }

      try {
        await DatabaseService.updateEventInterests(
          editingEvent.id,
          editingEvent.interests
        );
      } catch {}

      Alert.alert("Success", "Event updated successfully");
      setShowEditEventModal(false);
      setEditingEvent(null);
      await loadEvents();
    } catch {
      Alert.alert("Error", "Failed to update event");
    } finally {
      setLoading(false);
    }
  };

  const canEditEvent = (event: any) => {
    if (!user?.id) return false;
    if (event.createdby === user.id) return true;
    if (event.circleid && circle?.isAdmin) return true;
    return false;
  };

  const handleEventImagePicker = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant photo library access to change event picture."
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });
      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        if (!asset.uri) {
          Alert.alert("Error", "Invalid image selected");
          return;
        }
        setEditingEvent((prev) =>
          prev
            ? { ...prev, photo_url: asset.uri, _selectedImageAsset: asset }
            : null
        );
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const handleEventRsvp = async (
    eventId: string,
    status: "going" | "maybe" | "no_going"
  ) => {
    if (!user) return;
    try {
      const event = events.find((e) => e.id === eventId);
      const hasExistingRsvp = event?.user_rsvp && event.user_rsvp.length > 0;

      if (hasExistingRsvp) {
        const currentStatus = event.user_rsvp[0].status;
        if (currentStatus === status) {
          const { error } = await DatabaseService.deleteEventRsvp(eventId);
          if (error) {
            Alert.alert("Error", "Failed to remove RSVP");
            return;
          }
        } else {
          const { error } = await DatabaseService.updateEventRsvp(
            eventId,
            status
          );
          if (error) {
            Alert.alert("Error", "Failed to update RSVP");
            return;
          }
        }
      } else {
        const { error } = await DatabaseService.createEventRsvp(
          eventId,
          status
        );
        if (error) {
          Alert.alert("Error", "Failed to create RSVP");
          return;
        }
      }
      await loadEvents();
    } catch {
      Alert.alert("Error", "Failed to update RSVP");
    }
  };
  const loadCircleData = async () => {
    if (!circleId || circleId === "undefined" || !user?.id) {
      setLoading(false);
      return;
    }
    try {
      const { data: circleDataFromDb } = await DatabaseService.getCircles();
      const currentCircle = circleDataFromDb?.find((c) => c.id === circleId);
      if (!currentCircle) {
        Alert.alert("Error", "Circle not found");
        router.back();
        return;
      }

      let isJoined = false;
      let isAdmin = false;
      let isMainAdmin = false;
      let hasPendingRequest = false;

      if (user?.id) {
        const { data: joinedCircles } =
          await DatabaseService.getUserJoinedCircles(user.id);
        isJoined =
          joinedCircles?.some((jc) => jc.circleid === circleId) || false;

        if (isJoined) {
          const { data: adminData } = await DatabaseService.isCircleAdmin(
            circleId as string,
            user.id
          );
          isAdmin = adminData?.isAdmin || false;
          isMainAdmin = adminData?.isMainAdmin || false;
        } else {
          const { data: pendingRequest } =
            await DatabaseService.getUserPendingRequest(
              circleId as string,
              user.id
            );
          hasPendingRequest = !!pendingRequest;
        }
      }

      const interests =
        currentCircle.circle_interests
          ?.map((ci: any) => ci.interests?.title)
          .filter(Boolean) || [];

      const updatedCircle = {
        ...currentCircle,
        isJoined,
        isAdmin,
        isMainAdmin,
        memberCount: currentCircle.member_count || 0,
        interests,
        creator: currentCircle.creator || currentCircle.createdby,
        hasPendingRequest,
      };

      setCircle(updatedCircle);
      setHasPendingRequest(hasPendingRequest);

      if (isJoined || currentCircle.privacy === "public") {
        const { data: postsData } = await DatabaseService.getPosts(
          circleId as string
        );
        setPosts(postsData || []);
      }

      if (isJoined || currentCircle.privacy === "public") {
        const { data: membersData } = await DatabaseService.getCircleMembers(
          circleId as string
        );
        setMembers(membersData || []);
      } else {
        setMembers([]);
      }

      if (isAdmin) {
        const { data: requestsData } =
          await DatabaseService.getCircleJoinRequests(circleId as string);
        setJoinRequests(requestsData || []);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load circle data");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCircleData();
    await loadEvents();
    setRefreshing(false);
  };

  const handleJoinRequest = async (
    requestId: string,
    action: "accept" | "reject"
  ) => {
    try {
      const { error } = await DatabaseService.handleJoinRequest(
        requestId,
        action
      );
      if (error) {
        Alert.alert("Error", `Failed to ${action} request: ${error.message}`);
        return;
      }
      Alert.alert("Success", `Request ${action}ed successfully`);
      await loadCircleData();
    } catch {
      Alert.alert("Error", `Failed to ${action} request`);
    }
  };

  const handleDeleteCircle = async () => {
    if (!user?.id || !circleId) {
      Alert.alert("Error", "Unable to delete circle. Please try again.");
      return;
    }
    Alert.alert(
      "Delete Circle",
      "Are you sure you want to delete the circle?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await DatabaseService.deleteCircle(
                circleId,
                user.id
              );
              if (error) {
                Alert.alert(
                  "Error",
                  error.message || "Failed to delete circle"
                );
                return;
              }
              Alert.alert("Success", "Circle deleted successfully", [
                {
                  text: "OK",
                  onPress: () => router.replace("/(tabs)/circles"),
                },
              ]);
            } catch {
              Alert.alert("Error", "Failed to delete circle");
            } finally {
              setLoading(false);
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!circle?.isAdmin) return;
    try {
      const { error } = await DatabaseService.removeMemberFromCircle(
        circleId as string,
        memberId,
        user!.id
      );
      if (error) {
        Alert.alert("Error", "Failed to remove member");
        return;
      }
      Alert.alert("Success", `${memberName} has been removed from the circle`);
      await loadCircleData();
    } catch {
      Alert.alert("Error", "Failed to remove member");
    }
  };

  const handleRemoveMemberAsAdmin = async (
    memberId: string,
    memberName: string
  ) => {
    if (!circle?.isAdmin) return;
    try {
      const { error } = await DatabaseService.removeMemberFromCircle(
        circleId as string,
        memberId,
        user!.id
      );
      if (error) {
        Alert.alert(
          "Error",
          `Failed to remove member: ${
            error.message || "Unknown error occurred"
          }`
        );
        return;
      }
      Alert.alert("Success", `${memberName} has been removed from the circle`);
      await loadCircleData();
    } catch (error) {
      Alert.alert("Error", `Unexpected error occurred`);
    }
  };

  const handleToggleAdmin = async (
    memberId: string,
    memberName: string,
    isCurrentlyAdmin: boolean
  ) => {
    if (!circle?.isAdmin || !user?.id || !circleId) return;
    try {
      let result;
      if (isCurrentlyAdmin) {
        result = await DatabaseService.removeCircleAdmin(
          circleId as string,
          memberId,
          user.id
        );
      } else {
        result = await DatabaseService.addCircleAdmin(
          circleId as string,
          memberId,
          user.id
        );
      }
      if (result?.error) {
        Alert.alert(
          "Error",
          `Failed to toggle admin for ${memberName}: ${
            result.error.message || ""
          }`
        );
        return;
      }
      setLoading(true);
      await loadCircleData();
      setLoading(false);
    } catch (error) {
      Alert.alert("Error", "Unexpected error occurred");
    }
  };

  const handleJoinCircle = async () => {
    if (!user?.id || !circleId || !circle) return;

    if (circle.privacy === "private") {
      Alert.prompt(
        "Request to Join",
        `Send a request to join "${circle.name}". You can include an optional message:`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Send Request",
            onPress: async (message) => {
              try {
                const { error } = await DatabaseService.requestToJoinCircle(
                  user.id,
                  circleId as string,
                  message || ""
                );
                if (error) {
                  if (error.message.includes("already")) {
                    Alert.alert(
                      "Info",
                      "You have already requested to join this circle."
                    );
                    setHasPendingRequest(true);
                    setCircle((prev) =>
                      prev ? { ...prev, hasPendingRequest: true } : null
                    );
                  } else {
                    Alert.alert("Error", "Failed to send join request");
                  }
                  return;
                }
                Alert.alert(
                  "Success",
                  "Join request sent! The admin will review your request."
                );
                setHasPendingRequest(true);
                setCircle((prev) =>
                  prev ? { ...prev, hasPendingRequest: true } : null
                );
                setTimeout(async () => {
                  await loadCircleData();
                }, 1000);
              } catch {
                Alert.alert("Error", "Failed to send join request");
              }
            },
          },
        ],
        "plain-text"
      );
    } else {
      try {
        const { error } = await DatabaseService.joinCircle(
          user.id,
          circleId as string
        );
        if (error) {
          if (error.message.includes("already a member"))
            Alert.alert("Info", "You are already a member of this circle.");
          else Alert.alert("Error", "Failed to join circle");
          return;
        }
        Alert.alert("Success", "You have joined the circle!");
        await loadCircleData();
      } catch {
        Alert.alert("Error", "Failed to join circle");
      }
    }
  };

  const handleLeaveCircle = async () => {
    if (!user?.id || !circleId) return;
    Alert.alert(
      "Leave Circle",
      "Are you sure you want to leave this circle?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await DatabaseService.leaveCircle(
                user.id,
                circleId
              );
              if (error) {
                Alert.alert("Error", error.message || "Failed to leave circle");
                return;
              }
              Alert.alert("Success", "You have left the circle");
              router.back();
            } catch {
              Alert.alert("Error", "Failed to leave circle");
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  const loadCircleInterests = async () => {
    try {
      const { data: interestsData, error } =
        await DatabaseService.getInterestsByCategory();
      if (error) {
        console.error("Error loading interests:", error);
        return;
      }
      setInterestsByCategory(interestsData || {});
      const allInterestsFlat = Object.values(interestsData || {}).flat();
      setAllInterests(allInterestsFlat);
    } catch (error) {
      console.error("Error loading interests:", error);
    }
  };

  const handleEditCircle = async () => {
    if (!circle) return;
    const { data: currentInterests } = await DatabaseService.getCircleInterests(
      circle.id
    );
    const currentInterestIds =
      currentInterests?.map((interest) => interest.id) || [];
    setEditedCircle({
      name: circle.name || "",
      description: circle.description || "",
      privacy: circle.privacy || "public",
      interests: currentInterestIds,
    });
    await loadCircleInterests();
    setShowEditModal(true);
  };

  const toggleEditInterest = (interestId: string) => {
    setEditedCircle((prev) => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter((id) => id !== interestId)
        : [...prev.interests, interestId],
    }));
  };

  const handleImagePicker = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant photo library access to change circle picture."
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });
      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        if (!asset.uri) {
          Alert.alert("Error", "Invalid image selected");
          return;
        }
        setEditedCircle((prev) => ({
          ...prev,
          circle_profile_url: asset.uri,
          _selectedImageAsset: asset,
        }));
      }
    } catch {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const handleCircleImagePicker = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.status !== "granted") {
        Alert.alert(
          "Permission required",
          "Please allow access to your photo library to change the circle image."
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"] as any,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.length) {
        const selectedAsset = result.assets[0];
        await uploadCircleImage(selectedAsset);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to select image. Please try again.");
    }
  };

  const uploadCircleImage = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!user?.id || !circleId) {
      Alert.alert("Error", "User or circle information is missing.");
      return;
    }
    setImageUploading(true);
    try {
      const result = await StorageService.uploadCircleProfilePicture(
        circleId as string,
        asset
      );
      if (result.error) {
        Alert.alert(
          "Upload Error",
          result.error.message || "Failed to upload circle image."
        );
        return;
      }
      if (result.data?.publicUrl) {
        const imageUrl = result.data.publicUrl;
        const { error: updateError } = await supabase
          .from("circles")
          .update({ circle_profile_url: imageUrl })
          .eq("id", circleId);
        if (updateError) {
          Alert.alert("Error", "Failed to update circle image.");
        } else {
          setCircle((prev) =>
            prev ? { ...prev, circle_profile_url: imageUrl } : null
          );
          Alert.alert("Success", "Circle image updated successfully!");
          await loadCircleData();
        }
      }
    } catch {
      Alert.alert("Error", "Failed to upload circle image. Please try again.");
    } finally {
      setImageUploading(false);
    }
  };

  const loadCirclePosts = async () => {
    if (!circleId) return;
    setLoading(true);
    try {
      const { data: postsData } = await DatabaseService.getPosts(
        circleId as string
      );
      setPosts(postsData || []);
    } catch {
      Alert.alert("Error", "Failed to load posts.");
    } finally {
      setLoading(false);
    }
  };

  const pickPostImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant photo library access to select images."
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });
      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        if (!asset.uri) {
          Alert.alert("Error", "Invalid image selected");
          return;
        }
        if (asset.fileSize && asset.fileSize > 3145728) {
          Alert.alert("Error", "Image size must be less than 3MB");
          return;
        }
        setSelectedPostImage(asset);
      }
    } catch {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) {
      Alert.alert("Error", "Please enter post content");
      return;
    }
    if (!user?.id) {
      Alert.alert("Error", "You must be logged in to create posts");
      return;
    }
    try {
      setCreatePostLoading(true);
      const { error } = await DatabaseService.createPost(
        { userid: user.id, content: newPostContent.trim(), circleid: circleId },
        selectedPostImage
      );
      if (error) {
        Alert.alert("Error", "Failed to create post");
        return;
      }
      setNewPostContent("");
      setSelectedPostImage(null);
      setShowPostModal(false);
      loadCirclePosts();
    } catch {
      Alert.alert("Error", "Failed to create post");
    } finally {
      setCreatePostLoading(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!user?.id) {
      Alert.alert("Error", "You must be logged in to like posts");
      return;
    }
    try {
      const postIndex = posts.findIndex((p) => p.id === postId);
      if (postIndex === -1) return;

      const post = posts[postIndex];
      const isCurrentlyLiked = post.userLiked;

      const updatedPosts = [...posts];
      updatedPosts[postIndex] = {
        ...post,
        userLiked: !isCurrentlyLiked,
        likes_count: isCurrentlyLiked
          ? (post.likes_count || 1) - 1
          : (post.likes_count || 0) + 1,
      };
      setPosts(updatedPosts);

      const { error } = isCurrentlyLiked
        ? await DatabaseService.unlikePost(postId, user.id)
        : await DatabaseService.likePost(postId, user.id);

      if (error) setPosts(posts);
    } catch {
      Alert.alert("Error", "Failed to update like");
    }
  };

  const handleEditPost = (postId: string, content: string) => {
    setEditPostId(postId);
    setEditPostContent(content || "");
    setIsEditingPost(true);
  };

  const handleCancelEdit = () => {
    setIsEditingPost(false);
    setEditPostId(null);
    setEditPostContent("");
  };

  const handleUpdatePost = async () => {
    if (!editPostId || !editPostContent.trim()) return;
    try {
      setLoading(true);
      const { error } = await DatabaseService.updatePost(
        editPostId,
        { content: editPostContent.trim() },
        user.id
      );
      if (error) {
        Alert.alert("Error", "Failed to update post");
        return;
      }
      setPosts(
        posts.map((post) =>
          post.id === editPostId
            ? { ...post, content: editPostContent.trim() }
            : post
        )
      );
      handleCancelEdit();
    } catch {
      Alert.alert("Error", "Failed to update post");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!user?.id) {
      Alert.alert("Error", "You must be logged in to delete posts");
      return;
    }
    setPostToDelete(postId);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeletePost = async () => {
    if (!postToDelete || !user?.id) return;
    try {
      setDeletePostLoading(postToDelete);
      setShowDeleteConfirmModal(false);
      const { data, error } = await DatabaseService.deletePost(
        postToDelete,
        user.id
      );
      if (error) {
        Alert.alert("Error", error.message || "Failed to delete post");
        return;
      }
      setPosts((prevPosts) =>
        prevPosts.filter((post) => post.id !== postToDelete)
      );
      Alert.alert("Success", "Post deleted successfully");
    } catch (error) {
      Alert.alert("Error", "Failed to delete post");
    } finally {
      setDeletePostLoading(null);
      setPostToDelete(null);
    }
  };

  const handleSaveChanges = async () => {
    if (!user?.id || !circleId || !circle) {
      Alert.alert("Error", "Unable to save changes. Please try again.");
      return;
    }
    try {
      setLoading(true);
      let updateData: any = {
        name: editedCircle.name,
        description: editedCircle.description,
        privacy: editedCircle.privacy,
      };

      if (editedCircle._selectedImageAsset) {
        try {
          const { data: uploadData } =
            await StorageService.uploadCircleProfilePicture(
              circle.id,
              editedCircle._selectedImageAsset
            );
          if (uploadData?.publicUrl)
            updateData.circle_profile_url = uploadData.publicUrl;
        } catch {}
      }

      const { error } = await DatabaseService.updateCircle(
        circleId as string,
        updateData,
        user.id
      );
      if (error) {
        Alert.alert("Error", error.message || "Failed to update circle");
        return;
      }

      try {
        const { data: currentInterests } =
          await DatabaseService.getCircleInterests(circleId as string);
        const currentInterestIds =
          currentInterests?.map((interest) => interest.id) || [];
        const interestsToAdd = editedCircle.interests.filter(
          (id) => !currentInterestIds.includes(id)
        );
        const interestsToRemove = currentInterestIds.filter(
          (id) => !editedCircle.interests.includes(id)
        );

        for (const interestId of interestsToRemove) {
          await supabase
            .from("circle_interests")
            .delete()
            .eq("circleid", circleId)
            .eq("interestid", interestId);
        }
        for (const interestId of interestsToAdd) {
          await supabase
            .from("circle_interests")
            .insert({ circleid: circleId, interestid: interestId });
        }
      } catch {}

      Alert.alert("Success", "Circle updated successfully");
      setShowEditModal(false);
      await loadCircleData();
    } catch {
      Alert.alert("Error", "Failed to update circle");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCircleData();
    loadEvents();
    loadInterests();
  }, [circleId, user]);

  useEffect(() => {
    if (tab && ["feed", "events", "chat", "admin"].includes(tab as string))
      setActiveTab(tab as any);
  }, [tab]);
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <View style={styles.centeredContainer}>
          <ThemedText>{texts.loading || "Loading..."}</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (!circle) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <View style={styles.centeredContainer}>
          <ThemedText>Circle not found</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const renderPost = (post: Post) => (
    <View
      key={post.id}
      style={[
        styles.postCard,
        {
          backgroundColor: surfaceColor,
          borderColor: PALETTE.border,
          borderWidth: 1,
        },
      ]}
    >
      <View style={[styles.postHeader, isRTL && styles.postHeaderRTL]}>
        <View style={[styles.authorInfo, isRTL && styles.authorInfoRTL]}>
          <Image
            source={{
              uri: post.author?.avatar_url || "https://via.placeholder.com/40",
            }}
            style={styles.authorAvatar}
          />
          <View style={styles.authorDetails}>
            <ThemedText type="defaultSemiBold" style={{ color: "#000000ff" }}>
              {post.author?.name || "Unknown User"}
            </ThemedText>
            <ThemedText style={styles.postTime}>
              {new Date(post.creationdate).toLocaleDateString()}
            </ThemedText>
          </View>
        </View>
        {(post.author?.id === user?.id || circle.isAdmin) && (
          <View style={styles.postEditActions}>
            {post.author?.id === user?.id && (
              <TouchableOpacity
                style={styles.postActionButton}
                onPress={() => handleEditPost(post.id, post.content)}
              >
                <IconSymbol name="pencil" size={16} color={tintColor} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.postActionButton,
                deletePostLoading === post.id && styles.disabledButton,
              ]}
              onPress={() => handleDeletePost(post.id)}
              disabled={deletePostLoading === post.id}
            >
              <IconSymbol
                name="trash"
                size={16}
                color={deletePostLoading === post.id ? "#ccc" : PALETTE.danger}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.postContentContainer}>
        <ThemedText style={styles.postContent}>{post.content}</ThemedText>
      </View>

      {post.image && (
        <Image source={{ uri: post.image }} style={styles.postImage} />
      )}

      <View style={styles.postInteractionActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleLikePost(post.id)}
        >
          <IconSymbol
            name={post.userLiked ? "heart.fill" : "heart"}
            size={20}
            color={post.userLiked ? PALETTE.danger : textColor}
          />
          <ThemedText
            style={[
              styles.actionText,
              post.userLiked && { color: PALETTE.danger },
            ]}
          >
            {post.likes_count || 0}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push(`/post/${post.id}`)}
        >
          <IconSymbol name="bubble.left" size={20} color={textColor} />
          <ThemedText style={styles.actionText}>
            {post.comments_count || post.comments?.length || 0}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
  const renderMember = (member: Member) => (
    <View
      key={member.id}
      style={[
        styles.memberCard,
        {
          backgroundColor: surfaceColor,
          borderColor: PALETTE.border,
          borderWidth: 1,
        },
      ]}
    >
      <View style={[styles.memberInfo, isRTL && styles.memberInfoRTL]}>
        <Image
          source={{
            uri: member.avatar_url || "https://via.placeholder.com/40",
          }}
          style={styles.memberAvatar}
        />
        <View style={styles.memberDetails}>
          <ThemedText type="defaultSemiBold" style={{ color: "#000000ff" }}>
            {member.name}
          </ThemedText>
          {member.isAdmin && (
            <ThemedText style={[styles.adminBadge, { color: tintColor }]}>
              Admin
            </ThemedText>
          )}
        </View>
      </View>
      {circle.isAdmin &&
        member.id !== circle.creator &&
        member.id !== user?.id && (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveMember(member.id, member.name)}
          >
            <IconSymbol name="minus.circle" size={20} color={PALETTE.danger} />
          </TouchableOpacity>
        )}
    </View>
  );

  const renderJoinRequest = (request: JoinRequest) => (
    <View
      key={request.id}
      style={[
        styles.requestCard,
        {
          backgroundColor: surfaceColor,
          borderColor: PALETTE.border,
          borderWidth: 1,
        },
      ]}
    >
      <View style={[styles.requestInfo, isRTL && styles.requestInfoRTL]}>
        <Image
          source={{
            uri: request.users.avatar || "https://via.placeholder.com/40",
          }}
          style={styles.requestAvatar}
        />
        <View style={styles.requestDetails}>
          <ThemedText type="defaultSemiBold">{request.users.name}</ThemedText>
          {request.message && (
            <ThemedText style={styles.requestMessage}>
              "{request.message}"
            </ThemedText>
          )}
          <ThemedText style={styles.requestTime}>
            {new Date(request.creationdate).toLocaleDateString()}
          </ThemedText>
        </View>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.requestButton, { backgroundColor: tintColor }]}
          onPress={() => handleJoinRequest(request.id, "accept")}
        >
          <ThemedText style={styles.requestButtonText}>Accept</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.requestButton, { backgroundColor: PALETTE.danger }]}
          onPress={() => handleJoinRequest(request.id, "reject")}
        >
          <ThemedText style={styles.requestButtonText}>Reject</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAdminMember = (member: Member) => (
    <View
      key={member.id}
      style={[
        styles.adminMemberCard,
        {
          backgroundColor: surfaceColor,
          borderColor: PALETTE.border,
          borderWidth: 1,
        },
      ]}
    >
      <View
        style={[styles.adminMemberInfo, isRTL && styles.adminMemberInfoRTL]}
      >
        <Image
          source={{
            uri: member.avatar_url || "https://via.placeholder.com/40",
          }}
          style={styles.adminMemberAvatar}
        />
        <View style={styles.adminMemberDetails}>
          <ThemedText type="defaultSemiBold" style={{ color: "#000000ff" }}>
            {member.name}
          </ThemedText>
          <View style={styles.memberBadges}>
            {member.isAdmin && (
              <View style={[styles.badge, { backgroundColor: tintColor }]}>
                <ThemedText style={styles.badgeText}>Admin</ThemedText>
              </View>
            )}
            {member.id === circle.creator && (
              <View style={[styles.badge, { backgroundColor: tintColor }]}>
                <ThemedText style={styles.badgeText}>Creator</ThemedText>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.adminMemberActions}>
        {member.id !== circle.creator && member.id !== user?.id && (
          <TouchableOpacity
            style={[
              styles.adminActionButton,
              { backgroundColor: PALETTE.danger },
            ]}
            onPress={() => handleRemoveMemberAsAdmin(member.id, member.name)}
          >
            <IconSymbol name="minus.circle" size={16} color="#fff" />
            <ThemedText style={styles.adminActionButtonText}>Remove</ThemedText>
          </TouchableOpacity>
        )}

        {member.id !== circle.creator &&
          member.id !== user?.id &&
          circle.isAdmin && (
            <TouchableOpacity
              style={[
                styles.adminActionButton,
                {
                  backgroundColor: member.isAdmin ? PALETTE.warning : tintColor,
                },
              ]}
              onPress={() =>
                handleToggleAdmin(member.id, member.name, member.isAdmin)
              }
            >
              <IconSymbol
                name={member.isAdmin ? "star.slash" : "star.fill"}
                size={16}
                color="#fff"
              />
              <ThemedText style={styles.adminActionButtonText}>
                {member.isAdmin ? "Remove Admin" : "Make Admin"}
              </ThemedText>
            </TouchableOpacity>
          )}
      </View>
    </View>
  );

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(memberSearchQuery.toLowerCase())
  );
  const filteredJoinRequests = joinRequests.filter((r) =>
    r.users.name.toLowerCase().includes(requestSearchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <View style={[styles.header, { backgroundColor: surfaceColor }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={textColor} />
        </TouchableOpacity>
        <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
          {circle.name}
        </ThemedText>
        <View style={styles.headerActions}>
          {!circle?.isJoined &&
            !hasPendingRequest &&
            !circle?.hasPendingRequest && (
              <TouchableOpacity
                style={[styles.joinButton, { backgroundColor: tintColor }]}
                onPress={handleJoinCircle}
                disabled={loading}
              >
                <IconSymbol name="plus" size={16} color="#fff" />
                <ThemedText style={styles.joinButtonText}>
                  {circle?.privacy === "private" ? "Request to Join" : "Join"}
                </ThemedText>
              </TouchableOpacity>
            )}

          {!circle?.isJoined &&
            (hasPendingRequest || circle?.hasPendingRequest) && (
              <TouchableOpacity
                style={[
                  styles.pendingButton,
                  { backgroundColor: PALETTE.warning },
                ]}
                disabled
              >
                <IconSymbol name="clock" size={16} color="#fff" />
                <ThemedText style={styles.pendingButtonText}>
                  Pending
                </ThemedText>
              </TouchableOpacity>
            )}

          {circle?.isJoined && circle?.creator !== user?.id && (
            <TouchableOpacity
              style={[styles.leaveButton, { backgroundColor: PALETTE.danger }]}
              onPress={handleLeaveCircle}
              disabled={loading}
            >
              <IconSymbol name="minus" size={16} color="#fff" />
              <ThemedText style={styles.leaveButtonText}>Leave</ThemedText>
            </TouchableOpacity>
          )}

          {circle?.isJoined && (
            <TouchableOpacity
              style={[styles.messageButton, { backgroundColor: PALETTE.link }]}
              onPress={() =>
                router.push(`/(tabs)/messages?circleId=${circle.id}`)
              }
            >
              <IconSymbol name="message" size={16} color="#fff" />
              <ThemedText style={styles.messageButtonText}>Messages</ThemedText>
            </TouchableOpacity>
          )}

          {circle?.isAdmin && (
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: tintColor }]}
              onPress={handleEditCircle}
              disabled={loading}
            >
              <IconSymbol name="pencil" size={16} color="#fff" />
              <ThemedText style={styles.editButtonText}>Edit</ThemedText>
            </TouchableOpacity>
          )}

          {circle?.creator === user?.id && (
            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: PALETTE.danger }]}
              onPress={handleDeleteCircle}
              disabled={loading}
            >
              <IconSymbol name="trash" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={[styles.circleInfo, { backgroundColor: surfaceColor }]}>
        <View style={styles.circleImageContainer}>
          {circle.circle_profile_url ? (
            <View style={styles.circleImageWithOverlay}>
              <Image
                source={{ uri: circle.circle_profile_url }}
                style={styles.circleHeaderImage}
                resizeMode="cover"
              />
              {circle.isAdmin && (
                <TouchableOpacity
                  style={styles.circleImageOverlayButton}
                  onPress={handleCircleImagePicker}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.circleOverlayButtonContent,
                      { backgroundColor: PALETTE.overlay },
                    ]}
                  >
                    <IconSymbol name="camera" size={16} color="#fff" />
                    <ThemedText style={styles.circleOverlayButtonText}>
                      Change Photo
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              {circle.isAdmin ? (
                <TouchableOpacity
                  style={[
                    styles.circleImagePlaceholderButton,
                    { backgroundColor, borderColor: tintColor },
                  ]}
                  onPress={handleCircleImagePicker}
                  activeOpacity={0.7}
                >
                  <View style={styles.circleImagePlaceholder}>
                    <IconSymbol name="camera" size={32} color={tintColor} />
                    <ThemedText
                      style={[
                        styles.circleImagePlaceholderText,
                        { color: tintColor },
                      ]}
                    >
                      Tap to Add Photo
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              ) : (
                <View
                  style={[
                    styles.circleImagePlaceholderView,
                    { backgroundColor: "#F9FAFB", borderColor: PALETTE.border },
                  ]}
                >
                  <View style={styles.circleImagePlaceholder}>
                    <IconSymbol
                      name="photo"
                      size={32}
                      color={textColor + "40"}
                    />
                    <ThemedText
                      style={[
                        styles.circleImagePlaceholderText,
                        { color: textColor + "40" },
                      ]}
                    >
                      No Photo
                    </ThemedText>
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        <ThemedText style={styles.circleDescription}>
          {circle.description}
        </ThemedText>

        <View style={styles.circleStats}>
          <View style={styles.statItem}>
            <IconSymbol name="person.3" size={16} color={textColor} />
            <ThemedText style={styles.statText}>
              {circle.memberCount} members
            </ThemedText>
          </View>
          <View style={styles.statItem}>
            <IconSymbol
              name={circle.privacy === "private" ? "lock.fill" : "globe"}
              size={16}
              color={textColor}
            />
            <ThemedText style={styles.statText}>
              {circle.privacy === "private" ? "Private" : "Public"}
            </ThemedText>
          </View>
        </View>

        {circle.interests && circle.interests.length > 0 && (
          <View style={styles.circleInterests}>
            <ThemedText style={styles.interestsTitle}>Interests:</ThemedText>
            <View style={styles.interestTags}>
              {circle.interests.map((interest, index) => (
                <View
                  key={index}
                  style={[
                    styles.interestTag,
                    { backgroundColor: tintColor + "20" },
                  ]}
                >
                  <ThemedText
                    style={[styles.interestTagText, { color: tintColor }]}
                  >
                    {interest}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      <View style={[styles.tabContainer, { backgroundColor: surfaceColor }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "feed" && { backgroundColor: tintColor },
          ]}
          onPress={() => setActiveTab("feed")}
        >
          <ThemedText
            style={[styles.tabText, activeTab === "feed" && { color: "#fff" }]}
          >
            Feed
          </ThemedText>
        </TouchableOpacity>
        {circle.isJoined && (
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "events" && { backgroundColor: tintColor },
            ]}
            onPress={() => setActiveTab("events")}
          >
            <ThemedText
              style={[
                styles.tabText,
                activeTab === "events" && { color: "#fff" },
              ]}
            >
              Events
            </ThemedText>
          </TouchableOpacity>
        )}
        {circle.isJoined && (
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "members" && { backgroundColor: tintColor },
            ]}
            onPress={() => setActiveTab("members")}
          >
            <ThemedText
              style={[
                styles.tabText,
                activeTab === "members" && { color: "#fff" },
              ]}
            >
              Members
            </ThemedText>
          </TouchableOpacity>
        )}
        {circle.isAdmin && (
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "admin" && { backgroundColor: tintColor },
            ]}
            onPress={() => setActiveTab("admin")}
          >
            <ThemedText
              style={[
                styles.tabText,
                activeTab === "admin" && { color: "#fff" },
              ]}
            >
              Admin
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {activeTab === "feed" && (
          <View style={styles.feedContainer}>
            {circle.isJoined || circle.privacy === "public" ? (
              posts.length > 0 ? (
                posts.map(renderPost)
              ) : (
                <View style={styles.emptyContainer}>
                  <ThemedText>No posts yet</ThemedText>
                  {circle.isJoined && (
                    <ThemedText style={styles.emptySubtext}>
                      Be the first to share something!
                    </ThemedText>
                  )}
                </View>
              )
            ) : (
              <View style={styles.emptyContainer}>
                <IconSymbol
                  name="lock.fill"
                  size={48}
                  color={textColor + "40"}
                />
                <ThemedText>
                  This is a private circle. Join to view posts.
                </ThemedText>
              </View>
            )}
          </View>
        )}
        {activeTab === "events" && (
          <View style={styles.eventsContainer}>
            {(circle?.creator === user?.id || circle.isAdmin) && (
              <TouchableOpacity
                style={[
                  styles.createPostButton,
                  { backgroundColor: tintColor },
                ]}
                onPress={() => setShowEventModal(true)}
              >
                <IconSymbol name="plus" size={20} color="#fff" />
                <ThemedText style={styles.createPostButtonText}>
                  Create Event
                </ThemedText>
              </TouchableOpacity>
            )}

            <FlatList
              data={events}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.eventCard,
                    {
                      backgroundColor: surfaceColor,
                      borderColor: PALETTE.border,
                    },
                  ]}
                >
                  <View style={styles.eventHeader}>
                    <View className="eventInfo" style={styles.eventInfo as any}>
                      <ThemedText style={styles.eventTitle}>
                        {item.title}
                      </ThemedText>
                      <ThemedText style={styles.eventDate}>
                        {new Date(item.date).toLocaleDateString()} at{" "}
                        {item.time}
                      </ThemedText>
                      {item.location && (
                        <View
                          style={{ flexDirection: "row", alignItems: "center" }}
                        >
                          <ThemedText style={styles.eventLocation}>
                            📍{" "}
                          </ThemedText>
                          {item.location_url ? (
                            <TouchableOpacity
                              onPress={() =>
                                Linking.openURL(item.location_url!)
                              }
                            >
                              <ThemedText
                                style={[
                                  styles.eventLocation,
                                  {
                                    color: PALETTE.link,
                                    textDecorationLine: "underline",
                                  },
                                ]}
                              >
                                {item.location}
                              </ThemedText>
                            </TouchableOpacity>
                          ) : (
                            <ThemedText style={styles.eventLocation}>
                              {item.location}
                            </ThemedText>
                          )}
                        </View>
                      )}
                    </View>
                    <View style={styles.eventActions}>
                      {canEditEvent(item) && (
                        <TouchableOpacity
                          style={styles.editEventButton}
                          onPress={() => handleEditEvent(item)}
                        >
                          <IconSymbol
                            name="pencil"
                            size={18}
                            color={tintColor}
                          />
                        </TouchableOpacity>
                      )}
                      {(circle?.creator === user?.id ||
                        circle.isAdmin ||
                        item.createdby === user?.id) && (
                        <TouchableOpacity
                          style={styles.deleteEventButton}
                          onPress={() => deleteEvent(item.id)}
                        >
                          <IconSymbol
                            name="trash"
                            size={18}
                            color={PALETTE.danger}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {item.photo_url && (
                    <Image
                      source={{ uri: item.photo_url }}
                      style={styles.eventPhoto}
                      resizeMode="cover"
                    />
                  )}

                  {item.description && (
                    <ThemedText style={styles.eventDescription}>
                      {item.description}
                    </ThemedText>
                  )}

                  {item.event_interests && item.event_interests.length > 0 && (
                    <View style={styles.eventInterests}>
                      {item.event_interests.map((ei: any) => (
                        <View
                          key={ei.interests.id}
                          style={[
                            styles.eventInterestChip,
                            {
                              backgroundColor: tintColor + "20",
                              borderColor: tintColor,
                            },
                          ]}
                        >
                          <ThemedText
                            style={[
                              styles.eventInterestText,
                              { color: tintColor },
                            ]}
                          >
                            {ei.interests.title}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  )}

                  <ThemedText style={styles.eventCreator}>
                    Created by {item.creator?.name || "Unknown"}
                  </ThemedText>

                  <View style={styles.eventRsvpSection}>
                    <View style={styles.eventRsvpButtons}>
                      <TouchableOpacity
                        style={[
                          styles.eventRsvpButton,
                          {
                            backgroundColor:
                              item.user_rsvp?.[0]?.status === "going"
                                ? successColor
                                : backgroundColor,
                            borderColor: successColor,
                          },
                        ]}
                        onPress={() => handleEventRsvp(item.id, "going")}
                      >
                        <IconSymbol
                          name="checkmark.circle.fill"
                          size={14}
                          color={
                            item.user_rsvp?.[0]?.status === "going"
                              ? "#fff"
                              : successColor
                          }
                        />
                        <ThemedText
                          style={[
                            styles.eventRsvpButtonText,
                            {
                              color:
                                item.user_rsvp?.[0]?.status === "going"
                                  ? "#fff"
                                  : successColor,
                            },
                          ]}
                        >
                          Going ({item.going_count || 0})
                        </ThemedText>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.eventRsvpButton,
                          {
                            backgroundColor:
                              item.user_rsvp?.[0]?.status === "maybe"
                                ? PALETTE.warning
                                : backgroundColor,
                            borderColor: PALETTE.warning,
                          },
                        ]}
                        onPress={() => handleEventRsvp(item.id, "maybe")}
                      >
                        <IconSymbol
                          name="star.fill"
                          size={14}
                          color={
                            item.user_rsvp?.[0]?.status === "maybe"
                              ? "#fff"
                              : PALETTE.warning
                          }
                        />
                        <ThemedText
                          style={[
                            styles.eventRsvpButtonText,
                            {
                              color:
                                item.user_rsvp?.[0]?.status === "maybe"
                                  ? "#fff"
                                  : PALETTE.warning,
                            },
                          ]}
                        >
                          Maybe ({item.maybe_count || 0})
                        </ThemedText>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.eventRsvpButton,
                          {
                            backgroundColor:
                              item.user_rsvp?.[0]?.status === "no_going"
                                ? PALETTE.danger
                                : backgroundColor,
                            borderColor: PALETTE.danger,
                          },
                        ]}
                        onPress={() => handleEventRsvp(item.id, "no_going")}
                      >
                        <IconSymbol
                          name="xmark.circle.fill"
                          size={14}
                          color={
                            item.user_rsvp?.[0]?.status === "no_going"
                              ? "#fff"
                              : PALETTE.danger
                          }
                        />
                        <ThemedText
                          style={[
                            styles.eventRsvpButtonText,
                            {
                              color:
                                item.user_rsvp?.[0]?.status === "no_going"
                                  ? "#fff"
                                  : PALETTE.danger,
                            },
                          ]}
                        >
                          Can't Go ({item.no_going_count || 0})
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <ThemedText style={styles.emptyStateText}>
                    No events yet
                  </ThemedText>
                </View>
              }
            />
          </View>
        )}

        {activeTab === "members" && circle.isJoined && (
          <View style={styles.membersContainer}>
            {members.map(renderMember)}
          </View>
        )}

        {activeTab === "admin" && circle.isAdmin && (
          <View style={styles.adminContainer}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Join Requests ({joinRequests.length})
            </ThemedText>
            <View
              style={[
                styles.searchContainer,
                { backgroundColor, borderColor: PALETTE.border },
              ]}
            >
              <IconSymbol
                name="magnifyingglass"
                size={16}
                color={textColor + "60"}
              />
              <TextInput
                style={[styles.searchInput, { color: textColor }]}
                placeholder="Search join requests by name..."
                placeholderTextColor={textColor + "60"}
                value={requestSearchQuery}
                onChangeText={setRequestSearchQuery}
              />
              {requestSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setRequestSearchQuery("")}>
                  <IconSymbol
                    name="xmark.circle.fill"
                    size={16}
                    color={textColor + "40"}
                  />
                </TouchableOpacity>
              )}
            </View>
            {filteredJoinRequests.length > 0 ? (
              filteredJoinRequests.map(renderJoinRequest)
            ) : joinRequests.length > 0 ? (
              <ThemedText style={styles.emptyText}>
                No join requests found matching "{requestSearchQuery}"
              </ThemedText>
            ) : (
              <ThemedText style={styles.emptyText}>
                No pending join requests
              </ThemedText>
            )}
            <ThemedText
              type="subtitle"
              style={[styles.sectionTitle, { marginTop: 24 }]}
            >
              Circle Members ({members.length})
            </ThemedText>{" "}
            <View
              style={[
                styles.searchContainer,
                { backgroundColor, borderColor: PALETTE.border },
              ]}
            >
              <IconSymbol
                name="magnifyingglass"
                size={16}
                color={textColor + "60"}
              />
              <TextInput
                style={[styles.searchInput, { color: textColor }]}
                placeholder="Search members by name..."
                placeholderTextColor={textColor + "60"}
                value={memberSearchQuery}
                onChangeText={setMemberSearchQuery}
              />
              {memberSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setMemberSearchQuery("")}>
                  <IconSymbol
                    name="xmark.circle.fill"
                    size={16}
                    color={textColor + "40"}
                  />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.adminMembersContainer}>
              {filteredMembers.length > 0 ? (
                filteredMembers.map(renderAdminMember)
              ) : members.length > 0 ? (
                <ThemedText style={styles.emptyText}>
                  No members found matching "{memberSearchQuery}"
                </ThemedText>
              ) : (
                <ThemedText style={styles.emptyText}>
                  No members found
                </ThemedText>
              )}
            </View>
            {/* <View style={[styles.debugInfo, { backgroundColor: "#F3F4F6" }]}>
              <ThemedText style={styles.debugText}>
                Debug Info: isAdmin={String(circle.isAdmin)}, isMainAdmin=
                {String(circle.isMainAdmin)}, creator={circle.creator},
                currentUser={user?.id}
              </ThemedText>
            </View> */}
          </View>
        )}
      </ScrollView>

      {circle.isJoined && activeTab === "feed" && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: tintColor }]}
          onPress={() => setShowPostModal(true)}
        >
          <IconSymbol name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Create Post Modal */}
      <Modal
        visible={showPostModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPostModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.createPostModalContent,
              { backgroundColor: surfaceColor },
            ]}
          >
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Create Post</ThemedText>
              <TouchableOpacity onPress={() => setShowPostModal(false)}>
                <IconSymbol name="xmark" size={20} color={textColor} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputSection}>
                <ThemedText style={styles.postingInLabel}>
                  Posting in:
                </ThemedText>
                <ThemedText style={[styles.circleName, { color: tintColor }]}>
                  {circle.name}
                </ThemedText>
              </View>

              <View style={styles.inputSection}>
                <ThemedText style={styles.inputLabel}>
                  What's on your mind?
                </ThemedText>
                <TextInput
                  style={[
                    styles.postInput,
                    {
                      backgroundColor: "#F9FAFB",
                      color: textColor,
                      borderColor: PALETTE.border,
                    },
                  ]}
                  value={newPostContent}
                  onChangeText={setNewPostContent}
                  placeholder="Share your thoughts with the circle..."
                  placeholderTextColor={textColor + "60"}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.inputSection}>
                <ThemedText style={styles.inputLabel}>Add Photo</ThemedText>
                <TouchableOpacity
                  onPress={pickPostImage}
                  style={[
                    styles.imagePickerButton,
                    { backgroundColor: "#F9FAFB", borderColor: tintColor },
                    selectedPostImage && styles.selectedImageContainer,
                  ]}
                >
                  {selectedPostImage ? (
                    <>
                      <Image
                        source={{ uri: selectedPostImage.uri }}
                        style={styles.selectedPostImage}
                      />
                      <View
                        style={[
                          styles.imageOverlay,
                          { backgroundColor: PALETTE.overlay },
                        ]}
                      >
                        <IconSymbol name="camera" size={16} color="#fff" />
                        <ThemedText style={styles.changeImageText}>
                          Change Photo
                        </ThemedText>
                      </View>
                    </>
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <IconSymbol name="camera" size={32} color={tintColor} />
                      <ThemedText
                        style={[styles.imagePickerText, { color: tintColor }]}
                      >
                        Tap to select photo
                      </ThemedText>
                    </View>
                  )}
                </TouchableOpacity>
                {selectedPostImage && (
                  <ThemedText
                    style={{
                      fontSize: 12,
                      color: textColor + "80",
                      marginTop: 4,
                    }}
                  >
                    File size:{" "}
                    {(selectedPostImage.fileSize / 1024 / 1024).toFixed(2)} MB
                  </ThemedText>
                )}
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                  { backgroundColor: "#F9FAFB", borderColor: PALETTE.border },
                ]}
                onPress={() => {
                  setShowPostModal(false);
                  setSelectedPostImage(null);
                }}
              >
                <ThemedText>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: tintColor }]}
                onPress={handleCreatePost}
                disabled={createPostLoading || !newPostContent.trim()}
              >
                <ThemedText style={{ color: "#fff" }}>Post</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Event Modals */}
      <EventModal
        visible={showEventModal}
        onClose={() => setShowEventModal(false)}
        onEventCreated={loadEvents}
        preSelectedCircleId={circleId as string}
        circles={[
          { id: circleId as string, name: circle?.name || "Current Circle" },
        ]}
      />

      <EventModal
        visible={showEditEventModal}
        onClose={() => setShowEditEventModal(false)}
        onEventCreated={loadEvents}
        preSelectedCircleId={circleId as string}
        circles={[
          { id: circleId as string, name: circle?.name || "Current Circle" },
        ]}
        editingEvent={editingEvent}
      />

      {/* Edit Post Modal */}
      <Modal
        visible={isEditingPost}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor }]}>
          <View style={[styles.modalHeader, { backgroundColor: surfaceColor }]}>
            <TouchableOpacity onPress={handleCancelEdit}>
              <ThemedText style={[styles.cancelButton, { color: tintColor }]}>
                Cancel
              </ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.modalTitle}>Edit Post</ThemedText>
            <TouchableOpacity
              onPress={handleUpdatePost}
              disabled={!editPostContent.trim()}
            >
              <ThemedText
                style={[
                  styles.saveButton,
                  {
                    color: editPostContent.trim()
                      ? tintColor
                      : textColor + "50",
                  },
                ]}
              >
                Save
              </ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputSection}>
              <ThemedText style={styles.inputLabel}>Edit your post</ThemedText>
              <TextInput
                style={[
                  styles.postInput,
                  {
                    backgroundColor: surfaceColor,
                    color: textColor,
                    borderColor: PALETTE.border,
                  },
                ]}
                value={editPostContent}
                onChangeText={setEditPostContent}
                placeholder="What's on your mind?"
                placeholderTextColor={textColor + "60"}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                autoFocus
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Edit Circle Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.editModalContent, { backgroundColor: surfaceColor }]}
          >
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Edit Circle</ThemedText>
              <TouchableOpacity
                style={[
                  styles.closeButton,
                  { backgroundColor: textColor + "20" },
                ]}
                onPress={() => setShowEditModal(false)}
              >
                <IconSymbol name="xmark" size={18} color={textColor} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              <View style={styles.inputSection}>
                <ThemedText style={styles.sectionLabel}>Circle Name</ThemedText>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: "#F9FAFB",
                      color: textColor,
                      borderColor: PALETTE.border,
                    },
                  ]}
                  value={editedCircle.name}
                  onChangeText={(text) =>
                    setEditedCircle((prev) => ({ ...prev, name: text }))
                  }
                  placeholder="Enter circle name"
                  placeholderTextColor={textColor + "60"}
                />
              </View>

              <View style={styles.inputSection}>
                <ThemedText style={styles.sectionLabel}>Description</ThemedText>
                <TextInput
                  style={[
                    styles.textAreaInput,
                    {
                      backgroundColor: "#F9FAFB",
                      color: textColor,
                      borderColor: PALETTE.border,
                    },
                  ]}
                  value={editedCircle.description}
                  onChangeText={(text) =>
                    setEditedCircle((prev) => ({ ...prev, description: text }))
                  }
                  placeholder="Enter circle description"
                  placeholderTextColor={textColor + "60"}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.inputSection}>
                <ThemedText style={styles.sectionLabel}>Privacy</ThemedText>
                <View style={styles.privacyOptions}>
                  <TouchableOpacity
                    style={[
                      styles.privacyOption,
                      {
                        backgroundColor: "#F9FAFB",
                        borderColor: PALETTE.border,
                      },
                      editedCircle.privacy === "public" && {
                        backgroundColor: tintColor + "10",
                        borderColor: tintColor,
                      },
                    ]}
                    onPress={() =>
                      setEditedCircle((prev) => ({
                        ...prev,
                        privacy: "public",
                      }))
                    }
                  >
                    <IconSymbol
                      name="globe"
                      size={20}
                      color={
                        editedCircle.privacy === "public"
                          ? tintColor
                          : textColor
                      }
                    />
                    <ThemedText
                      style={[
                        styles.privacyText,
                        editedCircle.privacy === "public" && {
                          color: tintColor,
                        },
                      ]}
                    >
                      Public
                    </ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.privacyOption,
                      {
                        backgroundColor: "#F9FAFB",
                        borderColor: PALETTE.border,
                      },
                      editedCircle.privacy === "private" && {
                        backgroundColor: tintColor + "10",
                        borderColor: tintColor,
                      },
                    ]}
                    onPress={() =>
                      setEditedCircle((prev) => ({
                        ...prev,
                        privacy: "private",
                      }))
                    }
                  >
                    <IconSymbol
                      name="lock.fill"
                      size={20}
                      color={
                        editedCircle.privacy === "private"
                          ? tintColor
                          : textColor
                      }
                    />
                    <ThemedText
                      style={[
                        styles.privacyText,
                        editedCircle.privacy === "private" && {
                          color: tintColor,
                        },
                      ]}
                    >
                      Private
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputSection}>
                <ThemedText style={styles.sectionLabel}>Interests</ThemedText>
                <View style={styles.interestsContainer}>
                  {Object.entries(interestsByCategory).map(
                    ([category, interests]) => (
                      <View key={category} style={styles.categorySection}>
                        <ThemedText style={styles.categoryTitle}>
                          {category}
                        </ThemedText>
                        <View style={styles.interestsGrid}>
                          {interests.map((interest: any) => (
                            <TouchableOpacity
                              key={interest.id}
                              style={[
                                styles.editInterestChip,
                                {
                                  backgroundColor:
                                    editedCircle.interests.includes(interest.id)
                                      ? tintColor
                                      : "#F9FAFB",
                                  borderColor: tintColor,
                                },
                              ]}
                              onPress={() => toggleEditInterest(interest.id)}
                            >
                              <ThemedText
                                style={[
                                  styles.editInterestChipText,
                                  {
                                    color: editedCircle.interests.includes(
                                      interest.id
                                    )
                                      ? "#fff"
                                      : textColor,
                                  },
                                ]}
                              >
                                {interest.title}
                              </ThemedText>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )
                  )}
                </View>
              </View>
            </ScrollView>

            <View
              style={[
                styles.modalFooter,
                {
                  backgroundColor: surfaceColor,
                  borderTopColor: PALETTE.border,
                },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                  { backgroundColor: "#F9FAFB", borderColor: PALETTE.border },
                ]}
                onPress={() => setShowEditModal(false)}
              >
                <ThemedText style={{ color: textColor }}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: tintColor }]}
                onPress={handleSaveCircleChanges}
              >
                <ThemedText style={{ color: "#fff", fontWeight: "600" }}>
                  Save Changes
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Post Confirmation Modal */}
      <Modal
        visible={showDeleteConfirmModal}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setShowDeleteConfirmModal(false);
          setPostToDelete(null);
        }}
      >
        <View style={styles.deleteModalOverlay}>
          <View
            style={[
              styles.deleteModalContent,
              { backgroundColor: surfaceColor },
            ]}
          >
            <View style={styles.deleteModalHeader}>
              <ThemedText style={styles.deleteModalTitle}>
                Delete Post
              </ThemedText>
            </View>

            <View style={styles.deleteModalBody}>
              <ThemedText style={styles.deleteModalMessage}>
                Are you sure you want to delete this post? This action cannot be
                undone.
              </ThemedText>
            </View>

            <View style={styles.deleteModalFooter}>
              <TouchableOpacity
                style={[
                  styles.deleteModalButton,
                  styles.cancelDeleteButton,
                  { backgroundColor: "#F9FAFB", borderColor: PALETTE.border },
                ]}
                onPress={() => {
                  setShowDeleteConfirmModal(false);
                  setPostToDelete(null);
                }}
              >
                <ThemedText style={{ color: textColor }}>Cancel</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.deleteModalButton,
                  { backgroundColor: PALETTE.danger },
                ]}
                onPress={confirmDeletePost}
                disabled={deletePostLoading === postToDelete}
              >
                <ThemedText style={{ color: "#fff", fontWeight: "600" }}>
                  {deletePostLoading === postToDelete
                    ? "Deleting..."
                    : "Delete"}
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
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  headerTitle: {
    fontSize: 18,
    flex: 1,
    textAlign: "center",
    color: "#0D5C27",
    fontWeight: "bold",
  },
  circleInfo: {
    padding: 14,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    margin: 10,
  },

  circleHeaderImage: {
    width: "100%",
    height: 160,
    borderRadius: 10,
    marginBottom: 10,
  },

  circleDescription: {
    fontSize: 13,
    marginBottom: 10,
    color: "#333",
    opacity: 0.9,
    lineHeight: 18,
  },

  circleStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  statText: {
    fontSize: 12,
    color: "#555",
    fontWeight: "500",
  },

  circleInterests: {
    marginTop: 6,
    borderTopWidth: 0.4,
    borderTopColor: "#E2E2E2",
    paddingTop: 8,
  },

  interestsTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000",
    marginBottom: 6,
  },

  interestTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },

  interestTag: {
    backgroundColor: "#0D5C27",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },

  interestTagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },

  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: "center",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0D5C27",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  feedContainer: {
    gap: 16,
  },
  postCard: {
    padding: 16,
    borderRadius: 12,
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  postHeaderRTL: {
    flexDirection: "row-reverse",
  },
  authorInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  authorInfoRTL: {
    flexDirection: "row-reverse",
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  authorDetails: {
    flex: 1,
  },
  postTime: {
    fontSize: 12,
    opacity: 0.5,
    color: "#6b7280",
  },
  postContentContainer: {
    marginBottom: 12,
  },
  postContent: {
    fontSize: 16,
    lineHeight: 24,
    color: "#333",
  },
  postImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
  },
  postActions: {
    flexDirection: "row",
    marginTop: 8,
    gap: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    opacity: 0.7,
    color: "#6b7280",
  },
  postActionButton: {
    padding: 8,
    borderRadius: 4,
  },
  disabledButton: {
    opacity: 0.5,
  },
  postEditActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  postInteractionActions: {
    flexDirection: "row",
    marginTop: 8,
    gap: 16,
  },
  membersContainer: {
    gap: 12,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  },
  memberInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  memberInfoRTL: {
    flexDirection: "row-reverse",
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  memberDetails: {
    flex: 1,
  },
  adminBadge: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "600",
  },
  removeButton: {
    padding: 8,
  },
  adminContainer: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 8,
    color: "#000000ff",
  },
  adminMembersContainer: {
    gap: 12,
  },
  adminMemberCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  adminMemberInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  adminMemberInfoRTL: {
    flexDirection: "row-reverse",
  },
  adminMemberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  adminMemberDetails: {
    flex: 1,
  },
  memberBadges: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  adminMemberActions: {
    flexDirection: "column",
    gap: 8,
    alignItems: "flex-end",
  },
  adminActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  adminActionButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  requestCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  },
  requestInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  requestInfoRTL: {
    flexDirection: "row-reverse",
  },
  requestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  requestDetails: {
    flex: 1,
  },
  requestMessage: {
    fontSize: 12,
    fontStyle: "italic",
    opacity: 0.7,
    marginTop: 2,
  },
  requestTime: {
    fontSize: 11,
    opacity: 0.5,
    marginTop: 2,
  },
  requestActions: {
    flexDirection: "row",
    gap: 8,
  },
  requestButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  requestButtonText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  acceptButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rejectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  centeredContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 16,
  },
  createPostButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  emptyText: {
    opacity: 0.6,
    textAlign: "center",
    color: "#6b7280",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  editModalContent: {
    width: "95%",
    maxHeight: "90%",
    borderRadius: 16,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 20,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  imageSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  // Circle image styles for main page
  circleImageContainer: {
    position: "relative",
    marginBottom: 12,
  },
  circleImageWithOverlay: {
    position: "relative",
    width: "100%",
    height: 150,
  },
  circleImageOverlayButton: {
    position: "absolute",
    bottom: 8,
    right: 8,
    borderRadius: 8,
    overflow: "hidden",
  },
  circleOverlayButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  circleOverlayButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  circleImagePlaceholderButton: {
    height: 150,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 2,
    borderStyle: "dashed",
  },
  circleImagePlaceholderView: {
    height: 150,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderStyle: "dashed",
  },
  circleImagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  circleImagePlaceholderText: {
    fontSize: 14,
    fontWeight: "500",
  },
  // Edit modal styles (keeping existing ones for other elements)
  imageContainer: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
  },
  imageWithOverlay: {
    position: "relative",
    width: "100%",
    height: 120,
  },
  circleEditImage: {
    width: "100%",
    height: 120,
    borderRadius: 12,
  },
  imageOverlayButton: {
    position: "absolute",
    bottom: 8,
    right: 8,
    borderRadius: 8,
    overflow: "hidden",
  },
  overlayButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  overlayButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  imagePlaceholderButton: {
    height: 120,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderStyle: "dashed",
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  imagePickerText: {
    fontSize: 14,
    fontWeight: "500",
  },
  inputSection: {
    marginBottom: 20,
  },
  textInput: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    minHeight: 44,
  },
  privacyOptions: {
    flexDirection: "row",
    gap: 12,
  },
  privacyOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    gap: 8,
  },
  privacyText: {
    fontSize: 14,
    fontWeight: "500",
  },
  // Interests editing styles
  interestsContainer: {
    gap: 16,
  },
  categorySection: {
    gap: 8,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.8,
  },
  interestsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  editInterestChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  editInterestChipText: {
    fontSize: 12,
    fontWeight: "500",
  },
  // Header actions styles
  headerActions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  joinButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  joinButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  pendingButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    opacity: 0.8,
  },
  pendingButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  leaveButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  leaveButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  messageButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  messageButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  editButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  deleteButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    borderRadius: 6,
    marginLeft: 8,
  },
  // Edit modal styles
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    backgroundColor: "#f8f9fa",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  cancelButton: {
    borderWidth: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  debugInfo: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
  },
  debugText: {
    fontSize: 12,
    fontFamily: "monospace",
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  createPostModalContent: {
    width: "95%",
    maxWidth: 400,
    borderRadius: 16,
    overflow: "hidden",
  },
  postingInLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  circleName: {
    fontSize: 16,
    fontWeight: "600",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  postInput: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    minHeight: 100,
    maxHeight: 200,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.5,
    textAlign: "center",
    marginTop: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    minHeight: 24,
  },
  // Added styles for image picker functionality
  imagePickerButton: {
    height: 120,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: "dashed",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedImageContainer: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  selectedPostImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
  },
  changeImageText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  createPostButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0D5C27",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 25,
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    gap: 6,
    marginBottom: 8,
  },

  // Modal styles for Create Event
  modalContainer: {
    flex: 1,
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
  },
  inputGroup: {
    marginBottom: 16,
  },
  postButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  postButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  dateTimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  dateTimeField: {
    flex: 1,
  },
  interestsScrollView: {
    maxHeight: 200,
  },
  interestCategory: {
    marginBottom: 16,
  },
  interestChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  interestChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  interestChipText: {
    fontSize: 12,
    fontWeight: "500",
  },
  // Added styles for events
  eventsContainer: {
    flex: 1,
    padding: 16,
  },
  eventCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
    color: "#000000ff",
  },
  eventDate: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
    color: "#6b7280",
  },
  eventLocation: {
    fontSize: 14,
    opacity: 0.8,
    color: "#6b7280",
  },
  eventDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
    color: "#565759ff",
  },
  eventInterests: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
    gap: 6,
  },
  eventInterestChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  eventInterestText: {
    fontSize: 12,
    fontWeight: "500",
  },
  eventCreator: {
    fontSize: 12,
    opacity: 0.6,
    fontStyle: "italic",
    color: "#6b7280",
  },
  deleteEventButton: {
    padding: 8,
  },
  // Reusing dateTimeRow and interest styles from create event modal
  // interestsScrollView: {
  //   maxHeight: 200,
  // },
  // interestCategory: {
  //   marginBottom: 16,
  // },
  // interestChips: {
  //   flexDirection: 'row',
  //   flexWrap: 'wrap',
  //   gap: 8,
  // },
  // textAreaInput: { // Reusing from above
  //   borderWidth: 1,
  //   borderColor: '#ddd',
  //   borderRadius: 8,
  //   padding: 12,
  //   fontSize: 16,
  //   minHeight: 100,
  //   textAlignVertical: 'top',
  // },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    opacity: 0.6,
  },
  // Reusing placeholder and image styles from post creation
  // imagePickerButton: { ... },
  // selectedImageContainer: { ... },
  // selectedPostImage: { ... },
  // imageOverlay: { ... },
  // changeImageText: { ... },
  // imagePlaceholder: { ... },
  // imagePickerText: { ... },
  eventRsvpSection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 12,
  },
  eventRsvpButtons: {
    flexDirection: "row",
    gap: 6,
  },
  eventRsvpButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    gap: 3,
  },
  eventRsvpButtonText: {
    fontSize: 10,
    fontWeight: "600",
  },
  eventPhoto: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginVertical: 12,
  },
  eventActions: {
    flexDirection: "row",
    gap: 8,
  },
  editEventButton: {
    padding: 8,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  editEventModalContent: {
    width: "95%",
    maxHeight: "90%",
    borderRadius: 16,
    overflow: "hidden",
  },
  dateTimeSection: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  // textAreaInput: { // Reusing from above
  //   borderWidth: 1,
  //   borderColor: '#ddd',
  //   borderRadius: 8,
  //   padding: 12,
  //   fontSize: 16,
  //   minHeight: 100,
  //   textAlignVertical: 'top',
  // },
  selectedEventImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  backButton: {
    // Added for the new early return case
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 20,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  // Added for the edit post modal
  modalContent: {
    flex: 1,
    padding: 20,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: "600",
  },
  // Delete confirmation modal styles
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteModalContent: {
    width: "85%",
    maxWidth: 300,
    borderRadius: 16,
    overflow: "hidden",
  },
  deleteModalHeader: {
    padding: 20,
    paddingBottom: 16,
    alignItems: "center",
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  deleteModalBody: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: "center",
  },
  deleteModalMessage: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    opacity: 0.8,
  },
  deleteModalFooter: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  deleteModalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  cancelDeleteButton: {
    borderWidth: 1,
    borderColor: "#ddd",
  },
});
