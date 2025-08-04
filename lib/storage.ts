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

  async uploadCircleProfilePicture(circleId: string, base64Data: string) {
    try {
      // Extract file extension from base64 data URI
      const matches = base64Data.match(/^data:image\/([a-zA-Z]*);base64,(.*)$/);
      if (!matches) {
        return { data: null, error: new Error('Invalid base64 data') };
      }
      
      const extension = matches[1];
      const base64 = matches[2];
      
      // Convert base64 to blob
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: `image/${extension}` });
      
      // Generate filename with circle ID
      const fileName = `${circleId}.${extension}`;
      
      console.log('Uploading circle profile picture:', fileName);
      
      // Upload to circle-profile-pics bucket
      const { data, error } = await supabase.storage
        .from('circle-profile-pics')
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (error) {
        console.error('Upload error:', error);
        return { data: null, error };
      }
      
      console.log('Uploaded file path:', data?.path);
      
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

  getCircleProfilePictureUrl(circleId: string) {
    const fileName = `${circleId}.jpg`; // Default to jpg, could be png too
    const { data } = supabase.storage
      .from('circle-profile-pics')
      .getPublicUrl(fileName);
    
    return `${data.publicUrl}?t=${Date.now()}`;
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
  }
};