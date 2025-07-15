import { NextRequest, NextResponse } from 'next/server';
import AWS from 'aws-sdk';

// Configure AWS SDK for Cloudflare R2
const s3 = new AWS.S3({
  endpoint: process.env.CLOUDFLARE_ENDPOINT,
  accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID,
  secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
  region: 'auto',
  signatureVersion: 'v4'
});

export async function GET(request: NextRequest) {
  try {
    // List all objects in the bucket
    const listObjectsParams = {
      Bucket: process.env.CLOUDFLARE_BUCKET_NAME!,
      MaxKeys: 1000 // Adjust as needed
    };

    const result = await s3.listObjectsV2(listObjectsParams).promise();
    
    if (!result.Contents) {
      return NextResponse.json({ tracks: [] });
    }

    // Filter for audio files and format the response
    const audioExtensions = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg'];
    
    const tracks = result.Contents
      .filter(obj => {
        if (!obj.Key) return false;
        const ext = obj.Key.toLowerCase().split('.').pop();
        return audioExtensions.some(audioExt => audioExt.includes(ext || ''));
      })
      .map((obj, index) => {
        const filename = obj.Key!;
        const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
        
        // Try to parse artist and title from filename
        // Expected format: "Artist - Title" or "Artist - Title - Album"
        const parts = nameWithoutExt.split(' - ');
        const artist = parts.length > 1 ? parts[0] : 'Unknown Artist';
        const title = parts.length > 1 ? parts.slice(1).join(' - ') : nameWithoutExt;
        
        return {
          id: index + 1,
          title: title,
          artist: artist,
          filename: filename,
          src: `/api/stream/${encodeURIComponent(filename)}`,
          size: obj.Size ? Math.round(obj.Size / (1024 * 1024) * 100) / 100 : 0, // Size in MB
          uploadedAt: obj.LastModified?.toISOString()
        };
      })
      .sort((a, b) => a.title.localeCompare(b.title)); // Sort alphabetically by title

    return NextResponse.json({
      totalFiles: tracks.length,
      tracks: tracks
    });

  } catch (error) {
    console.error('Error listing tracks:', error);
    return NextResponse.json(
      { error: 'Failed to list tracks' }, 
      { status: 500 }
    );
  }
} 