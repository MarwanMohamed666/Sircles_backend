
import { supabase } from './supabase';

export const StorageService = {
  async uploadAvatar(userId: string, asset: any, fileExtension: string) {
    try {
      const fileName = `${userId}.${fileExtension}`;
      
      let uploadData;
      
      if (typeof asset === 'object' && asset.uri) {
        // React Native file upload
        const formData = new FormData();
        formData.append('file', {
          uri: asset.uri,
          type: `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`,
          name: fileName,
        } as any);
        uploadData = formData;
      } else {
        // Web file upload (Blob/File)
        uploadData = asset;
      }

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, uploadData, {
          upsert: true,
          contentType: `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`
        });

      if (error) {
        console.error('Upload error:', error);
        return { data: null, error };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      return { data: { ...data, publicUrl: urlData.publicUrl }, error: null };
    } catch (error) {
      console.error('Storage service error:', error);
      return { data: null, error: error as Error };
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
    
    return data.publicUrl;
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
