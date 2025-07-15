// Test script to check key format and troubleshoot signature issues
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

console.log('🔍 Checking Key Format...\n');

console.log('📋 Key Analysis:');
console.log('Access Key ID length:', envVars.CLOUDFLARE_ACCESS_KEY_ID.length);
console.log('Secret Access Key length:', envVars.CLOUDFLARE_SECRET_ACCESS_KEY.length);
console.log('Access Key ID:', envVars.CLOUDFLARE_ACCESS_KEY_ID);
console.log('Secret Key (first 10 chars):', envVars.CLOUDFLARE_SECRET_ACCESS_KEY.substring(0, 10) + '...');

// Check for common issues
const accessKey = envVars.CLOUDFLARE_ACCESS_KEY_ID;
const secretKey = envVars.CLOUDFLARE_SECRET_ACCESS_KEY;

console.log('\n🔍 Format Checks:');
console.log('Access Key contains spaces:', accessKey.includes(' '));
console.log('Secret Key contains spaces:', secretKey.includes(' '));
console.log('Access Key contains quotes:', accessKey.includes('"') || accessKey.includes("'"));
console.log('Secret Key contains quotes:', secretKey.includes('"') || secretKey.includes("'"));

// Try with trimmed keys
const trimmedAccessKey = accessKey.trim();
const trimmedSecretKey = secretKey.trim();

console.log('\n🔄 Testing with trimmed keys...');

const s3 = new AWS.S3({
  endpoint: envVars.CLOUDFLARE_ENDPOINT,
  accessKeyId: trimmedAccessKey,
  secretAccessKey: trimmedSecretKey,
  region: 'auto',
  signatureVersion: 'v4'
});

async function testWithTrimmedKeys() {
  try {
    const objects = await s3.listObjectsV2({
      Bucket: envVars.CLOUDFLARE_BUCKET_NAME,
      MaxKeys: 1
    }).promise();
    
    console.log('✅ Success with trimmed keys!');
    console.log('Objects found:', objects.Contents?.length || 0);
    
  } catch (error) {
    console.log('❌ Still failed:', error.message);
    console.log('Error code:', error.code);
    
    if (error.code === 'SignatureDoesNotMatch') {
      console.log('\n💡 Signature mismatch suggestions:');
      console.log('1. Make sure you copied the entire secret key');
      console.log('2. Check for any extra characters or spaces');
      console.log('3. Try copying the keys again from Cloudflare dashboard');
      console.log('4. The secret key should be exactly 64 characters long');
    }
  }
}

testWithTrimmedKeys(); 