// Unified Music Sync Tool
// Converts, uploads, and generates tracks.json with rich metadata for your music player
// Usage: node music-sync.js (or compile to .exe for Windows)

// --- Dependencies ---
const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');
const { execSync } = require('child_process');
const AWS = require('aws-sdk');
const mm = require('music-metadata'); // music-metadata for extracting tags
const chalk = require('chalk');
const dotenv = require('dotenv');
dotenv.config({ path: '../.env' });

// --- Config ---
const CONFIG = {
  inputDir: '../music_content/music_to_sync',           // Where you put your music
  outputDir: '../music_content/output_converted',       // Where converted files go
  coverArtDir: '../music_content/cover_art',            // Where extracted cover art goes
  tracksJson: '../tracks.json',           // Output config for your player
  cloudflare: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
    bucketName: process.env.CLOUDFLARE_BUCKET_NAME,
    region: 'auto',
    endpoint: process.env.CLOUDFLARE_ENDPOINT,
    publicUrl: process.env.CLOUDFLARE_PUBLIC_URL
  },
  qualities: {
    low: '64k',
    medium: '128k'
  }
};

// Initialize AWS SDK for R2
const s3 = new AWS.S3({
  endpoint: CONFIG.cloudflare.endpoint,
  accessKeyId: CONFIG.cloudflare.accessKeyId,
  secretAccessKey: CONFIG.cloudflare.secretAccessKey,
  region: CONFIG.cloudflare.region,
  signatureVersion: 'v4'
});

// --- Utility Functions ---

// Check if FFmpeg is available
function checkFFmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

// Get all audio files from directory
function getAudioFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  
  const files = fs.readdirSync(dir);
  return files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg'].includes(ext);
  });
}

// Extract metadata from audio file
async function extractMetadata(filePath) {
  try {
    const metadata = await mm.parseFile(filePath);
    return {
      title: metadata.common.title || path.parse(path.basename(filePath)).name,
      artist: metadata.common.artist || 'Unknown Artist',
      album: metadata.common.album || 'Unknown Album',
      genre: metadata.common.genre ? metadata.common.genre[0] : 'Unknown Genre',
      year: metadata.common.year,
      track: metadata.common.track?.no,
      coverArt: metadata.common.picture?.[0]
    };
  } catch (error) {
    console.log(chalk.yellow(`⚠️  Could not extract metadata from ${path.basename(filePath)}`));
    const fileName = path.parse(path.basename(filePath)).name;
    return {
      title: fileName,
      artist: 'Unknown Artist',
      album: 'Unknown Album',
      genre: 'Unknown Genre',
      coverArt: null
    };
  }
}

// Save cover art to file
async function saveCoverArt(coverArt, fileName) {
  if (!coverArt) return null;
  
  const coverDir = CONFIG.coverArtDir;
  if (!fs.existsSync(coverDir)) {
    fs.mkdirSync(coverDir, { recursive: true });
  }
  
  const coverFileName = `${fileName}_cover.jpg`;
  const coverPath = path.join(coverDir, coverFileName);
  
  try {
    fs.writeFileSync(coverPath, coverArt.data);
    return coverFileName;
  } catch (error) {
    console.log(chalk.yellow(`⚠️  Could not save cover art for ${fileName}`));
    return null;
  }
}

// Convert audio file to multiple qualities
function convertAudio(inputFile, outputBaseName) {
  const inputPath = path.join(CONFIG.inputDir, inputFile);
  const results = {};
  
  Object.entries(CONFIG.qualities).forEach(([qualityName, bitrate]) => {
    const outputFileName = `${outputBaseName}_${qualityName}.mp3`;
    const outputPath = path.join(CONFIG.outputDir, outputFileName);
    
    // Skip if file already exists
    if (fs.existsSync(outputPath)) {
      console.log(chalk.gray(`   ⏭️  ${qualityName} already exists, skipping...`));
      results[qualityName] = { fileName: outputFileName, path: outputPath, skipped: true };
      return;
    }
    
    try {
      const command = `ffmpeg -i "${inputPath}" -b:a ${bitrate} -map_metadata 0 "${outputPath}" -y -loglevel quiet`;
      execSync(command);
      
      const stats = fs.statSync(outputPath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
      
      console.log(chalk.green(`   ✅ ${qualityName}: ${sizeInMB}MB`));
      results[qualityName] = { fileName: outputFileName, path: outputPath, size: sizeInMB };
    } catch (error) {
      console.log(chalk.red(`   ❌ Error creating ${qualityName}: ${error.message}`));
      results[qualityName] = { error: error.message };
    }
  });
  
  return results;
}

// Upload file to Cloudflare R2
async function uploadToR2(filePath, fileName) {
  try {
    const fileContent = fs.readFileSync(filePath);
    const contentType = getContentType(fileName);
    
    const uploadParams = {
      Bucket: CONFIG.cloudflare.bucketName,
      Key: fileName,
      Body: fileContent,
      ContentType: contentType,
      ACL: 'public-read'
    };
    
    console.log(chalk.blue(`   📤 Uploading: ${fileName}`));
    const result = await s3.upload(uploadParams).promise();
    
    const sizeInMB = (fs.statSync(filePath).size / (1024 * 1024)).toFixed(2);
    
    return {
      success: true,
      url: result.Location,
      size: sizeInMB
    };
  } catch (error) {
    console.log(chalk.red(`   ❌ Upload failed for ${fileName}: ${error.message}`));
    return {
      success: false,
      error: error.message
    };
  }
}

// Get content type for file
function getContentType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const contentTypes = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.flac': 'audio/flac',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
    '.ogg': 'audio/ogg',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png'
  };
  return contentTypes[ext] || 'audio/mpeg';
}

// Check if file exists in R2
async function fileExistsInR2(fileName) {
  try {
    await s3.headObject({
      Bucket: CONFIG.cloudflare.bucketName,
      Key: fileName
    }).promise();
    return true;
  } catch (error) {
    if (error.statusCode === 404) {
      return false;
    }
    throw error;
  }
}

// Generate tracks.json
function generateTracksJson(tracks) {
  const tracksData = tracks.map((track, index) => {
    // Pick the best available stream URL: medium > low > high
    let streamUrl = track.qualities.medium?.url || track.qualities.low?.url || track.qualities.high?.url || null;
    return {
      id: index + 1,
      title: track.title,
      artist: track.artist,
      album: track.album,
      genre: track.genre,
      year: track.year,
      track: track.track,
      filename: track.filename,
      coverArt: track.coverArtFileName,
      qualities: {
        low: track.qualities.low?.url,
        medium: track.qualities.medium?.url,
        high: track.qualities.high?.url
      },
      streamUrl, // <-- Add this field
      uploadedAt: new Date().toISOString()
    };
  });
  
  const tracksJson = {
    totalTracks: tracks.length,
    generatedAt: new Date().toISOString(),
    tracks: tracksData
  };
  
  fs.writeFileSync(CONFIG.tracksJson, JSON.stringify(tracksJson, null, 2));
  console.log(chalk.green(`📝 Generated tracks.json with ${tracks.length} tracks`));
}

// --- Main Processing Function ---
async function processAudioFile(audioFile) {
  const fileName = path.parse(audioFile).name;
  console.log(chalk.cyan(`\n🎵 Processing: ${fileName}`));
  
  // Extract metadata
  const inputPath = path.join(CONFIG.inputDir, audioFile);
  const metadata = await extractMetadata(inputPath);
  
  // Save cover art if present
  let coverArtFileName = null;
  if (metadata.coverArt) {
    coverArtFileName = await saveCoverArt(metadata.coverArt, fileName);
  }
  
  // Convert audio
  console.log(chalk.blue('   🔄 Converting audio...'));
  const conversionResults = convertAudio(audioFile, fileName);
  
  // Upload files
  console.log(chalk.blue('   📤 Uploading to Cloudflare R2...'));
  const uploadResults = {};
  
  // Upload audio files
  for (const [quality, result] of Object.entries(conversionResults)) {
    if (result.error) continue;
    
    const exists = await fileExistsInR2(result.fileName);
    if (exists) {
      console.log(chalk.gray(`   ⏭️  ${quality} already exists in R2, skipping...`));
      uploadResults[quality] = {
        url: `${CONFIG.cloudflare.publicUrl}/${result.fileName}`,
        size: result.size,
        skipped: true
      };
    } else {
      const uploadResult = await uploadToR2(result.path, result.fileName);
      if (uploadResult.success) {
        console.log(chalk.green(`   ✅ ${quality} uploaded: ${uploadResult.size}MB`));
        uploadResults[quality] = uploadResult;
      } else {
        console.log(chalk.red(`   ❌ ${quality} upload failed: ${uploadResult.error}`));
        uploadResults[quality] = uploadResult;
      }
    }
  }
  
  // Upload cover art if present
  if (coverArtFileName) {
    const coverPath = path.join(CONFIG.coverArtDir, coverArtFileName);
    const exists = await fileExistsInR2(coverArtFileName);
    
    if (!exists) {
      const coverUploadResult = await uploadToR2(coverPath, coverArtFileName);
      if (coverUploadResult.success) {
        console.log(chalk.green(`   ✅ Cover art uploaded`));
      } else {
        console.log(chalk.red(`   ❌ Cover art upload failed: ${coverUploadResult.error}`));
      }
    } else {
      console.log(chalk.gray(`   ⏭️  Cover art already exists in R2, skipping...`));
    }
  }
  
  return {
    ...metadata,
    filename: fileName,
    coverArtFileName,
    qualities: uploadResults
  };
}

// --- Main Execution ---
async function main() {
  console.log(chalk.cyan('\n🎵 Music Sync Tool Starting...'));
  
  // Check FFmpeg
  if (!checkFFmpeg()) {
    console.log(chalk.red('❌ FFmpeg not found! Please install FFmpeg first.'));
    console.log(chalk.yellow('   Windows: Download from https://ffmpeg.org/download.html'));
    console.log(chalk.yellow('   Mac: brew install ffmpeg'));
    console.log(chalk.yellow('   Linux: sudo apt install ffmpeg'));
    process.exit(1);
  }
  
  // Create directories
  [CONFIG.inputDir, CONFIG.outputDir, CONFIG.coverArtDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(chalk.blue(`📁 Created directory: ${dir}`));
    }
  });
  
  // Check input directory
  const audioFiles = getAudioFiles(CONFIG.inputDir);
  if (audioFiles.length === 0) {
    console.log(chalk.yellow(`❌ No audio files found in ${CONFIG.inputDir}`));
    console.log(chalk.blue(`📁 Please add your music files to: ${CONFIG.inputDir}`));
    return;
  }
  
  console.log(chalk.green(`🚀 Found ${audioFiles.length} audio files to process...`));
  
  // Process all files
  const startTime = Date.now();
  const tracks = [];
  
  for (const audioFile of audioFiles) {
    try {
      const track = await processAudioFile(audioFile);
      tracks.push(track);
    } catch (error) {
      console.log(chalk.red(`❌ Error processing ${audioFile}: ${error.message}`));
    }
  }
  
  // Generate tracks.json
  if (tracks.length > 0) {
    generateTracksJson(tracks);
  }
  
  // Summary
  const endTime = Date.now();
  const totalTime = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log(chalk.green(`\n🎉 All done! Processed ${tracks.length} files in ${totalTime} seconds`));
  console.log(chalk.blue(`📁 Check your converted files in: ${CONFIG.outputDir}`));
  console.log(chalk.blue(`📁 Check your cover art in: ${CONFIG.coverArtDir}`));
  console.log(chalk.blue(`📄 Updated tracks.json for your music player`));
}

main().catch(err => {
  console.error(chalk.red('Fatal error:'), err);
  process.exit(1);
}); 