// Test script specifically for the musicplayer11 bucket
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

console.log('🔍 Testing Specific Bucket Access...\n');

// Configure AWS SDK for Cloudflare R2
const s3 = new AWS.S3({
  endpoint: envVars.CLOUDFLARE_ENDPOINT,
  accessKeyId: envVars.CLOUDFLARE_ACCESS_KEY_ID,
  secretAccessKey: envVars.CLOUDFLARE_SECRET_ACCESS_KEY,
  region: 'auto',
  signatureVersion: 'v4'
});

async function testBucketAccess() {
  try {
    console.log('📋 Configuration:');
    console.log('Account ID:', envVars.CLOUDFLARE_ACCOUNT_ID);
    console.log('Bucket:', envVars.CLOUDFLARE_BUCKET_NAME);
    console.log('Endpoint:', envVars.CLOUDFLARE_ENDPOINT);
    console.log('Access Key ID:', envVars.CLOUDFLARE_ACCESS_KEY_ID.substring(0, 8) + '...');
    
    console.log('\n🔗 Testing bucket access...');
    
    // Test 1: List objects in the specific bucket
    const objects = await s3.listObjectsV2({
      Bucket: envVars.CLOUDFLARE_BUCKET_NAME,
      MaxKeys: 10
    }).promise();
    
    console.log('✅ Successfully accessed bucket!');
    console.log('Objects found:', objects.Contents?.length || 0);
    
    if (objects.Contents && objects.Contents.length > 0) {
      console.log('\n📁 Files in bucket:');
      objects.Contents.forEach(obj => {
        const sizeMB = obj.Size ? (obj.Size / (1024 * 1024)).toFixed(2) : '0';
        console.log(`  - ${obj.Key} (${sizeMB} MB)`);
      });
    } else {
      console.log('📁 Bucket is empty - ready for music files!');
    }
    
    // Test 2: Check bucket permissions
    console.log('\n🔐 Testing bucket permissions...');
    try {
      const bucketLocation = await s3.getBucketLocation({
        Bucket: envVars.CLOUDFLARE_BUCKET_NAME
      }).promise();
      console.log('✅ Bucket location:', bucketLocation.LocationConstraint || 'auto');
    } catch (permError) {
      console.log('⚠️  Permission test failed:', permError.message);
    }
    
  } catch (error) {
    console.log('❌ Access failed:', error.message);
    console.log('Error code:', error.code);
    
    if (error.code === 'NoSuchBucket') {
      console.log('💡 The bucket does not exist or you don\'t have access to it.');
    } else if (error.code === 'AccessDenied') {
      console.log('💡 Access denied. This could be:');
      console.log('   - API token needs time to propagate (wait a few minutes)');
      console.log('   - Token permissions are insufficient');
      console.log('   - Bucket name is incorrect');
    } else if (error.code === 'InvalidAccessKeyId') {
      console.log('💡 Invalid API credentials.');
    }
  }
}

testBucketAccess(); 