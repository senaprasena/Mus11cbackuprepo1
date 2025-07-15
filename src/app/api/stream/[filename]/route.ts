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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const decodedFilename = decodeURIComponent(filename);
    
    // Get the file from R2
    const getObjectParams = {
      Bucket: process.env.CLOUDFLARE_BUCKET_NAME!,
      Key: decodedFilename
    };

    const object = await s3.getObject(getObjectParams).promise();
    
    if (!object.Body) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Determine content type based on file extension
    const getContentType = (filename: string) => {
      const ext = filename.toLowerCase().split('.').pop();
      const contentTypes: { [key: string]: string } = {
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'flac': 'audio/flac',
        'm4a': 'audio/mp4',
        'aac': 'audio/aac',
        'ogg': 'audio/ogg'
      };
      return contentTypes[ext || ''] || 'audio/mpeg';
    };

    // Create response with proper headers for streaming
    const response = new NextResponse(object.Body as any);
    
    response.headers.set('Content-Type', getContentType(decodedFilename));
    response.headers.set('Content-Length', object.ContentLength?.toString() || '0');
    response.headers.set('Accept-Ranges', 'bytes');
    response.headers.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, HEAD');
    response.headers.set('Access-Control-Allow-Headers', 'Range');

    return response;

  } catch (error) {
    console.error('Error streaming file:', error);
    return NextResponse.json(
      { error: 'Failed to stream file' }, 
      { status: 500 }
    );
  }
}

// Handle HEAD requests for range requests
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const decodedFilename = decodeURIComponent(filename);
    
    const headObjectParams = {
      Bucket: process.env.CLOUDFLARE_BUCKET_NAME!,
      Key: decodedFilename
    };

    const object = await s3.headObject(headObjectParams).promise();
    
    const getContentType = (filename: string) => {
      const ext = filename.toLowerCase().split('.').pop();
      const contentTypes: { [key: string]: string } = {
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'flac': 'audio/flac',
        'm4a': 'audio/mp4',
        'aac': 'audio/aac',
        'ogg': 'audio/ogg'
      };
      return contentTypes[ext || ''] || 'audio/mpeg';
    };

    const response = new NextResponse(null, { status: 200 });
    
    response.headers.set('Content-Type', getContentType(decodedFilename));
    response.headers.set('Content-Length', object.ContentLength?.toString() || '0');
    response.headers.set('Accept-Ranges', 'bytes');
    response.headers.set('Cache-Control', 'public, max-age=31536000');
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, HEAD');
    response.headers.set('Access-Control-Allow-Headers', 'Range');

    return response;

  } catch (error) {
    console.error('Error getting file info:', error);
    return NextResponse.json(
      { error: 'File not found' }, 
      { status: 404 }
    );
  }
} 