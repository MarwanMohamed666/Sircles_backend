
require('dotenv').config({ path: '.env.local' });
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
    console.log('Testing storage connection with anon key...');
    console.log('Supabase URL:', supabaseUrl);
    
    // Test authentication (RLS policies require authenticated users)
    console.log('🔐 Testing authentication requirement...');
    
    // First test without auth (should fail for upload due to RLS)
    console.log('📝 Testing upload without authentication (should fail)...');
    
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
    console.log('🔍 Bucket public status:', avatarsBucket.public ? 'Public ✅' : 'Private ❌');
    
    if (!avatarsBucket.public) {
      console.log('⚠️  WARNING: Bucket is not public! This may cause upload issues.');
      console.log('📝 To fix this:');
      console.log('1. Go to Storage > Buckets in your Supabase dashboard');
      console.log('2. Click on the avatars bucket');
      console.log('3. Go to Settings and toggle "Public bucket" to ON');
    }
    
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
    
    // Test upload functionality without authentication first
    console.log('🧪 Testing upload functionality without auth...');
    let testContent = `Test upload without auth at ${new Date().toISOString()}`;
    let testFileName = 'test-upload-no-auth.txt';
    
    let { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(testFileName, new Blob([testContent], { type: 'text/plain' }), {
        upsert: true
      });
    
    if (uploadError) {
      console.log('❌ Upload without auth failed (expected):', uploadError.message);
      if (uploadError.message.includes('new row violates row-level security') || 
          uploadError.message.includes('JWT') ||
          uploadError.message.includes('permission denied')) {
        console.log('✅ RLS is working correctly - anonymous users cannot upload');
        console.log('💡 This means your app security is properly configured!');
        console.log('📱 Users must be logged in through your app to upload avatars');
      }
    } else {
      console.log('⚠️  Upload without auth succeeded (unexpected - RLS may not be configured)');
      // Clean up if successful
      await supabase.storage.from('avatars').remove([testFileName]);
    }
    
    // Now test with a real authentication flow
    console.log('🔐 For upload testing with auth, you need to be logged in through your app');
    console.log('💡 The upload button should work once you are authenticated in your app');
    
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
