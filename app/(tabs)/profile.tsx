import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Modal, TextInput, Alert, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { DatabaseService } from '@/lib/database';
import { supabase } from '@/lib/supabase';
import { StorageService } from '@/lib/storage';

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  birthday: string;
  gender: string;
  address: {
    apartment: string;
    building: string;
    block: string;
  };
  interests: {
    [category: string]: string[];
  };
  avatar?: string;
}

export default function ProfileScreen() {
  const { user, userProfile, signOut, updateUserProfile, loading } = useAuth();
  const { texts, language, toggleLanguage, isRTL } = useLanguage();
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const accentColor = useThemeColor({}, 'accent');

  const [isEditing, setIsEditing] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [showLookForModal, setShowLookForModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newInterest, setNewInterest] = useState('');
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  const [profile, setProfile] = useState<UserProfile>({
    name: 'Ahmed Mohamed',
    email: 'ahmed.mohamed@example.com',
    phone: '+971 50 123 4567',
    birthday: '1990-05-15',
    gender: 'Male',
    address: {
      apartment: '12A',
      building: 'Tower 3',
      block: 'Block C',
    },
    interests: {
      'Education': ['Book club', 'Tech & coding'],
      'Hobbies': ['Photography', 'Movie nights'],
      'Sports': ['Swimming', 'Football'],
    },
  });

  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState('');
  const [userInterests, setUserInterests] = useState<{[category: string]: any[]}>({});
  const [userLookFor, setUserLookFor] = useState<{[category: string]: any[]}>({});
  const [availableInterests, setAvailableInterests] = useState<{[category: string]: any[]}>({});

  const genderOptions = ['Male', 'Female', 'Prefer not to say'];

  const calculateAge = (birthday: string) => {
    const birthDate = new Date(birthday);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1;
    }
    return age;
  };

  const startEditing = (field: string, currentValue: string) => {
    setEditingField(field);
    setTempValue(currentValue);
  };

  const saveField = () => {
    if (editingField && tempValue.trim()) {
      if (editingField.includes('address.')) {
        const addressField = editingField.split('.')[1] as keyof typeof profile.address;
        setProfile({
          ...profile,
          address: {
            ...profile.address,
            [addressField]: tempValue,
          },
        });
      } else if (editingField === 'gender') {
        setProfile({ ...profile, gender: tempValue });
      } else {
        setProfile({ ...profile, [editingField as keyof UserProfile]: tempValue } as UserProfile);
      }
    }
    setEditingField(null);
    setTempValue('');
  };

  const cancelEditing = () => {
    setEditingField(null);
    setTempValue('');
  };

  const handleChangePassword = () => {
    if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
      Alert.alert(texts.error || 'Error', texts.fillAllFields || 'Please fill in all fields.');
      return;
    }

    if (passwordData.new !== passwordData.confirm) {
      Alert.alert(texts.error || 'Error', texts.passwordMismatch || 'New passwords do not match.');
      return;
    }

    // Here you would typically validate the current password and update it
    Alert.alert(texts.success || 'Success', texts.passwordChanged || 'Password changed successfully!');
    setShowPasswordModal(false);
    setPasswordData({ current: '', new: '', confirm: '' });
  };

  const toggleInterest = async (interest: any) => {
    if (!user?.id) return;

    const isSelected = Object.values(userInterests)
      .flat()
      .some(userInt => userInt.id === interest.id);

    try {
      if (isSelected) {
        // Remove interest
        const { error } = await supabase
          .from('user_interests')
          .delete()
          .eq('userid', user.id)
          .eq('interestid', interest.id);

        if (error) {
          console.error('Error removing interest:', error);
          if (error.code === 'PGRST001' || error.code === '42501') {
            Alert.alert('Error', 'You do not have permission to remove this interest');
          } else {
            Alert.alert('Error', 'Failed to remove interest');
          }
          return;
        }
      } else {
        // Add interest
        const { error } = await supabase
          .from('user_interests')
          .insert({
            userid: user.id,
            interestid: interest.id
          });

        if (error) {
          console.error('Error adding interest:', error);
          if (error.code === 'PGRST001' || error.code === '42501') {
            Alert.alert('Error', 'You do not have permission to add this interest');
          } else {
            Alert.alert('Error', 'Failed to add interest');
          }
          return;
        }
      }

      // Refresh user interests
      await fetchUserInterests();
    } catch (error) {
      console.error('Error toggling interest:', error);
      Alert.alert('Error', 'Failed to update interest');
    }
  };

  const toggleLookFor = async (interest: any) => {
    if (!user?.id) return;

    const isSelected = Object.values(userLookFor)
      .flat()
      .some(userInt => userInt.id === interest.id);

    try {
      if (isSelected) {
        // Remove look_for interest
        const { error } = await supabase
          .from('user_look_for')
          .delete()
          .eq('userid', user.id)
          .eq('interestid', interest.id);

        if (error) {
          console.error('Error removing look_for interest:', error);
          if (error.code === 'PGRST001' || error.code === '42501') {
            Alert.alert('Error', 'You do not have permission to remove this interest');
          } else {
            Alert.alert('Error', 'Failed to remove interest');
          }
          return;
        }
      } else {
        // Add look_for interest
        const { error } = await supabase
          .from('user_look_for')
          .insert({
            userid: user.id,
            interestid: interest.id
          });

        if (error) {
          console.error('Error adding look_for interest:', error);
          if (error.code === 'PGRST001' || error.code === '42501') {
            Alert.alert('Error', 'You do not have permission to add this interest');
          } else {
            Alert.alert('Error', 'Failed to add interest');
          }
          return;
        }
      }

      // Refresh user look_for interests
      await fetchUserLookFor();
    } catch (error) {
      console.error('Error toggling look_for interest:', error);
      Alert.alert('Error', 'Failed to update interest');
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to upload avatar!');
        return false;
      }
    }
    return true;
  };

  const pickImage = async () => {
    try {
      console.log('Starting image picker...');

      // Request permissions first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('Permission status:', status);

      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant photo library access to change your avatar');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      console.log('Image picker result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        console.log('Selected asset:', result.assets[0]);
        await uploadAvatar(result.assets[0]);
      } else {
        console.log('Image selection was canceled');
      }
    } catch (error) {
      console.error('Error picking image - full error:', error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      Alert.alert('Error', `Failed to pick image: ${error?.message || 'Unknown error occurred'}`);
    }
  };

  const uploadAvatar = async (asset: any) => {
    console.log('=== UPLOAD AVATAR START ===');
    console.log('User exists:', !!user);
    console.log('User ID:', user?.id);

    if (!user?.id) {
      console.error('No user ID found');
      Alert.alert('Error', 'You must be logged in to upload an avatar');
      return;
    }

    // Check if user is actually authenticated
    console.log('Checking session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('Session check result:', { hasSession: !!session, sessionError });

    if (sessionError) {
      console.error('Session error:', sessionError);
      Alert.alert('Error', `Session error: ${sessionError.message}`);
      return;
    }

    if (!session) {
      console.error('No active session found');
      Alert.alert('Error', 'Your session has expired. Please log in again.');
      router.replace('/login');
      return;
    }

    setUploading(true);
    console.log('Starting upload process...');
    try {
      // Get file extension from URI - handle base64 data URIs
      let fileExtension: string;

      if (asset.uri.startsWith('data:image/')) {
        // Extract extension from data URI MIME type
        const mimeMatch = asset.uri.match(/data:image\/([^;]+)/);
        fileExtension = mimeMatch ? mimeMatch[1] : 'png';
        console.log('Extracted extension from data URI:', fileExtension);
      } else {
        // Extract from file path
        fileExtension = asset.uri.split('.').pop()?.toLowerCase() || 'png';
        console.log('Extracted extension from file path:', fileExtension);
      }

      if (!['png', 'jpg', 'jpeg'].includes(fileExtension)) {
        console.log('Invalid file extension:', fileExtension);
        Alert.alert('Error', 'Please select a PNG or JPG image');
        return;
      }

      console.log('File extension validation passed:', fileExtension);

      // Normalize extension
      const normalizedExtension = fileExtension === 'jpeg' ? 'jpg' : fileExtension;

      console.log('=== PROFILE UPLOAD DEBUG ===');
      console.log('User object:', { id: user.id, email: user.email });
      console.log('Original file extension:', fileExtension);
      console.log('Normalized extension:', normalizedExtension);
      console.log('Asset details:', {
        uri: asset.uri?.substring(0, 50) + '...', // Log first 50 chars only
        type: typeof asset,
        hasUri: !!asset.uri
      });

      // Upload to Supabase Storage with the asset URI directly
      console.log('About to call StorageService.uploadAvatar with:', {
        userId: user.id,
        extension: normalizedExtension,
        hasStorageService: !!StorageService,
        hasUploadMethod: !!StorageService.uploadAvatar
      });

      console.log('Calling StorageService.uploadAvatar NOW...');
      const { data, error } = await StorageService.uploadAvatar(
        user.id, 
        asset, 
        normalizedExtension
      );

      console.log('StorageService.uploadAvatar returned:', { 
        hasData: !!data, 
        hasError: !!error,
        errorMessage: error?.message 
      });

      if (error) {
        console.error('Upload error details:', error);
        console.error('Error message:', error.message);
        Alert.alert('Error', `Failed to upload avatar: ${error.message}`);
        return;
      }

      if (!data) {
        console.error('Upload completed but no data returned');
        Alert.alert('Error', 'Upload completed but no data returned');
        return;
      }

      console.log('Upload successful! Data received:', data);

      if (data?.publicUrl) {
        console.log('Upload successful, updating user profile...');
        // Update user profile with new avatar URL
        const { error: updateError } = await DatabaseService.updateUserAvatar(user.id, data.publicUrl);

        if (updateError) {
          console.error('Update avatar error:', updateError);
          Alert.alert('Error', 'Failed to update profile');
          return;
        }

        // Update local state
        setAvatarUrl(data.publicUrl);

        // Refresh user profile
        if (updateUserProfile) {
          await updateUserProfile({ avatar: data.publicUrl });
        }

        Alert.alert('Success', 'Avatar updated successfully!');
      } else {
        console.error('No public URL in response:', data);
        Alert.alert('Error', 'Upload succeeded but no URL returned');
      }
    } catch (error) {
      console.error('Avatar upload error - FULL DETAILS:', {
        error: error,
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      });
      Alert.alert('Error', `Failed to upload avatar: ${error?.message || 'Unknown error'}`);
    } finally {
      console.log('Upload process finished, setting uploading to false');
      setUploading(false);
    }
  };

  const { signOut: authSignOut } = useAuth();

  const handleLogout = () => {
    console.log('🔴 LOGOUT: handleLogout function called - button was pressed!');
    console.log('🔴 LOGOUT: Proceeding with direct logout (Alert.alert had issues)');
    handleSignOut();
  };

  const handleSignOut = async () => {
    console.log('🔴 SIGNOUT: handleSignOut function started');

    try {
      console.log('🔴 SIGNOUT: About to call authSignOut()');
      await authSignOut();
      console.log('🔴 SIGNOUT: authSignOut() completed successfully');

      console.log('🔴 SIGNOUT: Showing success alert before navigation');
      Alert.alert(
        texts.success || 'Success', 
        texts.loggedOut || 'Logged out successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('🔴 SIGNOUT: User acknowledged logout, navigating to login');
              router.replace('/login');
            }
          }
        ]
      );

    } catch (error) {
      console.error('🔴 SIGNOUT ERROR: Logout failed:', error);
      console.error('🔴 SIGNOUT ERROR: Error details:', {
        message: error?.message,
        name: error?.name,
        stack: error?.stack
      });
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };


  useEffect(() => {
    if (user?.id) {
      fetchUserInterests();
      fetchUserLookFor();
    }
    fetchAvailableInterests();
  }, [user]);

  useEffect(() => {
    if (user?.id) {
      checkExistingAvatar();
    }
  }, [user?.id, userProfile?.avatar]);

  const checkExistingAvatar = async () => {
    if (!user?.id) return;

    try {
      // First check if avatar URL is in user profile
      if (userProfile?.avatar) {
        setAvatarUrl(userProfile.avatar);
        return;
      }

      // If not, check storage for existing avatar
      const { exists, extension } = await StorageService.checkAvatarExists(user.id);
      if (exists && extension) {
        const url = StorageService.getAvatarUrl(user.id, extension);
        setAvatarUrl(url);

        // Update user profile with found avatar
        await DatabaseService.updateUserAvatar(user.id, url);
      }
    } catch (error) {
      console.error('Error checking existing avatar:', error);
    }
  };

  const fetchUserInterests = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await DatabaseService.getUserInterests(user.id);
      if (error) {
        console.error('Error fetching user interests:', error);
      } else if (data) {
        // Group user interests by category
        const groupedInterests: {[category: string]: any[]} = {};
        data.forEach((item: any) => {
          if (item.interests) {
            const category = item.interests.category || 'Other';
            if (!groupedInterests[category]) {
              groupedInterests[category] = [];
            }
            groupedInterests[category].push(item.interests);
          }
        });
        setUserInterests(groupedInterests);
      }
    } catch (error) {
      console.error('Error fetching user interests:', error);
    }
  };

  const fetchUserLookFor = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await DatabaseService.getUserLookFor(user.id);
      if (error) {
        console.error('Error fetching user look_for interests:', error);
      } else if (data) {
        // Group user look_for interests by category
        const groupedLookFor: {[category: string]: any[]} = {};
        data.forEach((item: any) => {
          if (item.interests) {
            const category = item.interests.category || 'Other';
            if (!groupedLookFor[category]) {
              groupedLookFor[category] = [];
            }
            groupedLookFor[category].push(item.interests);
          }
        });
        setUserLookFor(groupedLookFor);
      }
    } catch (error) {
      console.error('Error fetching user look_for interests:', error);
    }
  };

  const fetchAvailableInterests = async () => {
    try {
      const { data, error } = await DatabaseService.getInterestsByCategory();
      if (error) {
        console.error('Error fetching available interests:', error);
      } else if (data) {
        setAvailableInterests(data);
      }
    } catch (error) {
      console.error('Error fetching available interests:', error);
    }
  };

  // Handle redirect when no user
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user]);

  // Show loading if auth is still loading
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ThemedText>Loading...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  // If no user, show loading (redirect will happen in useEffect)
  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ThemedText>Redirecting...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: surfaceColor }]}>
      <ThemedText type="title" style={[styles.headerTitle, isRTL && styles.rtlText]}>
              {texts.profile || 'Profile'}
            </ThemedText>
            <TouchableOpacity 
              style={[styles.editButton, { backgroundColor: tintColor }]}
              onPress={() => setIsEditing(!isEditing)}
            >
              <IconSymbol name={isEditing ? "xmark.circle.fill" : "pencil"} size={20} color="#fff" />
            </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar and Name Section */}
        <View style={[styles.avatarSection, { backgroundColor: surfaceColor }]}>
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={pickImage}
            disabled={uploading}
          >
            {avatarUrl || userProfile?.avatar ? (
              <Image 
                source={{ uri: avatarUrl || userProfile?.avatar }} 
                style={styles.avatar} 
                onError={() => setAvatarUrl(null)}
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: tintColor }]}>
                <IconSymbol name="person.fill" size={40} color="#fff" />
              </View>
            )}
            <View style={[styles.editAvatarButton, { backgroundColor: uploading ? '#ccc' : accentColor }]}>
              <IconSymbol name={uploading ? "arrow.up.circle" : "pencil"} size={16} color="#fff" />
            </View>
          </TouchableOpacity>

          <View style={styles.nameSection}>
            <ThemedText type="subtitle" style={[styles.userName, isRTL && styles.rtlText]}>
              {userProfile?.name || 'User'}
            </ThemedText>
            <ThemedText style={[styles.userAge, isRTL && styles.rtlText]}>
              {userProfile?.dob ? calculateAge(userProfile.dob) : 0} {texts.yearsOld || 'years old'}
            </ThemedText>
          </View>
        </View>

        {/* Personal Information */}
        <View style={[styles.section, { backgroundColor: surfaceColor }]}>
          <ThemedText type="defaultSemiBold" style={[styles.sectionTitle, isRTL && styles.rtlText]}>
            {texts.personalInformation || 'Personal Information'}
          </ThemedText>

          {/* Name */}
          <View style={styles.fieldContainer}>
            <ThemedText style={styles.fieldLabel}>{texts.name || 'Name'}</ThemedText>
            <ThemedText style={[styles.fieldValue, styles.nonEditableField, isRTL && styles.rtlText]}>
              {userProfile?.name || 'Not set'}
            </ThemedText>
          </View>

          {/* Email */}
          <View style={styles.fieldContainer}>
            <ThemedText style={styles.fieldLabel}>{texts.email || 'Email'}</ThemedText>
            <ThemedText style={[styles.fieldValue, styles.nonEditableField, isRTL && styles.rtlText]}>
              {user?.email}
            </ThemedText>
          </View>

          {/* Phone */}
          <View style={styles.fieldContainer}>
            <ThemedText style={styles.fieldLabel}>{texts.phone || 'Phone'}</ThemedText>
            <ThemedText style={[styles.fieldValue, styles.nonEditableField, isRTL && styles.rtlText]}>
              {userProfile?.phone || 'Not set'}
            </ThemedText>
          </View>

          {/* Birthday */}
          <View style={styles.fieldContainer}>
            <ThemedText style={styles.fieldLabel}>{texts.birthday || 'Birthday'}</ThemedText>
            <ThemedText style={[styles.fieldValue, styles.nonEditableField, isRTL && styles.rtlText]}>
              {userProfile?.dob ? new Date(userProfile.dob).toLocaleDateString() : 'Not set'}
            </ThemedText>
          </View>

          {/* Gender */}
          <View style={styles.fieldContainer}>
            <ThemedText style={styles.fieldLabel}>{texts.gender || 'Gender'}</ThemedText>
            <ThemedText style={[styles.fieldValue, styles.nonEditableField, isRTL && styles.rtlText]}>
              {userProfile?.gender || 'Not set'}
            </ThemedText>
          </View>
        </View>

        {/* Address Information */}
        <View style={[styles.section, { backgroundColor: surfaceColor }]}>
          <ThemedText type="defaultSemiBold" style={[styles.sectionTitle, isRTL && styles.rtlText]}>
            {texts.address || 'Address'}
          </ThemedText>

           {/* Address - Apartment */}
           <View style={styles.fieldContainer}>
            <ThemedText style={styles.fieldLabel}>Address - Apartment:</ThemedText>
            <ThemedText style={[styles.fieldValue, styles.nonEditableField, isRTL && styles.rtlText]}>
                {userProfile?.address_apartment || 'Not set'}
              </ThemedText>
          </View>

          {/* Address - Building */}
          <View style={styles.fieldContainer}>
            <ThemedText style={styles.fieldLabel}>Address - Building:</ThemedText>
            <ThemedText style={[styles.fieldValue, styles.nonEditableField, isRTL && styles.rtlText]}>
                {userProfile?.address_building || 'Not set'}
              </ThemedText>
          </View>

          {/* Address - Block */}
          <View style={styles.fieldContainer}>
            <ThemedText style={styles.fieldLabel}>Address - Block:</ThemedText>
            <ThemedText style={[styles.fieldValue, styles.nonEditableField, isRTL && styles.rtlText]}>
                {userProfile?.address_block || 'Not set'}
              </ThemedText>
          </View>
        </View>

        {/* Interests Section */}
        <View style={[styles.section, { backgroundColor: surfaceColor }]}>
          <View style={[styles.sectionHeader, isRTL && styles.sectionHeaderRTL]}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              {texts.interests || 'Interests'}
            </ThemedText>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: tintColor }]}
              onPress={() => setShowInterestModal(true)}
            >
              <IconSymbol name="pencil" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          {Object.entries(userInterests).map(([category, interests]) => (
            <View key={category} style={styles.interestCategory}>
              <ThemedText style={[styles.categoryTitle, isRTL && styles.rtlText]}>
                {category}
              </ThemedText>
              <View style={styles.interestTags}>
                {interests.map((interest, index) => (
                  <View key={interest.id} style={[styles.interestTag, { backgroundColor: tintColor + '20' }]}>
                    <ThemedText style={[styles.interestTagText, { color: tintColor }]}>
                      {interest.title}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          ))}

          {Object.keys(userInterests).length === 0 && (
            <ThemedText style={[styles.emptyInterests, isRTL && styles.rtlText]}>
              {texts.noInterestsYet || 'No interests added yet'}
            </ThemedText>
          )}
        </View>

        {/* Looking For Section */}
        <View style={[styles.section, { backgroundColor: surfaceColor }]}>
          <View style={[styles.sectionHeader, isRTL && styles.sectionHeaderRTL]}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              {texts.lookingFor || 'Looking For'}
            </ThemedText>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: tintColor }]}
              onPress={() => setShowLookForModal(true)}
            >
              <IconSymbol name="pencil" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          {Object.entries(userLookFor).map(([category, interests]) => (
            <View key={category} style={styles.interestCategory}>
              <ThemedText style={[styles.categoryTitle, isRTL && styles.rtlText]}>
                {category}
              </ThemedText>
              <View style={styles.interestTags}>
                {interests.map((interest, index) => (
                  <View key={interest.id} style={[styles.interestTag, { backgroundColor: accentColor + '20' }]}>
                    <ThemedText style={[styles.interestTagText, { color: accentColor }]}>
                      {interest.title}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          ))}

          {Object.keys(userLookFor).length === 0 && (
            <ThemedText style={[styles.emptyInterests, isRTL && styles.rtlText]}>
              {texts.noLookingForYet || 'No looking for preferences added yet'}
            </ThemedText>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: tintColor }]}
            onPress={() => router.push('/settings')}
          >
            <IconSymbol name="gearshape.fill" size={20} color="#fff" />
            <ThemedText style={styles.actionButtonText}>
              {texts.settings || 'Settings'}
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.logoutButton, { backgroundColor: '#EF5350' }]}
            onPress={handleLogout}
          >
            <IconSymbol name="power" size={20} color="#fff" />
            <ThemedText style={styles.actionButtonText}>
              {texts.logout || 'Logout'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: surfaceColor }]}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              {texts.changePassword || 'Change Password'}
            </ThemedText>

            <View style={styles.formField}>
              <ThemedText style={styles.fieldLabel}>
                {texts.currentPassword || 'Current Password'}
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor, color: textColor, textAlign: isRTL ? 'right' : 'left' }
                ]}
                placeholder={texts.enterCurrentPassword || 'Enter current password'}
                placeholderTextColor={textColor + '80'}
                secureTextEntry
                value={passwordData.current}
                onChangeText={(text) => setPasswordData({ ...passwordData, current: text })}
              />
            </View>

            <View style={styles.formField}>
              <ThemedText style={styles.fieldLabel}>
                {texts.newPassword || 'New Password'}
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor, color: textColor, textAlign: isRTL ? 'right' : 'left' }
                ]}
                placeholder={texts.enterNewPassword || 'Enter new password'}
                placeholderTextColor={textColor + '80'}
                secureTextEntry
                value={passwordData.new}
                onChangeText={(text) => setPasswordData({ ...passwordData, new: text })}
              />
            </View>

            <View style={styles.formField}>
              <ThemedText style={styles.fieldLabel}>
                {texts.confirmPassword || 'Confirm Password'}
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor, color: textColor, textAlign: isRTL ? 'right' : 'left' }
                ]}
                placeholder={texts.confirmNewPassword || 'Confirm new password'}
                placeholderTextColor={textColor + '80'}
                secureTextEntry
                value={passwordData.confirm}
                onChangeText={(text) => setPasswordData({ ...passwordData, confirm: text })}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor }]}
                onPress={() => setShowPasswordModal(false)}
              >
                <ThemedText>{texts.cancel || 'Cancel'}</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: tintColor }]}
                onPress={handleChangePassword}
              >
                <ThemedText style={{ color: '#fff' }}>
                  {texts.change || 'Change'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Interests Modal */}
      <Modal
        visible={showInterestModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInterestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: surfaceColor }]}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              {texts.editInterests || 'Edit Interests'}
            </ThemedText>

            <View style={styles.formField}>
              <ThemedText style={styles.fieldLabel}>
                {texts.selectInterests || 'Select your interests'}
              </ThemedText>
              <ScrollView style={{ maxHeight: 400 }}>
                {Object.entries(availableInterests).map(([category, interests]) => (
                  <View key={category} style={styles.categorySection}>
                    <ThemedText style={styles.categoryHeader}>{category}</ThemedText>
                    <View style={styles.categoryGrid}>
                      {interests.map((interest) => {
                        const isSelected = Object.values(userInterests)
                          .flat()
                          .some(userInt => userInt.id === interest.id);

                        return (
                          <TouchableOpacity
                            key={interest.id}
                            style={[
                              styles.categoryOption,
                              {
                                backgroundColor: isSelected ? tintColor : 'transparent',
                                borderColor: tintColor,
                              }
                            ]}
                            onPress={() => toggleInterest(interest)}
                          >
                            <ThemedText style={[
                              styles.categoryOptionText,
                              { color: isSelected ? '#fff' : textColor }
                            ]}>
                              {interest.title}
                            </ThemedText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: tintColor }]}
                onPress={() => setShowInterestModal(false)}
              >
                <ThemedText style={{ color: '#fff' }}>
                  {texts.done || 'Done'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Looking For Modal */}
      <Modal
        visible={showLookForModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLookForModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: surfaceColor }]}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              {texts.editLookingFor || 'Edit Looking For'}
            </ThemedText>

            <View style={styles.formField}>
              <ThemedText style={styles.fieldLabel}>
                {texts.selectLookingFor || 'Select what you are looking for'}
              </ThemedText>
              <ScrollView style={{ maxHeight: 400 }}>
                {Object.entries(availableInterests).map(([category, interests]) => (
                  <View key={category} style={styles.categorySection}>
                    <ThemedText style={styles.categoryHeader}>{category}</ThemedText>
                    <View style={styles.categoryGrid}>
                      {interests.map((interest) => {
                        const isSelected = Object.values(userLookFor)
                          .flat()
                          .some(userInt => userInt.id === interest.id);

                        return (
                          <TouchableOpacity
                            key={interest.id}
                            style={[
                              styles.categoryOption,
                              {
                                backgroundColor: isSelected ? accentColor : 'transparent',
                                borderColor: accentColor,
                              }
                            ]}
                            onPress={() => toggleLookFor(interest)}
                          >
                            <ThemedText style={[
                              styles.categoryOptionText,
                              { color: isSelected ? '#fff' : textColor }
                            ]}>
                              {interest.title}
                            </ThemedText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: accentColor }]}
                onPress={() => setShowLookForModal(false)}
              >
                <ThemedText style={{ color: '#fff' }}>
                  {texts.done || 'Done'}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameSection: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    marginBottom: 4,
  },
  userAge: {
    fontSize: 14,
    opacity: 0.7,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  addButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.8,
  },
  fieldValue: {
    fontSize: 16,
  },
  nonEditableField: {
    opacity: 0.7,
  },
  editableField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editingContainer: {
    gap: 8,
  },
  editInput: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  genderOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  genderOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  genderOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  interestCategory: {
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.8,
  },
  interestTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  interestTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsSection: {
    gap: 12,
    marginBottom: 32,
  },
   editButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  logoutButton: {
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    padding: 20,
    borderRadius: 12,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  formField: {
    marginBottom: 16,
  },
  textInput: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  categoryGrid:{
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#ccc',
  },
  rtlText: {
    textAlign: 'right',
  },
  categorySection: {
    marginBottom: 16,
  },
  categoryHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    opacity: 0.8,
  },
  emptyInterests: {
    textAlign: 'center',
    opacity: 0.6,
    fontStyle: 'italic',
    marginTop: 16,
  },
});