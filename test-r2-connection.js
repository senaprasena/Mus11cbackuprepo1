// Test script to verify R2 connection
const AWS = require('aws-sdk');
const fs = require('fs');

// Load environment variables from env.txt
const envContent = fs.readFileSync('env.txt', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

console.log('🔍 Testing R2 Connection...\n');

// Check if we have the required environment variables
console.log('📋 Environment Variables Check:');
console.log('Account ID:', envVars.CLOUDFLARE_ACCOUNT_ID ? '✅ Set' : '❌ Missing');
console.log('Access Key ID:', envVars.CLOUDFLARE_ACCESS_KEY_ID !== 'YOUR_NEW_ACCESS_KEY_ID_HERE' ? '✅ Set' : '❌ Missing (using placeholder)');
console.log('Secret Access Key:', envVars.CLOUDFLARE_SECRET_ACCESS_KEY !== 'YOUR_NEW_SECRET_ACCESS_KEY_HERE' ? '✅ Set' : '❌ Missing (using placeholder)');
console.log('Bucket Name:', envVars.CLOUDFLARE_BUCKET_NAME ? '✅ Set' : '❌ Missing');
console.log('Endpoint:', envVars.CLOUDFLARE_ENDPOINT ? '✅ Set' : '❌ Missing');
console.log('Public URL:', envVars.CLOUDFLARE_PUBLIC_URL ? '✅ Set' : '❌ Missing');

// Configure AWS SDK for Cloudflare R2
const s3 = new AWS.S3({
  endpoint: envVars.CLOUDFLARE_ENDPOINT,
  accessKeyId: envVars.CLOUDFLARE_ACCESS_KEY_ID,
  secretAccessKey: envVars.CLOUDFLARE_SECRET_ACCESS_KEY,
  region: 'auto',
  signatureVersion: 'v4'
});

async function testConnection() {
  try {
    console.log('\n🔗 Testing R2 Connection...');
    
    // Test 1: List buckets (should work even with placeholder credentials)
    console.log('\n📦 Test 1: Listing buckets...');
    const buckets = await s3.listBuckets().promise();
    console.log('✅ Successfully connected to R2!');
    console.log('Available buckets:', buckets.Buckets?.map(b => b.Name) || []);
    
    // Test 2: List objects in specific bucket
    if (envVars.CLOUDFLARE_BUCKET_NAME) {
      console.log('\n📁 Test 2: Listing objects in bucket:', envVars.CLOUDFLARE_BUCKET_NAME);
      try {
        const objects = await s3.listObjectsV2({
          Bucket: envVars.CLOUDFLARE_BUCKET_NAME,
          MaxKeys: 10
        }).promise();
        
        console.log('✅ Successfully accessed bucket!');
        console.log('Objects found:', objects.Contents?.length || 0);
        
        if (objects.Contents && objects.Contents.length > 0) {
          console.log('Sample objects:');
          objects.Contents.slice(0, 5).forEach(obj => {
            console.log(`  - ${obj.Key} (${obj.Size} bytes)`);
          });
        }
      } catch (bucketError) {
        console.log('❌ Failed to access bucket:', bucketError.message);
        if (bucketError.code === 'NoSuchBucket') {
          console.log('💡 The bucket does not exist or you don\'t have access to it.');
        } else if (bucketError.code === 'InvalidAccessKeyId') {
          console.log('💡 Invalid API credentials. Please create proper API tokens.');
        }
      }
    }
    
    // Test 3: Check custom domain
    console.log('\n🌐 Test 3: Custom domain check');
    console.log('Custom domain:', envVars.CLOUDFLARE_PUBLIC_URL);
    console.log('This should be your custom domain for faster access.');
    
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    
    if (error.code === 'InvalidAccessKeyId') {
      console.log('\n💡 Solution: Create API tokens in your R2 dashboard');
      console.log('1. Go to R2 Dashboard → Manage API tokens');
      console.log('2. Click "Create Account API token"');
      console.log('3. Set permissions: Object Read & Write');
      console.log('4. Copy the Access Key ID and Secret Access Key');
      console.log('5. Update env.txt with the real values');
    }
  }
}

testConnection(); 