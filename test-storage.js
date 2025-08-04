
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing environment variables:');
  console.error('EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Present' : 'Missing');
  console.error('EXPO_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Present' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testStorage() {
  try {
    console.log('Testing storage connection...');
    console.log('Supabase URL:', supabaseUrl);
    
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
      console.error('❌ Avatars bucket not found! Please create it in Supabase dashboard.');
      console.log('📝 To create the bucket:');
      console.log('1. Go to your Supabase project dashboard');
      console.log('2. Navigate to Storage > Buckets');
      console.log('3. Create a new bucket named "avatars"');
      console.log('4. Make it public if you want public URLs');
      return;
    }
    
    console.log('✅ Avatars bucket found:', avatarsBucket);
    
    // Test listing files in avatars bucket
    const { data: files, error: filesError } = await supabase.storage
      .from('avatars')
      .list('', { limit: 5 });
    
    if (filesError) {
      console.error('❌ Files list error:', filesError);
      if (filesError.message.includes('JWT')) {
        console.log('💡 This might be a RLS policy issue. Make sure your storage policies are applied correctly.');
      }
      return;
    }
    
    console.log('✅ Files in avatars bucket:', files);
    console.log('🎉 Storage test completed successfully!');
    
  } catch (error) {
    console.error('❌ Storage test failed:', error);
    
    if (error.message.includes('fetch')) {
      console.log('💡 Network error - check your internet connection and Supabase URL');
    } else if (error.message.includes('JWT')) {
      console.log('💡 Authentication error - check your Supabase anon key');
    }
  }
}

testStorage();
