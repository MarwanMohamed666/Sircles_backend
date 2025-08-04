
import { supabase } from './lib/supabase.js';

async function testStorage() {
  try {
    console.log('Testing storage connection...');
    
    // Test if we can list buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Buckets error:', bucketsError);
      return;
    }
    
    console.log('Available buckets:', buckets);
    
    // Check if avatars bucket exists
    const avatarsBucket = buckets.find(bucket => bucket.name === 'avatars');
    if (!avatarsBucket) {
      console.error('Avatars bucket not found! Please create it in Supabase dashboard.');
      return;
    }
    
    console.log('Avatars bucket found:', avatarsBucket);
    
    // Test listing files in avatars bucket
    const { data: files, error: filesError } = await supabase.storage
      .from('avatars')
      .list('', { limit: 5 });
    
    if (filesError) {
      console.error('Files list error:', filesError);
      return;
    }
    
    console.log('Files in avatars bucket:', files);
    console.log('Storage test completed successfully!');
    
  } catch (error) {
    console.error('Storage test failed:', error);
  }
}

testStorage();
