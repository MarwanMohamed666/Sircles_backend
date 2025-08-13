import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Modal, TextInput, Alert, Image, RefreshControl, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { DatabaseService } from '@/lib/database';
import { uploadCircleProfileImage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { StorageService } from '@/lib/storage';
import EventModal from '@/components/EventModal';


interface Circle {
  id: string;
  name: string;
  description: string;
  privacy: 'public' | 'private';
  createdby: string;
  memberCount: number;
  isJoined: boolean;
  isAdmin: boolean;
  isMainAdmin: boolean;
  interests?: string[];
  creator?: string; // Added creator field
  circle_profile_url?: string;
  hasPendingRequest?: boolean; // Add pending request state
}

interface Post {
  id: string;
  content: string;
  image?: string;
  creationdate: string;
  author: {
    name: string;
    avatar_url?: string; // Ensure avatar_url is present
  };
  likes: any[];
  comments: any[];
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

export default function CircleScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { texts, isRTL } = useLanguage();
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');

  const [activeTab, setActiveTab] = useState<'feed' | 'members' | 'admin' | 'events'>('feed');
  const [posts, setPosts] = useState<Post[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedPostImage, setSelectedPostImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [imageUploading, setImageUploading] = useState(false); // State to track image upload
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [requestSearchQuery, setRequestSearchQuery] = useState('');

  const [newPostContent, setNewPostContent] = useState('');
  const [editedCircle, setEditedCircle] = useState({
    name: '',
    description: '',
    privacy: 'public' as 'public' | 'private',
    interests: [] as string[],
    circle_profile_url: undefined as string | undefined,
    _selectedImageAsset: undefined as any
  });
  const [allInterests, setAllInterests] = useState<any[]>([]); // This state is not used in the provided code, consider removing or implementing
  const [interestsByCategory, setInterestsByCategory] = useState<{[key: string]: any[]}>({}); // This state seems to be used for editing interests

  // State for event modal
  const [interests, setInterests] = useState<{[category: string]: any[]}>({}); // State for interests to be used in event creation
  const [uploading, setUploading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [circle, setCircle] = useState<Circle | null>(null);

  const loadEvents = async () => {
    if (!id) return;

    try {
      const { data, error } = await DatabaseService.getEvents();
      if (error) {
        console.error('Error loading events:', error);
        return;
      }

      // Filter events for this specific circle
      const circleEvents = data?.filter(event => event.circleid === id) || [];
      setEvents(circleEvents);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const loadInterests = async () => {
    try {
      const { data, error } = await DatabaseService.getInterestsByCategory();
      if (error) {
        console.error('Error loading interests:', error);
        return;
      }
      setInterests(data || {});
    } catch (error) {
      console.error('Error loading interests:', error);
    }
  };

  // Placeholder for handleSaveEdit, assuming it's defined elsewhere or needs to be implemented.
  // For now, we'll use a dummy function to avoid errors.
  const handleSaveEdit = async () => {
    // This function needs to be implemented to save the edited circle data
    console.log('Saving edited circle data...');
    await handleSaveChanges();
  };

  // Function to delete an event
  const deleteEvent = async (eventId: string) => {
    console.log('🗑️ CIRCLE PAGE: Delete event button pressed for eventId:', eventId);

    if (!eventId) {
      console.error('🗑️ CIRCLE PAGE: No eventId provided');
      Alert.alert('Error', 'Invalid event ID');
      return;
    }

    try {
      console.log('🗑️ CIRCLE PAGE: About to call DatabaseService.deleteEvent');
      const { data, error } = await DatabaseService.deleteEvent(eventId);

      console.log('🗑️ CIRCLE PAGE: Delete event result:', { 
        hasData: !!data, 
        hasError: !!error,
        errorMessage: error?.message,
        data 
      });

      if (error) {
        console.error('🗑️ CIRCLE PAGE: Error deleting event:', error);
        Alert.alert('Error', 'Failed to delete event: ' + error.message);
        return;
      }

      console.log('🗑️ CIRCLE PAGE: Event deleted successfully, reloading events...');
      Alert.alert('Success', 'Event deleted successfully');

      // Reload events
      await loadEvents();
      console.log('🗑️ CIRCLE PAGE: Events reloaded');

    } catch (error) {
      console.error('🗑️ CIRCLE PAGE: Unexpected error deleting event:', error);
      Alert.alert('Error', 'An unexpected error occurred: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  

  const loadCircleData = async () => {
    if (!id) return;

    console.log('🔄 === LOAD_CIRCLE_DATA STARTED ===');
    console.log('🔄 Function called with:', { id, userId: user?.id });

    try {
      // Load circle details
      const { data: circleDataFromDb, error: circleError } = await DatabaseService.getCircles();
      const currentCircle = circleDataFromDb?.find(c => c.id === id);

      if (!currentCircle) {
        Alert.alert('Error', 'Circle not found');
        router.back();
        return;
      }

      console.log('🔄 Circle found:', { circleId: currentCircle.id, name: currentCircle.name });

      // Check membership and admin status
      let isJoined = false;
      let isAdmin = false;
      let isMainAdmin = false;
      let hasPendingRequest = false;

      if (user?.id) {
        // Check if user is in user_circles table using getUserJoinedCircles function
        const { data: joinedCircles } = await DatabaseService.getUserJoinedCircles(user.id);
        isJoined = joinedCircles?.some(jc => jc.circleid === id) || false;

        console.log('🔄 Membership check result:', { userId: user.id, circleId: id, isJoined });

        if (isJoined) {
          const { data: adminData } = await DatabaseService.isCircleAdmin(id as string, user.id);
          isAdmin = adminData?.isAdmin || false;
          isMainAdmin = adminData?.isMainAdmin || false;
          console.log('🔄 Admin check (member):', { isAdmin, isMainAdmin });
        } else {
          // Check for pending request if not a member
          console.log('🔄 Checking for pending request since user is not a member');
          const { data: pendingRequest, error: pendingError } = await DatabaseService.getUserPendingRequest(id as string, user.id);
          console.log('🔄 Pending request check result:', {
            hasPendingData: !!pendingRequest,
            pendingRequestData: pendingRequest,
            pendingError: pendingError?.message
          });
          hasPendingRequest = !!pendingRequest;
          console.log('🔄 Setting hasPendingRequest to:', hasPendingRequest);
        }
      }

      // Get circle interests
      const interests = currentCircle.circle_interests?.map((ci: any) => ci.interests?.title).filter(Boolean) || [];

      const updatedCircle = {
        ...currentCircle,
        isJoined,
        isAdmin,
        isMainAdmin,
        memberCount: currentCircle.member_count || 0,
        interests,
        creator: currentCircle.creator || currentCircle.createdby, // Use creator first, fallback to createdby
        hasPendingRequest
      };

      console.log('🔄 About to update states with:', {
        hasPendingRequest,
        isJoined,
        circleHasPendingRequest: updatedCircle.hasPendingRequest
      });

      setCircle(updatedCircle);
      setHasPendingRequest(hasPendingRequest);
      console.log('🔄 === LOAD_CIRCLE_DATA COMPLETED ===');
      console.log('🔄 Final state should be:', {
        localHasPendingRequest: hasPendingRequest,
        circleHasPendingRequest: updatedCircle.hasPendingRequest
      });

      // Load posts if user is member or circle is public
      if (isJoined || currentCircle.privacy === 'public') {
        const { data: postsData } = await DatabaseService.getPosts(id as string);
        setPosts(postsData || []);
      }

      // Load full member details if user is member or if circle is public
      console.log('Loading members check:', { isJoined, privacy: currentCircle.privacy, shouldLoadMembers: isJoined || currentCircle.privacy === 'public' });

      if (isJoined || currentCircle.privacy === 'public') {
        console.log('Loading circle members for circle:', id);
        const { data: membersData, error: membersError } = await DatabaseService.getCircleMembers(id as string);

        if (membersError) {
          console.error('Error loading members:', membersError);
        } else {
          console.log('Successfully loaded members:', membersData?.length || 0, 'members');
          setMembers(membersData || []);
        }
      } else {
        console.log('Not loading members - user not joined and circle is private');
        setMembers([]);
      }

      // Load join requests if user is admin
      if (isAdmin) {
        const { data: requestsData } = await DatabaseService.getCircleJoinRequests(id as string);
        setJoinRequests(requestsData || []);
      }

    } catch (error) {
      console.error('Error loading circle data:', error);
      Alert.alert('Error', 'Failed to load circle data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCircleData();
    await loadEvents(); // Ensure events are also refreshed
    setRefreshing(false);
  };

  const handleJoinRequest = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      const { error } = await DatabaseService.handleJoinRequest(requestId, action);
      if (error) {
        Alert.alert('Error', `Failed to ${action} request: ${error.message}`);
        return;
      }

      Alert.alert('Success', `Request ${action}ed successfully`);

      // Refresh both join requests and members (if accepted)
      await loadCircleData();
    } catch (error) {
      Alert.alert('Error', `Failed to ${action} request`);
    }
  };

  const handleDeleteCircle = async () => {
    if (!user?.id || !id) {
      Alert.alert('Error', 'Unable to delete circle. Please try again.');
      return;
    }

    Alert.alert(
      'Delete Circle',
      'Are you sure you want to delete the circle?',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await DatabaseService.deleteCircle(id, user.id);

              if (error) {
                console.error('Delete error:', error);
                Alert.alert('Error', error.message || 'Failed to delete circle');
                return;
              }

              Alert.alert(
                'Success',
                'Circle deleted successfully',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      router.replace('/(tabs)/circles');
                    }
                  }
                ]
              );
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete circle');
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
        id as string,
        memberId,
        user!.id
      );
      if (error) {
        Alert.alert('Error', 'Failed to remove member');
        return;
      }
      Alert.alert('Success', `${memberName} has been removed from the circle`);
      await loadCircleData();
    } catch (error) {
      Alert.alert('Error', 'Failed to remove member');
    }
  };

  const handleRemoveMemberAsAdmin = async (memberId: string, memberName: string) => {
    if (!circle?.isAdmin) {
      console.log('User is not admin, cannot remove members');
      return;
    }

    try {
      console.log('Starting remove member process...', {
        circleId: id,
        memberId,
        memberName,
        adminId: user?.id
      });

      const { error } = await DatabaseService.removeMemberFromCircle(
        id as string,
        memberId,
        user!.id
      );

      if (error) {
        console.error('Remove member error:', error);
        Alert.alert(
          'Error',
          `Failed to remove member: ${error.message || 'Unknown error occurred'}`
        );
        return;
      }

      console.log('Member removed successfully');
      Alert.alert('Success', `${memberName} has been removed from the circle`);
      await loadCircleData();
    } catch (error) {
      console.error('Unexpected error in handleRemoveMemberAsAdmin:', error);
      Alert.alert(
        'Error',
        `Unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  const handleToggleAdmin = async (memberId: string, memberName: string, isCurrentlyAdmin: boolean) => {
    console.log('=== handleToggleAdmin called ===');
    console.log('Function parameters:', { memberId, memberName, isCurrentlyAdmin });
    console.log('Circle admin status:', circle?.isAdmin);
    console.log('Current user ID:', user?.id);
    console.log('Circle ID:', id);

    if (!circle?.isAdmin) {
      console.log('BLOCKED: User is not admin, cannot toggle admin status');
      return;
    }

    if (!user?.id) {
      console.log('BLOCKED: No user ID available');
      return;
    }

    if (!id) {
      console.log('BLOCKED: No circle ID available');
      return;
    }

    const action = isCurrentlyAdmin ? 'remove admin privileges from' : 'make admin';
    console.log('Action to perform:', action);

    // Execute directly without confirmation
    console.log('=== Executing admin toggle directly ===');
    console.log('=== Starting admin toggle process ===');
    console.log('Pre-operation validation:');
    console.log('- Circle ID:', id);
    console.log('- Member ID:', memberId);
    console.log('- Current user ID:', user?.id);
    console.log('- Is currently admin:', isCurrentlyAdmin);
    console.log('- Action:', action);
    console.log('- Circle creator:', circle?.creator);

    try {
      console.log('=== ENTERING TRY BLOCK ===');
      console.log('=== About to call database function ===');
      let result;

      if (isCurrentlyAdmin) {
        console.log('=== BRANCH: Calling removeCircleAdmin ===');
        console.log('Parameters for removeCircleAdmin:', {
          circleId: id,
          userId: memberId,
          requestingAdminId: user.id
        });

        console.log('=== CALLING DatabaseService.removeCircleAdmin ===');
        result = await DatabaseService.removeCircleAdmin(id as string, memberId, user.id);
        console.log('=== removeCircleAdmin RETURNED ===');
        console.log('removeCircleAdmin completed, result:', result);
      } else {
        console.log('=== BRANCH: Calling addCircleAdmin ===');
        console.log('Parameters for addCircleAdmin:', {
          circleId: id,
          userId: memberId,
          requestingAdminId: user.id
        });

        console.log('=== CALLING DatabaseService.addCircleAdmin ===');
        result = await DatabaseService.addCircleAdmin(id as string, memberId, user.id);
        console.log('=== addCircleAdmin RETURNED ===');
        console.log('addCircleAdmin completed, result:', result);
      }

      console.log('=== Database operation completed ===');
      console.log('Result type:', typeof result);
      console.log('Result keys:', result ? Object.keys(result) : 'null');
      console.log('Has error:', !!result?.error);
      console.log('Has data:', !!result?.data);

      if (result?.error) {
        console.error('=== Database operation failed ===');
        console.error('Error object:', result.error);
        console.error('Error message:', result.error.message);
        console.error('Error type:', typeof result.error);

        Alert.alert(
          'Error',
          `Failed to ${action} ${memberName}: ${result.error.message || 'Unknown error occurred'}`
        );
        return;
      }

      console.log('=== Database operation succeeded ===');
      console.log('Success! Admin status toggled successfully');

      // Force refresh the data
      console.log('=== Starting data refresh ===');
      setLoading(true);
      await loadCircleData();
      setLoading(false);
      console.log('=== Data refresh completed ===');

    } catch (error) {
      console.error('=== UNEXPECTED ERROR in handleToggleAdmin ===');
      console.error('Error object:', error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error?.constructor?.name);

      Alert.alert(
        'Error',
        `Unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  const handleJoinCircle = async () => {
    if (!user?.id || !id || !circle) return;

    if (circle.privacy === 'private') {
      // Show join request dialog
      Alert.prompt(
        'Request to Join',
        `Send a request to join "${circle.name}". You can include an optional message:`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Send Request',
            onPress: async (message) => {
              try {
                console.log('🚀 === JOIN REQUEST STARTING ===');
                console.log('🚀 Request parameters:', { userId: user.id, circleId: id, message: message || 'No message' });

                const { error } = await DatabaseService.requestToJoinCircle(user.id, id as string, message || '');
                if (error) {
                  console.log('🚀 Join request error:', error.message);
                  if (error.message.includes('already requested') || error.message.includes('already have a pending request')) {
                    Alert.alert('Info', 'You have already requested to join this circle.');
                    // Update the local state to show pending
                    console.log('🚀 Setting state for already requested scenario');
                    setHasPendingRequest(true);
                    setCircle(prev => prev ? { ...prev, hasPendingRequest: true } : null);
                    console.log('🚀 State updated for already requested');
                  } else {
                    Alert.alert('Error', 'Failed to send join request');
                  }
                  return;
                }

                console.log('🚀 Join request successful! Updating UI states...');
                Alert.alert('Success', 'Join request sent! The admin will review your request.');

                // Log current state before update
                console.log('🚀 State before update:', {
                  currentHasPendingRequest: hasPendingRequest,
                  currentCircleHasPendingRequest: circle?.hasPendingRequest
                });

                // Immediately update both UI states to show pending (this handles the immediate UI response)
                setHasPendingRequest(true);
                setCircle(prev => {
                  const updated = prev ? { ...prev, hasPendingRequest: true } : null;
                  console.log('🚀 Circle state updated to:', {
                    hasPendingRequest: updated?.hasPendingRequest,
                    isJoined: updated?.isJoined
                  });
                  return updated;
                });

                console.log('🚀 === JOIN REQUEST COMPLETED ===');
                console.log('🚀 Final expected state: hasPendingRequest=true, circleHasPendingRequest=true');

                // Optional: Add a small delay before refreshing data to allow database consistency
                setTimeout(async () => {
                  console.log('🚀 Refreshing data after join request to ensure consistency');
                  await loadCircleData();
                }, 1000);
              } catch (error) {
                console.log('🚀 Join request caught error:', error);
                Alert.alert('Error', 'Failed to send join request');
              }
            }
          }
        ],
        'plain-text'
      );
    } else {
      // Public circle - join directly
      try {
        const { error } = await DatabaseService.joinCircle(user.id, id as string);
        if (error) {
          if (error.message.includes('already a member')) {
            Alert.alert('Info', 'You are already a member of this circle.');
          } else {
            Alert.alert('Error', 'Failed to join circle');
          }
          return;
        }
        Alert.alert('Success', 'You have joined the circle!');
        await loadCircleData();
      } catch (error) {
        Alert.alert('Error', 'Failed to join circle');
      }
    }
  };

  const handleLeaveCircle = async () => {
    if (!user?.id || !id) return;

    Alert.alert(
      'Leave Circle',
      'Are you sure you want to leave this circle?',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await DatabaseService.leaveCircle(user.id, id);
              if (error) {
                Alert.alert('Error', error.message || 'Failed to leave circle');
                return;
              }

              Alert.alert('Success', 'You have left the circle');
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to leave circle');
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  const loadCircleInterests = async () => { // This function seems to be duplicated with loadInterests, check usage
    try {
      const { data: interestsData, error } = await DatabaseService.getInterestsByCategory();
      if (error) {
        console.error('Error loading interests:', error);
        return;
      }
      setInterestsByCategory(interestsData || {});

      // Flatten interests for easier access
      const allInterestsFlat = Object.values(interestsData || {}).flat();
      setAllInterests(allInterestsFlat);
    } catch (error) {
      console.error('Error loading interests:', error);
    }
  };

  const handleEditCircle = async () => {
    if (!circle) return;

    // Load current circle interests
    const { data: currentInterests } = await DatabaseService.getCircleInterests(circle.id);
    const currentInterestIds = currentInterests?.map(interest => interest.id) || [];

    setEditedCircle({
      name: circle.name || '',
      description: circle.description || '',
      privacy: circle.privacy || 'public',
      interests: currentInterestIds
    });

    await loadCircleInterests(); // Load interests for editing
    setShowEditModal(true);
  };

  const toggleEditInterest = (interestId: string) => {
    setEditedCircle(prev => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter(id => id !== interestId)
        : [...prev.interests, interestId]
    }));
  };

  const handleImagePicker = async () => {
    try {
      console.log('Starting image picker for circle edit...');

      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('Permission status:', status);

      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant photo library access to change circle picture.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });

      console.log('Image picker result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log('Selected asset:', {
          uri: asset.uri?.substring(0, 50) + '...',
          width: asset.width,
          height: asset.height,
          fileSize: asset.fileSize
        });

        if (!asset.uri) {
          Alert.alert('Error', 'Invalid image selected');
          return;
        }

        // Store the asset for later upload during save
        setEditedCircle(prev => ({
          ...prev,
          circle_profile_url: asset.uri,
          _selectedImageAsset: asset // Store the asset for later upload
        }));

        console.log('Circle image updated in UI preview');
      } else {
        console.log('Image selection was canceled or no asset selected');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      console.error('Error with image picker - full details:', {
        error: error,
        message: errorMessage,
        stack: errorStack,
        name: error instanceof Error ? error.name : typeof error,
        isError: error instanceof Error,
        errorString: String(error)
      });
      Alert.alert('Error', `Failed to pick image: ${errorMessage || 'Please try again'}`);
    }
  };

  const handleCircleImagePicker = async () => {
    try {
      // Request permissions first
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.status !== 'granted') {
        Alert.alert('Permission required', 'Please allow access to your photo library to change the circle image.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        await uploadCircleImage(selectedAsset);
      }
    } catch (error) {
      console.error('Error in handleCircleImagePicker:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const uploadCircleImage = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!user?.id || !id) {
      Alert.alert('Error', 'User or circle information is missing.');
      return;
    }

    console.log('=== CIRCLE IMAGE UPLOAD STARTING ===');
    console.log('User ID:', user.id);
    console.log('Circle ID:', id);
    console.log('Asset URI exists:', !!asset?.uri);

    setImageUploading(true);

    try {
      // Use consistent file extension
      const fileExtension = 'jpg';
      console.log('Using file extension:', fileExtension);

      console.log('Calling StorageService.uploadCircleProfilePicture...');
      const result = await StorageService.uploadCircleProfilePicture(id as string, asset);

      console.log('Upload result:', {
        hasData: !!result.data,
        hasError: !!result.error,
        errorMessage: result.error?.message
      });

      if (result.error) {
        console.error('Upload error:', result.error);
        Alert.alert('Upload Error', result.error.message || 'Failed to upload circle image.');
        return;
      }

      if (result.data?.publicUrl) {
        const imageUrl = result.data.publicUrl;
        console.log('Got public URL:', imageUrl);

        // Update circle with new image URL in database
        const { error: updateError } = await supabase
          .from('circles')
          .update({ circle_profile_url: imageUrl })
          .eq('id', id);

        if (updateError) {
          console.error('Error updating circle:', updateError);
          Alert.alert('Error', 'Failed to update circle image.');
        } else {
          // Update local state
          setCircle(prev => prev ? { ...prev, circle_profile_url: imageUrl } : null);
          Alert.alert('Success', 'Circle image updated successfully!');
          await loadCircleData(); // Refresh the data
        }
      }
    } catch (error) {
      console.error('Error uploading circle image:', error);
      Alert.alert('Error', 'Failed to upload circle image. Please try again.');
    } finally {
      setImageUploading(false);
    }
  };

  // This function should be renamed to loadCirclePosts
  const loadCirclePosts = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: postsData } = await DatabaseService.getPosts(id as string);
      setPosts(postsData || []);
    } catch (error) {
      console.error("Error loading posts:", error);
      Alert.alert("Error", "Failed to load posts.");
    } finally {
      setLoading(false);
    }
  };

  const pickPostImage = async () => {
    try {
      console.log('Starting image picker for post...');

      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('Permission status:', status);

      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant photo library access to select images.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });

      console.log('Image picker result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log('Selected asset for post:', {
          uri: asset.uri?.substring(0, 50) + '...',
          width: asset.width,
          height: asset.height,
          fileSize: asset.fileSize
        });

        if (!asset.uri) {
          Alert.alert('Error', 'Invalid image selected');
          return;
        }

        // Check file size (3MB limit)
        if (asset.fileSize && asset.fileSize > 3145728) {
          Alert.alert('Error', 'Image size must be less than 3MB');
          return;
        }

        setSelectedPostImage(asset);
        console.log('Post image updated in UI preview');
      } else {
        console.log('Image selection was canceled or no asset selected');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error with image picker - full details:', {
        error: error,
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      Alert.alert('Error', `Failed to pick image: ${errorMessage || 'Please try again'}`);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) {
      Alert.alert('Error', 'Please enter post content');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to create posts');
      return;
    }

    try {
      const { error } = await DatabaseService.createPost({
        userid: user.id,
        content: newPostContent.trim(),
        circleid: id
      }, selectedPostImage);

      if (error) {
        Alert.alert('Error', 'Failed to create post');
        return;
      }

      Alert.alert('Success', 'Post created successfully!');
      setNewPostContent('');
      setSelectedPostImage(null);
      setShowPostModal(false);
      await loadCirclePosts();
    } catch (error) {
      Alert.alert('Error', 'Failed to create post');
    }
  };

  const handleSaveChanges = async () => {
    if (!user?.id || !id || !circle) {
      Alert.alert('Error', 'Unable to save changes. Please try again.');
      return;
    }

    try {
      setLoading(true);

      let updateData = {
        name: editedCircle.name,
        description: editedCircle.description,
        privacy: editedCircle.privacy
      };

      // Handle image upload if a new image was selected
      if (editedCircle._selectedImageAsset) {
        try {
          console.log('Uploading new circle image...');
          const { data: uploadData, error: uploadError } = await StorageService.uploadCircleProfilePicture(circle.id, editedCircle._selectedImageAsset);

          if (uploadError) {
            console.error('Upload error:', uploadError);
            Alert.alert('Warning', 'Circle updated but image upload failed. You can update the image later.');
          } else if (uploadData?.publicUrl) {
            updateData.circle_profile_url = uploadData.publicUrl;
            console.log('Image uploaded successfully, adding to update data');
          }
        } catch (uploadError) {
          console.error('Upload error:', uploadError);
          Alert.alert('Warning', 'Circle updated but image upload failed. You can update the image later.');
        }
      }

      // Update circle basic info
      const { error } = await DatabaseService.updateCircle(id as string, updateData, user.id);

      if (error) {
        console.error('Update error:', error);
        Alert.alert('Error', error.message || 'Failed to update circle');
        return;
      }

      // Update interests
      try {
        // Get current interests
        const { data: currentInterests } = await DatabaseService.getCircleInterests(id as string);
        const currentInterestIds = currentInterests?.map(interest => interest.id) || [];

        // Find interests to add and remove
        const interestsToAdd = editedCircle.interests.filter(id => !currentInterestIds.includes(id));
        const interestsToRemove = currentInterestIds.filter(id => !editedCircle.interests.includes(id));

        // Remove old interests
        for (const interestId of interestsToRemove) {
          await supabase
            .from('circle_interests')
            .delete()
            .eq('circleid', id)
            .eq('interestid', interestId);
        }

        // Add new interests
        for (const interestId of interestsToAdd) {
          await supabase
            .from('circle_interests')
            .insert({
              circleid: id,
              interestid: interestId
            });
        }
      } catch (interestError) {
        console.error('Error updating interests:', interestError);
        // Don't fail the entire operation for interests
      }

      Alert.alert('Success', 'Circle updated successfully');
      setShowEditModal(false);
      await loadCircleData(); // Refresh the data
    } catch (error) {
      console.error('Update error:', error);
      Alert.alert('Error', 'Failed to update circle');
    } finally {
      setLoading(false);
    }
  };

  // Load initial data on component mount
  useEffect(() => {
    console.log('🔄 useEffect triggered - about to call loadCircleData');
    console.log('🔄 useEffect dependencies:', { id, userId: user?.id });
    loadCircleData();
    loadEvents(); // Load events on mount
    loadInterests(); // Load interests on mount
  }, [id, user]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <View style={styles.centeredContainer}>
          <ThemedText>{texts.loading || 'Loading...'}</ThemedText>
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
    <View key={post.id} style={[styles.postCard, { backgroundColor: surfaceColor }]}>
      <View style={[styles.postHeader, isRTL && styles.postHeaderRTL]}>
        <View style={[styles.authorInfo, isRTL && styles.authorInfoRTL]}>
          <Image
            source={{ uri: post.author?.avatar_url || 'https://via.placeholder.com/40' }}
            style={styles.authorAvatar}
          />
          <View style={styles.authorDetails}>
            <ThemedText type="defaultSemiBold">{post.author?.name || 'Unknown User'}</ThemedText>
            <ThemedText style={styles.postTime}>
              {new Date(post.creationdate).toLocaleDateString()}
            </ThemedText>
          </View>
        </View>
        {circle.isAdmin && (
          <TouchableOpacity>
            <IconSymbol name="ellipsis" size={20} color={textColor} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.postContentContainer}>
        <ThemedText style={styles.postContent}>{post.content}</ThemedText>
      </View>
      {post.image && (
        <Image source={{ uri: post.image }} style={styles.postImage} />
      )}
    </View>
  );

  const renderMember = (member: Member) => (
    <View key={member.id} style={[styles.memberCard, { backgroundColor: surfaceColor }]}>
      <View style={[styles.memberInfo, isRTL && styles.memberInfoRTL]}>
        <Image
          source={{ uri: member.avatar_url || 'https://via.placeholder.com/40' }}
          style={styles.memberAvatar}
        />
        <View style={styles.memberDetails}>
          <ThemedText type="defaultSemiBold">{member.name}</ThemedText>
          {member.isAdmin && (
            <ThemedText style={styles.adminBadge}>Admin</ThemedText>
          )}
        </View>
      </View>
      {circle.isAdmin && member.id !== circle.creator && member.id !== user?.id && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveMember(member.id, member.name)}
        >
          <IconSymbol name="minus.circle" size={20} color="#EF5350" />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderJoinRequest = (request: JoinRequest) => {
    return (
      <View key={request.id} style={[styles.requestCard, { backgroundColor: surfaceColor }]}>
        <View style={[styles.requestInfo, isRTL && styles.requestInfoRTL]}>
          <Image
            source={{ uri: request.users.avatar || 'https://via.placeholder.com/40' }}
            style={styles.requestAvatar}
          />
          <View style={styles.requestDetails}>
            <ThemedText type="defaultSemiBold">{request.users.name}</ThemedText>
            {request.message && (
              <ThemedText style={styles.requestMessage}>"{request.message}"</ThemedText>
            )}
            <ThemedText style={styles.requestTime}>
              {new Date(request.creationdate).toLocaleDateString()}
            </ThemedText>
          </View>
        </View>
        <View style={styles.requestActions}>
          <TouchableOpacity
            style={[styles.requestButton, { backgroundColor: tintColor }]}
            onPress={() => handleJoinRequest(request.id, 'accept')}
          >
            <ThemedText style={styles.requestButtonText}>Accept</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.requestButton, { backgroundColor: '#EF5350' }]}
            onPress={() => handleJoinRequest(request.id, 'reject')}
          >
            <ThemedText style={styles.requestButtonText}>Reject</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderAdminMember = (member: Member) => {
    console.log('Rendering admin member:', {
      memberId: member.id,
      memberName: member.name,
      isAdmin: member.isAdmin,
      isCreator: member.id === circle.creator,
      currentUserId: user?.id,
      circleCreatedBy: circle.creator
    });

    return (
      <View key={member.id} style={[styles.adminMemberCard, { backgroundColor: surfaceColor }]}>
        <View style={[styles.adminMemberInfo, isRTL && styles.adminMemberInfoRTL]}>
          <Image
            source={{ uri: member.avatar_url || 'https://via.placeholder.com/40' }}
            style={styles.adminMemberAvatar}
          />
          <View style={styles.adminMemberDetails}>
            <ThemedText type="defaultSemiBold">{member.name}</ThemedText>
            <View style={styles.memberBadges}>
              {member.isAdmin && (
                <View style={[styles.badge, { backgroundColor: '#4CAF50' }]}>
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
          {/* Only show remove button if not the creator and not the current user */}
          {member.id !== circle.creator && member.id !== user?.id && (
            <TouchableOpacity
              style={[styles.adminActionButton, { backgroundColor: '#EF5350' }]}
              onPress={() => {
                console.log('Remove button pressed for:', member.name);
                handleRemoveMemberAsAdmin(member.id, member.name);
              }}
            >
              <IconSymbol name="person.fill.xmark" size={16} color="#fff" />
              <ThemedText style={styles.adminActionButtonText}>Remove</ThemedText>
            </TouchableOpacity>
          )}

          {/* Show promote/demote admin button for non-creators if current user is any admin */}
          {member.id !== circle.creator && member.id !== user?.id && circle.isAdmin && (
            <TouchableOpacity
              style={[styles.adminActionButton, { backgroundColor: member.isAdmin ? '#FF9800' : '#2196F3' }]}
              onPress={() => {
                console.log('Admin toggle button pressed for:', member.name, 'current admin status:', member.isAdmin);
                handleToggleAdmin(member.id, member.name, member.isAdmin);
              }}
            >
              <IconSymbol name={member.isAdmin ? "star.slash" : "star.fill"} size={16} color="#fff" />
              <ThemedText style={styles.adminActionButtonText}>
                {member.isAdmin ? 'Remove Admin' : 'Make Admin'}
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Filter functions for admin search
  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(memberSearchQuery.toLowerCase())
  );

  const filteredJoinRequests = joinRequests.filter(request =>
    request.users.name.toLowerCase().includes(requestSearchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: surfaceColor }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={textColor} />
        </TouchableOpacity>
        <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
          {circle.name}
        </ThemedText>
        <View style={styles.headerActions}>
          {/* Join/Pending/Leave button */}
          {(() => {
            const showJoinButton = !circle?.isJoined && !hasPendingRequest && !circle?.hasPendingRequest;
            const showPendingButton = !circle?.isJoined && (hasPendingRequest || circle?.hasPendingRequest);

            console.log('🎨 BUTTON RENDER CHECK:', {
              circleIsJoined: circle?.isJoined,
              localHasPendingRequest: hasPendingRequest,
              circleHasPendingRequest: circle?.hasPendingRequest,
              showJoinButton,
              showPendingButton,
              circlePrivacy: circle?.privacy
            });

            return null;
          })()}

          {!circle?.isJoined && !hasPendingRequest && !circle?.hasPendingRequest && (
            <TouchableOpacity
              style={[styles.joinButton, { backgroundColor: tintColor }]}
              onPress={handleJoinCircle}
              disabled={loading}
            >
              <IconSymbol name="plus" size={16} color="#fff" />
              <ThemedText style={styles.joinButtonText}>
                {circle?.privacy === 'private' ? 'Request to Join' : 'Join'}
              </ThemedText>
            </TouchableOpacity>
          )}

          {/* Pending request button */}
          {!circle?.isJoined && (hasPendingRequest || circle?.hasPendingRequest) && (
            <TouchableOpacity
              style={[styles.pendingButton, { backgroundColor: '#FF9800' }]}
              disabled={true}
            >
              <IconSymbol name="clock" size={16} color="#fff" />
              <ThemedText style={styles.pendingButtonText}>
                Pending
              </ThemedText>
            </TouchableOpacity>
          )}

          {/* Leave button for members */}
          {circle?.isJoined && circle?.creator !== user?.id && (
            <TouchableOpacity
              style={[styles.leaveButton, { backgroundColor: '#EF5350' }]}
              onPress={handleLeaveCircle}
              disabled={loading}
            >
              <IconSymbol name="minus" size={16} color="#fff" />
              <ThemedText style={styles.leaveButtonText}>
                Leave
              </ThemedText>
            </TouchableOpacity>
          )}

          {/* Message button - show if user is joined */}
          {circle?.isJoined && (
            <TouchableOpacity
              style={[styles.messageButton, { backgroundColor: '#2196F3' }]}
              onPress={() => router.push(`/(tabs)/messages?circleId=${circle.id}`)}
            >
              <IconSymbol name="message" size={16} color="#fff" />
              <ThemedText style={styles.messageButtonText}>
                Messages
              </ThemedText>
            </TouchableOpacity>
          )}

          {/* Only show edit button if user is admin or creator */}
          {circle?.isAdmin && (
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: tintColor }]}
              onPress={handleEditCircle}
              disabled={loading}
            >
              <IconSymbol name="pencil" size={16} color="#fff" />
              <ThemedText style={styles.editButtonText}>
                Edit
              </ThemedText>
            </TouchableOpacity>
          )}

          {/* Only show delete button if user is the circle creator */}
          {circle?.creator === user?.id && (
            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: '#EF5350' }]}
              onPress={handleDeleteCircle}
              disabled={loading}
            >
              <IconSymbol name="trash" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Circle Info */}
      <View style={[styles.circleInfo, { backgroundColor: surfaceColor }]}>
        {/* Circle Image with Edit Overlay */}
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
                  <View style={[styles.circleOverlayButtonContent, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
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
                  style={[styles.circleImagePlaceholderButton, { backgroundColor: backgroundColor, borderColor: tintColor }]}
                  onPress={handleCircleImagePicker}
                  activeOpacity={0.7}
                >
                  <View style={styles.circleImagePlaceholder}>
                    <IconSymbol name="camera" size={32} color={tintColor} />
                    <ThemedText style={[styles.circleImagePlaceholderText, { color: tintColor }]}>
                      Tap to Add Photo
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={[styles.circleImagePlaceholderView, { backgroundColor: backgroundColor + '40', borderColor: textColor + '20' }]}>
                  <View style={styles.circleImagePlaceholder}>
                    <IconSymbol name="photo" size={32} color={textColor + '40'} />
                    <ThemedText style={[styles.circleImagePlaceholderText, { color: textColor + '40' }]}>
                      No Photo
                    </ThemedText>
                  </View>
                </View>
              )}
            </>
          )}
        </View>
        <ThemedText style={styles.circleDescription}>{circle.description}</ThemedText>
        <View style={styles.circleStats}>
          <View style={styles.statItem}>
            <IconSymbol name="person.3" size={16} color={textColor} />
            <ThemedText style={styles.statText}>{circle.memberCount} members</ThemedText>
          </View>
          <View style={styles.statItem}>
            <IconSymbol
              name={circle.privacy === 'private' ? "lock.fill" : "globe"}
              size={16}
              color={textColor}
            />
            <ThemedText style={styles.statText}>
              {circle.privacy === 'private' ? 'Private' : 'Public'}
            </ThemedText>
          </View>
        </View>

        {/* Circle Interests */}
        {circle.interests && circle.interests.length > 0 && (
          <View style={styles.circleInterests}>
            <ThemedText style={styles.interestsTitle}>Interests:</ThemedText>
            <View style={styles.interestTags}>
              {circle.interests.map((interest, index) => (
                <View key={index} style={[styles.interestTag, { backgroundColor: tintColor + '20' }]}>
                  <ThemedText style={[styles.interestTagText, { color: tintColor }]}>
                    {interest}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: surfaceColor }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'feed' && { backgroundColor: tintColor }
          ]}
          onPress={() => setActiveTab('feed')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'feed' && { color: '#fff' }]}>
            Feed
          </ThemedText>
        </TouchableOpacity>
        {circle.isJoined && (
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'events' && { backgroundColor: tintColor }
            ]}
            onPress={() => setActiveTab('events')}
          >
            <ThemedText style={[styles.tabText, activeTab === 'events' && { color: '#fff' }]}>
              Events
            </ThemedText>
          </TouchableOpacity>
        )}
        {circle.isJoined && (
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'members' && { backgroundColor: tintColor }
            ]}
            onPress={() => setActiveTab('members')}
          >
            <ThemedText style={[styles.tabText, activeTab === 'members' && { color: '#fff' }]}>
              Members
            </ThemedText>
          </TouchableOpacity>
        )}
        {circle.isAdmin && (
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'admin' && { backgroundColor: tintColor }
            ]}
            onPress={() => setActiveTab('admin')}
          >
            <ThemedText style={[styles.tabText, activeTab === 'admin' && { color: '#fff' }]}>
              Admin
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {activeTab === 'feed' && (
          <View style={styles.feedContainer}>
            {(circle.isJoined || circle.privacy === 'public') ? (
              posts.length > 0 ? (
                posts.map(renderPost)
              ) : (
                <View style={styles.emptyContainer}>
                  <ThemedText>No posts yet</ThemedText>
                  {circle.isJoined && (
                    <ThemedText style={styles.emptySubtext}>Be the first to share something!</ThemedText>
                  )}
                </View>
              )
            ) : (
              <View style={styles.emptyContainer}>
                <IconSymbol name="lock.fill" size={48} color={textColor + '40'} />
                <ThemedText>This is a private circle. Join to view posts.</ThemedText>
              </View>
            )}
          </View>
        )}

        {activeTab === 'events' && (
          <View style={styles.eventsContainer}>
            {/* Create Event Button */}
            {(circle?.creator === user?.id || circle.isAdmin) && ( // Check if user is creator or admin
              <TouchableOpacity
                style={[styles.createPostButton, { backgroundColor: tintColor }]}
                onPress={() => setShowEventModal(true)}
              >
                <IconSymbol name="plus" size={20} color="#fff" />
                <ThemedText style={styles.createPostButtonText}>Create Event</ThemedText>
              </TouchableOpacity>
            )}

            {/* Events List */}
            <FlatList
              data={events}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={[styles.eventCard, { backgroundColor: surfaceColor }]}>
                  <View style={styles.eventHeader}>
                    <View style={styles.eventInfo}>
                      <ThemedText style={styles.eventTitle}>{item.title}</ThemedText>
                      <ThemedText style={styles.eventDate}>
                        {new Date(item.date).toLocaleDateString()} at {item.time}
                      </ThemedText>
                      {item.location && (
                        <ThemedText style={styles.eventLocation}>📍 {item.location}</ThemedText>
                      )}
                    </View>
                    {(circle?.creator === user?.id || circle.isAdmin || item.createdby === user?.id) && ( // Check if user is creator, admin, or event creator
                      <TouchableOpacity
                        style={styles.deleteEventButton}
                        onPress={() => deleteEvent(item.id)}
                      >
                        <IconSymbol name="trash" size={20} color="#EF5350" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {item.description && (
                    <ThemedText style={styles.eventDescription}>{item.description}</ThemedText>
                  )}

                  {/* Event Interests */}
                  {item.event_interests && item.event_interests.length > 0 && (
                    <View style={styles.eventInterests}>
                      {item.event_interests.map((ei: any) => (
                        <View
                          key={ei.interests.id}
                          style={[styles.eventInterestChip, { backgroundColor: tintColor + '20', borderColor: tintColor }]}
                        >
                          <ThemedText style={[styles.eventInterestText, { color: tintColor }]}>
                            {ei.interests.title}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  )}

                  <ThemedText style={styles.eventCreator}>
                    Created by {item.creator?.name || 'Unknown'}
                  </ThemedText>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <ThemedText style={styles.emptyStateText}>No events yet</ThemedText>
                </View>
              }
            />
          </View>
        )}

        {activeTab === 'members' && circle.isJoined && (
          <View style={styles.membersContainer}>
            {members.map(renderMember)}
          </View>
        )}

        {activeTab === 'admin' && circle.isAdmin && (
          <View style={styles.adminContainer}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Join Requests ({joinRequests.length})
            </ThemedText>

            {/* Join Requests Search */}
            <View style={[styles.searchContainer, { backgroundColor: backgroundColor, borderColor: textColor + '20' }]}>
              <IconSymbol name="magnifyingglass" size={16} color={textColor + '60'} />
              <TextInput
                style={[styles.searchInput, { color: textColor }]}
                placeholder="Search join requests by name..."
                placeholderTextColor={textColor + '60'}
                value={requestSearchQuery}
                onChangeText={setRequestSearchQuery}
              />
              {requestSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setRequestSearchQuery('')}>
                  <IconSymbol name="xmark.circle.fill" size={16} color={textColor + '40'} />
                </TouchableOpacity>
              )}
            </View>

            {filteredJoinRequests.length > 0 ? (
              filteredJoinRequests.map(renderJoinRequest)
            ) : joinRequests.length > 0 ? (
              <ThemedText style={styles.emptyText}>No join requests found matching "{requestSearchQuery}"</ThemedText>
            ) : (
              <ThemedText style={styles.emptyText}>No pending join requests</ThemedText>
            )}

            <ThemedText type="subtitle" style={[styles.sectionTitle, { marginTop: 24 }]}>
              Circle Members ({members.length})
            </ThemedText>

            {/* Members Search */}
            <View style={[styles.searchContainer, { backgroundColor: backgroundColor, borderColor: textColor + '20' }]}>
              <IconSymbol name="magnifyingglass" size={16} color={textColor + '60'} />
              <TextInput
                style={[styles.searchInput, { color: textColor }]}
                placeholder="Search members by name..."
                placeholderTextColor={textColor + '60'}
                value={memberSearchQuery}
                onChangeText={setMemberSearchQuery}
              />
              {memberSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setMemberSearchQuery('')}>
                  <IconSymbol name="xmark.circle.fill" size={16} color={textColor + '40'} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.adminMembersContainer}>
              {filteredMembers.length > 0 ? (
                filteredMembers.map(renderAdminMember)
              ) : members.length > 0 ? (
                <ThemedText style={styles.emptyText}>No members found matching "{memberSearchQuery}"</ThemedText>
              ) : (
                <ThemedText style={styles.emptyText}>No members found</ThemedText>
              )}
            </View>

            {/* Debug info */}
            <View style={styles.debugInfo}>
              <ThemedText style={styles.debugText}>
                Debug Info: isAdmin={String(circle.isAdmin)}, isMainAdmin={String(circle.isMainAdmin)}, creator={circle.creator}, currentUser={user?.id}
              </ThemedText>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button for Posts */}
      {circle.isJoined && activeTab === 'feed' && (
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
        transparent={true}
        onRequestClose={() => setShowPostModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.createPostModalContent, { backgroundColor: surfaceColor }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Create Post</ThemedText>
              <TouchableOpacity onPress={() => setShowPostModal(false)}>
                <IconSymbol name="xmark" size={20} color={textColor} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputSection}>
                <ThemedText style={styles.postingInLabel}>Posting in:</ThemedText>
                <ThemedText style={[styles.circleName, { color: tintColor }]}>{circle.name}</ThemedText>
              </View>

              <View style={styles.inputSection}>
                <ThemedText style={styles.inputLabel}>What's on your mind?</ThemedText>
                <TextInput
                  style={[styles.postInput, { backgroundColor: backgroundColor, color: textColor }]}
                  value={newPostContent}
                  onChangeText={setNewPostContent}
                  placeholder="Share your thoughts with the circle..."
                  placeholderTextColor={textColor + '60'}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Image Picker for Post */}
              <View style={styles.inputSection}>
                <ThemedText style={styles.inputLabel}>Add Photo</ThemedText>
                <TouchableOpacity
                  onPress={pickPostImage}
                  style={[
                    styles.imagePickerButton,
                    { backgroundColor: backgroundColor, borderColor: tintColor },
                    selectedPostImage && styles.selectedImageContainer
                  ]}
                >
                  {selectedPostImage ? (
                    <>
                      <Image source={{ uri: selectedPostImage.uri }} style={styles.selectedPostImage} />
                      <View style={[styles.imageOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                        <IconSymbol name="camera" size={16} color="#fff" />
                        <ThemedText style={styles.changeImageText}>Change Photo</ThemedText>
                      </View>
                    </>
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <IconSymbol name="camera" size={32} color={tintColor} />
                      <ThemedText style={[styles.imagePickerText, { color: tintColor }]}>
                        Tap to select photo
                      </ThemedText>
                    </View>
                  )}
                </TouchableOpacity>
                {selectedPostImage && (
                  <ThemedText style={{ fontSize: 12, color: textColor + '80', marginTop: 4 }}>
                    File size: {(selectedPostImage.fileSize / 1024 / 1024).toFixed(2)} MB
                  </ThemedText>
                )}
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: backgroundColor }]}
                onPress={() => {
                  setShowPostModal(false);
                  setSelectedPostImage(null); // Clear selected image when closing
                }}
              >
                <ThemedText>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: tintColor }]}
                onPress={handleCreatePost}
              >
                <ThemedText style={{ color: '#fff' }}>Post</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Event Modal */}
      <EventModal
        visible={showEventModal}
        onClose={() => setShowEventModal(false)}
        onEventCreated={loadEvents}
        preSelectedCircleId={id as string}
        circles={[{ id: id as string, name: circle?.name || 'Current Circle' }]}
      />

      {/* Edit Circle Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.editModalContent, { backgroundColor: surfaceColor }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Edit Circle</ThemedText>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: textColor + '20' }]}
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
              {/* Circle Name */}
              <View style={styles.inputSection}>
                <ThemedText style={styles.sectionLabel}>Circle Name</ThemedText>
                <TextInput
                  style={[styles.textInput, { backgroundColor: backgroundColor, color: textColor }]}
                  value={editedCircle.name}
                  onChangeText={(text) => setEditedCircle(prev => ({ ...prev, name: text }))}
                  placeholder="Enter circle name"
                  placeholderTextColor={textColor + '60'}
                />
              </View>

              {/* Circle Description */}
              <View style={styles.inputSection}>
                <ThemedText style={styles.sectionLabel}>Description</ThemedText>
                <TextInput
                  style={[styles.textAreaInput, { backgroundColor: backgroundColor, color: textColor }]}
                  value={editedCircle.description}
                  onChangeText={(text) => setEditedCircle(prev => ({ ...prev, description: text }))}
                  placeholder="Enter circle description"
                  placeholderTextColor={textColor + '60'}
                  multiline
                  numberOfLines={4}
                />
              </View>

              {/* Privacy Setting */}
              <View style={styles.inputSection}>
                <ThemedText style={styles.sectionLabel}>Privacy</ThemedText>
                <View style={styles.privacyOptions}>
                  <TouchableOpacity
                    style={[
                      styles.privacyOption,
                      { backgroundColor: backgroundColor },
                      editedCircle.privacy === 'public' && { backgroundColor: tintColor + '20', borderColor: tintColor }
                    ]}
                    onPress={() => setEditedCircle(prev => ({ ...prev, privacy: 'public' }))}
                  >
                    <IconSymbol name="globe" size={20} color={editedCircle.privacy === 'public' ? tintColor : textColor} />
                    <ThemedText style={[styles.privacyText, editedCircle.privacy === 'public' && { color: tintColor }]}>
                      Public
                    </ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.privacyOption,
                      { backgroundColor: backgroundColor },
                      editedCircle.privacy === 'private' && { backgroundColor: tintColor + '20', borderColor: tintColor }
                    ]}
                    onPress={() => setEditedCircle(prev => ({ ...prev, privacy: 'private' }))}
                  >
                    <IconSymbol name="lock.fill" size={20} color={editedCircle.privacy === 'private' ? tintColor : textColor} />
                    <ThemedText style={[styles.privacyText, editedCircle.privacy === 'private' && { color: tintColor }]}>
                      Private
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Interests Selection */}
              <View style={styles.inputSection}>
                <ThemedText style={styles.sectionLabel}>Interests</ThemedText>
                <View style={styles.interestsContainer}>
                  {Object.entries(interestsByCategory).map(([category, interests]) => (
                    <View key={category} style={styles.categorySection}>
                      <ThemedText style={styles.categoryTitle}>{category}</ThemedText>
                      <View style={styles.interestsGrid}>
                        {interests.map((interest: any) => (
                          <TouchableOpacity
                            key={interest.id}
                            style={[
                              styles.editInterestChip,
                              {
                                backgroundColor: editedCircle.interests.includes(interest.id)
                                  ? tintColor
                                  : backgroundColor,
                                borderColor: tintColor,
                              }
                            ]}
                            onPress={() => toggleEditInterest(interest.id)}
                          >
                            <ThemedText style={[
                              styles.editInterestChipText,
                              {
                                color: editedCircle.interests.includes(interest.id)
                                  ? '#fff'
                                  : textColor
                              }
                            ]}>
                              {interest.title}
                            </ThemedText>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={[styles.modalFooter, { backgroundColor: surfaceColor, borderTopColor: textColor + '20' }]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: backgroundColor, borderColor: textColor + '30' }]}
                onPress={() => setShowEditModal(false)}
              >
                <ThemedText style={{ color: textColor }}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: tintColor }]}
                onPress={handleSaveEdit}
              >
                <ThemedText style={{ color: '#fff', fontWeight: '600' }}>Save Changes</ThemedText>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  headerTitle: {
    fontSize: 18,
    flex: 1,
    textAlign: 'center',
  },
  circleInfo: {
    padding: 16,
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  circleHeaderImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 12,
  },
  circleDescription: {
    fontSize: 14,
    marginBottom: 12,
    opacity: 0.8,
  },
  circleStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    opacity: 0.7,
  },
  circleInterests: {
    marginTop: 12,
  },
  interestsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  interestTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  interestTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  interestTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
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
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  postHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorInfoRTL: {
    flexDirection: 'row-reverse',
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
  },
  postContentContainer: {
    marginBottom: 12,
  },
  postContent: {
    fontSize: 16,
    lineHeight: 24,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  membersContainer: {
    gap: 12,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberInfoRTL: {
    flexDirection: 'row-reverse',
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
    color: '#4CAF50',
    fontWeight: '600',
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
  },
  adminMembersContainer: {
    gap: 12,
  },
  adminMemberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  adminMemberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  adminMemberInfoRTL: {
    flexDirection: 'row-reverse',
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
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  adminMemberActions: {
    flexDirection: 'column',
    gap: 8,
    alignItems: 'flex-end',
  },
  adminActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  adminActionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  requestCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  requestInfoRTL: {
    flexDirection: 'row-reverse',
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
    fontStyle: 'italic',
    opacity: 0.7,
    marginTop: 2,
  },
  requestTime: {
    fontSize: 11,
    opacity: 0.5,
    marginTop: 2,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  requestButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  acceptButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rejectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  emptyText: {
    opacity: 0.6,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalContent: {
    width: '95%',
    maxHeight: '90%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
    fontWeight: '600',
    marginBottom: 8,
  },
  // Circle image styles for main page
  circleImageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  circleImageWithOverlay: {
    position: 'relative',
    width: '100%',
    height: 150,
  },
  circleImageOverlayButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  circleOverlayButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  circleOverlayButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  circleImagePlaceholderButton: {
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  circleImagePlaceholderView: {
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  circleImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  circleImagePlaceholderText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Edit modal styles (keeping existing ones for other elements)
  imageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageWithOverlay: {
    position: 'relative',
    width: '100%',
    height: 120,
  },
  circleEditImage: {
    width: '100%',
    height: 120,
    borderRadius: 12,
  },
  imageOverlayButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  overlayButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  overlayButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  imagePlaceholderButton: {
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  imagePlaceholderText: {
    fontSize: 14,
    fontWeight: '500',
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
    borderColor: '#ddd',
    minHeight: 44,
  },
  privacyOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  privacyOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    gap: 8,
  },
  privacyText: {
    fontSize: 14,
    fontWeight: '500',
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
    fontWeight: '600',
    opacity: 0.8,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    fontWeight: '500',
  },
  // Header actions styles
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  pendingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    opacity: 0.8,
  },
  pendingButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  leaveButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  messageButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 6,
    marginLeft: 8,
  },
  // Edit modal styles
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    backgroundColor: '#f8f9fa',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  cancelButton: {
    borderWidth: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  debugInfo: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  debugText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  createPostModalContent: {
    width: '95%',
    maxWidth: 400,
    borderRadius: 16,
    overflow: 'hidden',
  },
  postingInLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  circleName: {
    fontSize: 16,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  postInput: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: 100,
    maxHeight: 200,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.5,
    textAlign: 'center',
    marginTop: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    borderStyle: 'dashed',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedImageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  selectedPostImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8, // Match the button's border radius
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8, // Match the button's border radius
  },
  changeImageText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // Modal styles for Create Event
  modalContainer: {
    flex: 1,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
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
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  interestsScrollView: {
    maxHeight: 200,
  },
  interestCategory: {
    marginBottom: 16,
  },
  interestChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    fontWeight: '500',
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
    borderColor: '#e0e0e0',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    opacity: 0.8,
  },
  eventDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  eventInterests: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    fontWeight: '500',
  },
  eventCreator: {
    fontSize: 12,
    opacity: 0.6,
    fontStyle: 'italic',
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
    alignItems: 'center',
    justifyContent: 'center',
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
});