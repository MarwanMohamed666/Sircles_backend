import { supabase } from './supabase';

export const StorageService = {
  async uploadAvatar(userId: string, asset: any, fileExtension: string) {
    console.log('=== STORAGE SERVICE UPLOAD START ===');
    try {
      const fileName = `${userId}.${fileExtension}`;
      console.log('=== UPLOAD AVATAR DEBUG ===');
      console.log('User ID:', userId);
      console.log('File extension:', fileExtension);
      console.log('Final filename:', fileName);
      console.log('Asset details:', { 
        hasUri: !!asset?.uri, 
        uriType: asset?.uri?.startsWith('data:') ? 'base64' : 'file',
        assetType: typeof asset 
      });

      let uploadData: Blob;

      // Handle different asset types from Expo Image Picker
      if (asset && asset.uri) {
        console.log('Processing asset URI...');
        
        try {
          // Fetch the asset URI (works for both base64 data URIs and file URIs)
          const response = await fetch(asset.uri);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch asset: ${response.status} ${response.statusText}`);
          }

          // Convert response to blob
          uploadData = await response.blob();
          console.log('Blob created successfully:', {
            size: uploadData.size,
            type: uploadData.type,
            sizeKB: Math.round(uploadData.size / 1024) + 'KB'
          });

          // Validate blob
          if (uploadData.size === 0) {
            throw new Error('Blob is empty - asset may not have been processed correctly');
          }

        } catch (fetchError) {
          console.error('Error processing asset - FULL DETAILS:', {
            error: fetchError,
            message: fetchError?.message,
            stack: fetchError?.stack,
            assetUri: asset?.uri?.substring(0, 50) + '...'
          });
          throw new Error(`Failed to process image: ${fetchError.message}`);
        }
      } else if (asset instanceof Blob || asset instanceof File) {
        // Direct blob/file upload (web)
        uploadData = asset;
        console.log('Using direct blob/file upload');
      } else {
        throw new Error('Invalid asset format - expected asset with URI or Blob/File');
      }

      // Determine correct content type
      const contentType = fileExtension === 'jpg' || fileExtension === 'jpeg' 
        ? 'image/jpeg' 
        : `image/${fileExtension}`;

      console.log('Uploading to Supabase with params:', {
        bucket: 'avatars',
        fileName,
        contentType,
        blobSize: uploadData.size,
        upsert: true
      });

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, uploadData, {
          upsert: true,
          contentType: contentType,
          cacheControl: '3600'  // Cache for 1 hour
        });

      if (error) {
        console.error('Supabase upload error details:', {
          message: error.message,
          statusCode: error.statusCode,
          error: error
        });
        return { data: null, error };
      }

      console.log('Upload successful - Supabase response:', data);
      console.log('Uploaded file path:', data?.path);
      console.log('Uploaded file name should be:', fileName);

      // Get public URL with cache-busting parameter
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Add cache-busting timestamp to force browser to fetch new image
      const cacheBustingUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      
      console.log('Generated public URL:', urlData.publicUrl);
      console.log('Cache-busting URL:', cacheBustingUrl);

      return { 
        data: { 
          ...data, 
          publicUrl: cacheBustingUrl 
        }, 
        error: null 
      };

    } catch (error) {
      console.error('=== STORAGE SERVICE ERROR - FULL DETAILS ===');
      console.error('Error object:', error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      console.error('Error type:', typeof error);
      console.error('Is Error instance:', error instanceof Error);
      
      return { 
        data: null, 
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  },

  async deleteAvatar(userId: string, fileExtension: string) {
    try {
      const fileName = `${userId}.${fileExtension}`;

      const { data, error } = await supabase.storage
        .from('avatars')
        .remove([fileName]);

      return { data, error };
    } catch (error) {
      console.error('Delete avatar error:', error);
      return { data: null, error: error as Error };
    }
  },

  getAvatarUrl(userId: string, fileExtension: string = 'png') {
    const fileName = `${userId}.${fileExtension}`;
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    // Add cache-busting timestamp to ensure fresh image load
    return `${data.publicUrl}?t=${Date.now()}`;
  },

  async uploadCircleProfilePicture(circleId: string, asset: any) {
    try {
      console.log('Starting circle profile picture upload for circle:', circleId);
      console.log('Asset details:', {
        uri: asset?.uri?.substring(0, 50) + '...',
        type: asset?.type,
        fileSize: asset?.fileSize,
        fileName: asset?.fileName,
        width: asset?.width,
        height: asset?.height
      });

      if (!asset?.uri) {
        throw new Error('No asset URI provided');
      }

      // Determine file extension from the asset
      let fileExtension: string;
      
      if (asset.uri.startsWith('data:image/')) {
        // Extract extension from data URI MIME type
        const mimeMatch = asset.uri.match(/data:image\/([^;]+)/);
        fileExtension = mimeMatch ? mimeMatch[1] : 'png';
        console.log('Extracted extension from data URI:', fileExtension);
      } else {
        // Extract from file path or fileName
        fileExtension = asset.fileName 
          ? asset.fileName.split('.').pop()?.toLowerCase() || 'png'
          : asset.uri.split('.').pop()?.toLowerCase() || 'png';
        console.log('Extracted extension from file path/name:', fileExtension);
      }

      // Normalize extension but preserve the original type
      if (fileExtension === 'jpeg') {
        fileExtension = 'jpg';
      }
      
      // Validate supported formats
      if (!['png', 'jpg', 'jpeg'].includes(fileExtension)) {
        throw new Error('Unsupported file format. Please use PNG or JPG/JPEG.');
      }

      // Generate filename with circle ID using original extension
      const fileName = `${circleId}.${fileExtension}`;
      
      console.log('Generated filename:', fileName);

      let uploadData;

      if (asset?.uri) {
        // Mobile/Expo - fetch the asset as blob
        console.log('Processing asset from URI for mobile/Expo');
        
        try {
          const response = await fetch(asset.uri);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch asset: ${response.status} ${response.statusText}`);
          }
          
          uploadData = await response.blob();
          console.log('Successfully converted URI to blob:', {
            size: uploadData.size,
            type: uploadData.type
          });

          // Validate blob
          if (uploadData.size === 0) {
            throw new Error('Blob is empty - asset may not have been processed correctly');
          }

        } catch (fetchError) {
          console.error('Error processing asset - FULL DETAILS:', {
            error: fetchError,
            message: fetchError?.message,
            stack: fetchError?.stack,
            assetUri: asset?.uri?.substring(0, 50) + '...'
          });
          throw new Error(`Failed to process image: ${fetchError.message}`);
        }
      } else if (asset instanceof Blob || asset instanceof File) {
        // Direct blob/file upload (web)
        uploadData = asset;
        console.log('Using direct blob/file upload');
      } else {
        throw new Error('Invalid asset format - expected asset with URI or Blob/File');
      }

      // Determine correct content type
      const contentType = fileExtension === 'jpg' || fileExtension === 'jpeg' 
        ? 'image/jpeg' 
        : `image/${fileExtension}`;

      console.log('Uploading to Supabase with params:', {
        bucket: 'circle-profile-pics',
        fileName,
        contentType,
        blobSize: uploadData.size,
        upsert: true
      });

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('circle-profile-pics')
        .upload(fileName, uploadData, {
          upsert: true,
          contentType: contentType,
          cacheControl: '3600'  // Cache for 1 hour
        });

      if (error) {
        console.error('Supabase upload error details:', {
          message: error.message,
          statusCode: error.statusCode,
          error: error
        });
        return { data: null, error };
      }

      console.log('Upload successful - Supabase response:', data);
      console.log('Uploaded file path:', data?.path);
      console.log('Uploaded file name should be:', fileName);

      // Get public URL with cache-busting parameter
      const { data: urlData } = supabase.storage
        .from('circle-profile-pics')
        .getPublicUrl(fileName);
      
      const cacheBustingUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      
      console.log('Generated public URL:', urlData.publicUrl);
      console.log('Cache-busting URL:', cacheBustingUrl);
      
      return { 
        data: { 
          ...data, 
          publicUrl: cacheBustingUrl 
        }, 
        error: null 
      };
    } catch (error) {
      console.error('Circle profile picture upload error:', error);
      return { data: null, error: error as Error };
    }
  },

  getCircleProfilePictureUrl(circleId: string, extension: string = 'jpg') {
    const fileName = `${circleId}.${extension}`;
    const { data } = supabase.storage
      .from('circle-profile-pics')
      .getPublicUrl(fileName);
    
    return `${data.publicUrl}?t=${Date.now()}`;
  },

  async getCircleProfilePictureUrlWithExtensionCheck(circleId: string) {
    // Check for both .png and .jpg files
    const extensions = ['png', 'jpg'];

    for (const ext of extensions) {
      const fileName = `${circleId}.${ext}`;
      const { data, error } = await supabase.storage
        .from('circle-profile-pics')
        .list('', {
          search: fileName
        });

      if (!error && data && data.length > 0) {
        return this.getCircleProfilePictureUrl(circleId, ext);
      }
    }

    // Return default if no file found
    return this.getCircleProfilePictureUrl(circleId, 'jpg');
  },

  async checkAvatarExists(userId: string) {
    try {
      // Check for both .png and .jpg
      const extensions = ['png', 'jpg'];

      for (const ext of extensions) {
        const fileName = `${userId}.${ext}`;
        const { data, error } = await supabase.storage
          .from('avatars')
          .list('', {
            search: fileName
          });

        if (!error && data && data.length > 0) {
          return { exists: true, extension: ext, fileName };
        }
      }

      return { exists: false, extension: null, fileName: null };
    } catch (error) {
      console.error('Check avatar exists error:', error);
      return { exists: false, extension: null, fileName: null };
    }
  },

  async uploadPostPhoto(postId: string, asset: any, userId: string) {
    try {
      console.log('Starting post photo upload for post:', postId);
      console.log('Asset details:', {
        uri: asset?.uri?.substring(0, 50) + '...',
        type: asset?.type,
        fileSize: asset?.fileSize,
        fileName: asset?.fileName,
        width: asset?.width,
        height: asset?.height
      });

      if (!asset?.uri) {
        throw new Error('No asset URI provided');
      }

      // Check file size limit (3MB)
      if (asset.fileSize && asset.fileSize > 3145728) {
        throw new Error('File size must be less than 3MB');
      }

      // Determine file extension from the asset
      let fileExtension: string;
      
      if (asset.uri.startsWith('data:image/')) {
        // Extract extension from data URI MIME type
        const mimeMatch = asset.uri.match(/data:image\/([^;]+)/);
        fileExtension = mimeMatch ? mimeMatch[1] : 'png';
        console.log('Extracted extension from data URI:', fileExtension);
      } else {
        // Extract from file path or fileName
        fileExtension = asset.fileName 
          ? asset.fileName.split('.').pop()?.toLowerCase() || 'png'
          : asset.uri.split('.').pop()?.toLowerCase() || 'png';
        console.log('Extracted extension from file path/name:', fileExtension);
      }

      // Normalize extension
      if (fileExtension === 'jpeg') {
        fileExtension = 'jpg';
      }
      
      // Validate supported formats (jpg, png, gif)
      if (!['png', 'jpg', 'jpeg', 'gif'].includes(fileExtension)) {
        throw new Error('Unsupported file format. Please use PNG, JPG/JPEG, or GIF.');
      }

      // Generate filename with post ID and timestamp for uniqueness
      const timestamp = Date.now();
      const fileName = `${postId}_${timestamp}.${fileExtension}`;
      
      console.log('Generated filename:', fileName);

      let uploadData;

      if (asset?.uri) {
        // Mobile/Expo - fetch the asset as blob
        console.log('Processing asset from URI for mobile/Expo');
        
        try {
          const response = await fetch(asset.uri);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch asset: ${response.status} ${response.statusText}`);
          }
          
          uploadData = await response.blob();
          console.log('Successfully converted URI to blob:', {
            size: uploadData.size,
            type: uploadData.type
          });

          // Double-check file size after conversion
          if (uploadData.size > 3145728) {
            throw new Error('File size must be less than 3MB');
          }

          // Validate blob
          if (uploadData.size === 0) {
            throw new Error('Blob is empty - asset may not have been processed correctly');
          }

        } catch (fetchError) {
          console.error('Error processing asset - FULL DETAILS:', {
            error: fetchError,
            message: fetchError?.message,
            stack: fetchError?.stack,
            assetUri: asset?.uri?.substring(0, 50) + '...'
          });
          throw new Error(`Failed to process image: ${fetchError.message}`);
        }
      } else if (asset instanceof Blob || asset instanceof File) {
        // Direct blob/file upload (web)
        uploadData = asset;
        
        // Check file size
        if (uploadData.size > 3145728) {
          throw new Error('File size must be less than 3MB');
        }
        
        console.log('Using direct blob/file upload');
      } else {
        throw new Error('Invalid asset format - expected asset with URI or Blob/File');
      }

      // Determine correct content type
      const contentType = fileExtension === 'jpg' || fileExtension === 'jpeg' 
        ? 'image/jpeg' 
        : fileExtension === 'gif'
          ? 'image/gif'
          : `image/${fileExtension}`;

      console.log('Uploading to Supabase with params:', {
        bucket: 'post-photos',
        fileName,
        contentType,
        blobSize: uploadData.size,
        upsert: true
      });

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('post-photos')
        .upload(fileName, uploadData, {
          upsert: true,
          contentType: contentType,
          cacheControl: '3600'  // Cache for 1 hour
        });

      if (error) {
        console.error('Supabase upload error details:', {
          message: error.message,
          statusCode: error.statusCode,
          error: error
        });
        return { data: null, error };
      }

      console.log('Upload successful - Supabase response:', data);
      console.log('Uploaded file path:', data?.path);
      console.log('Uploaded file name should be:', fileName);

      // Get public URL with cache-busting parameter
      const { data: urlData } = supabase.storage
        .from('post-photos')
        .getPublicUrl(fileName);
      
      const cacheBustingUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      
      console.log('Generated public URL:', urlData.publicUrl);
      console.log('Cache-busting URL:', cacheBustingUrl);
      
      return { 
        data: { 
          ...data, 
          publicUrl: cacheBustingUrl 
        }, 
        error: null 
      };
    } catch (error) {
      console.error('Post photo upload error:', error);
      return { data: null, error: error as Error };
    }
  },

  async deletePostPhoto(postId: string, fileName: string) {
    try {
      const { data, error } = await supabase.storage
        .from('post-photos')
        .remove([fileName]);

      return { data, error };
    } catch (error) {
      console.error('Delete post photo error:', error);
      return { data: null, error: error as Error };
    }
  },

  getPostPhotoUrl(fileName: string) {
    const { data } = supabase.storage
      .from('post-photos')
      .getPublicUrl(fileName);

    // Add cache-busting timestamp to ensure fresh image load
    return `${data.publicUrl}?t=${Date.now()}`;
  },

  async uploadEventPhoto(eventId: string, asset: any, userId: string) {
    try {
      console.log('Starting event photo upload for event:', eventId);
      console.log('Asset details:', {
        uri: asset?.uri?.substring(0, 50) + '...',
        type: asset?.type,
        fileSize: asset?.fileSize,
        fileName: asset?.fileName,
        width: asset?.width,
        height: asset?.height
      });

      if (!asset?.uri) {
        throw new Error('No asset URI provided');
      }

      // Check file size limit (5MB)
      if (asset.fileSize && asset.fileSize > 5242880) {
        throw new Error('File size must be less than 5MB');
      }

      // Determine file extension from the asset
      let fileExtension: string;
      
      if (asset.uri.startsWith('data:image/')) {
        // Extract extension from data URI MIME type
        const mimeMatch = asset.uri.match(/data:image\/([^;]+)/);
        fileExtension = mimeMatch ? mimeMatch[1] : 'png';
        console.log('Extracted extension from data URI:', fileExtension);
      } else {
        // Extract from file path or fileName
        fileExtension = asset.fileName 
          ? asset.fileName.split('.').pop()?.toLowerCase() || 'png'
          : asset.uri.split('.').pop()?.toLowerCase() || 'png';
        console.log('Extracted extension from file path/name:', fileExtension);
      }

      // Normalize extension
      if (fileExtension === 'jpeg') {
        fileExtension = 'jpg';
      }
      
      // Validate supported formats (jpg, png, gif)
      if (!['png', 'jpg', 'jpeg', 'gif'].includes(fileExtension)) {
        throw new Error('Unsupported file format. Please use PNG, JPG/JPEG, or GIF.');
      }

      // Generate filename with event ID and timestamp for uniqueness
      const timestamp = Date.now();
      const fileName = `${eventId}_${timestamp}.${fileExtension}`;
      
      console.log('Generated filename:', fileName);

      let uploadData;

      if (asset?.uri) {
        // Mobile/Expo - fetch the asset as blob
        console.log('Processing asset from URI for mobile/Expo');
        
        try {
          const response = await fetch(asset.uri);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch asset: ${response.status} ${response.statusText}`);
          }
          
          uploadData = await response.blob();
          console.log('Successfully converted URI to blob:', {
            size: uploadData.size,
            type: uploadData.type
          });

          // Double-check file size after conversion
          if (uploadData.size > 5242880) {
            throw new Error('File size must be less than 5MB');
          }

          // Validate blob
          if (uploadData.size === 0) {
            throw new Error('Blob is empty - asset may not have been processed correctly');
          }

        } catch (fetchError) {
          console.error('Error processing asset - FULL DETAILS:', {
            error: fetchError,
            message: fetchError?.message,
            stack: fetchError?.stack,
            assetUri: asset?.uri?.substring(0, 50) + '...'
          });
          throw new Error(`Failed to process image: ${fetchError.message}`);
        }
      } else if (asset instanceof Blob || asset instanceof File) {
        // Direct blob/file upload (web)
        uploadData = asset;
        
        // Check file size
        if (uploadData.size > 5242880) {
          throw new Error('File size must be less than 5MB');
        }
        
        console.log('Using direct blob/file upload');
      } else {
        throw new Error('Invalid asset format - expected asset with URI or Blob/File');
      }

      // Determine correct content type
      const contentType = fileExtension === 'jpg' || fileExtension === 'jpeg' 
        ? 'image/jpeg' 
        : fileExtension === 'gif'
          ? 'image/gif'
          : `image/${fileExtension}`;

      console.log('Uploading to Supabase with params:', {
        bucket: 'events-photos',
        fileName,
        contentType,
        blobSize: uploadData.size,
        upsert: true
      });

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('events-photos')
        .upload(fileName, uploadData, {
          upsert: true,
          contentType: contentType,
          cacheControl: '3600'  // Cache for 1 hour
        });

      if (error) {
        console.error('Supabase upload error details:', {
          message: error.message,
          statusCode: error.statusCode,
          error: error
        });
        return { data: null, error };
      }

      console.log('Upload successful - Supabase response:', data);
      console.log('Uploaded file path:', data?.path);
      console.log('Uploaded file name should be:', fileName);

      // Get public URL with cache-busting parameter
      const { data: urlData } = supabase.storage
        .from('events-photos')
        .getPublicUrl(fileName);
      
      const cacheBustingUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      
      console.log('Generated public URL:', urlData.publicUrl);
      console.log('Cache-busting URL:', cacheBustingUrl);
      
      return { 
        data: { 
          ...data, 
          publicUrl: cacheBustingUrl 
        }, 
        error: null 
      };
    } catch (error) {
      console.error('Event photo upload error:', error);
      return { data: null, error: error as Error };
    }
  },

  async deleteEventPhoto(eventId: string, fileName: string) {
    try {
      const { data, error } = await supabase.storage
        .from('events-photos')
        .remove([fileName]);

      return { data, error };
    } catch (error) {
      console.error('Delete event photo error:', error);
      return { data: null, error: error as Error };
    }
  },

  getEventPhotoUrl(fileName: string) {
    const { data } = supabase.storage
      .from('events-photos')
      .getPublicUrl(fileName);

    // Add cache-busting timestamp to ensure fresh image load
    return `${data.publicUrl}?t=${Date.now()}`;
  }
};