# Cloudflare R2 Auto Upload Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install aws-sdk
# or
yarn add aws-sdk
```

### 2. Get Your Cloudflare R2 Credentials

#### Step 1: Get Account ID
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. On the right sidebar, copy your **Account ID**

#### Step 2: Create R2 API Token
1. Go to **R2 Object Storage** → **Manage R2 API Tokens**
2. Click **Create API Token**
3. Set permissions: **Object Read & Write**
4. Copy the **Access Key ID** and **Secret Access Key**

#### Step 3: Get Bucket Info
1. Go to your R2 bucket
2. Copy the **Bucket Name**
3. Note your **Custom Domain** (if you have one) or use the R2 URL

### 3. Configure the Script

Edit the `CONFIG` object in the script:

```javascript
const CONFIG = {
  cloudflare: {
    accountId: 'your-account-id-here',
    accessKeyId: 'your-access-key-here',
    secretAccessKey: 'your-secret-key-here',
    bucketName: 'your-bucket-name',
    region: 'auto',
    endpoint: 'https://your-account-id.r2.cloudflarestorage.com'
  },
  
  paths: {
    songsFolder: './songs_to_upload',
    outputFile: './song_links.json',
    appConfigFile: './app_config.js'
  },
  
  publicUrl: 'https://your-custom-domain.com' // or R2 direct URL
};
```

### 4. Usage

#### Upload Songs
1. Put your songs in the `songs_to_upload` folder
2. Run the script:
   ```bash
   node cloudflare-uploader.js
   ```

#### File Naming Convention
For best results, name your files like:
- `Artist Name - Song Title.mp3`
- `John Doe - Amazing Song.mp3`

The script will automatically parse this into artist and title.

### 5. What You Get

The script generates:

#### `song_links.json` - Complete data
```json
{
  "totalFiles": 90,
  "uploaded": 90,
  "songs": [
    {
      "id": 1,
      "title": "Amazing Song",
      "artist": "John Doe",
      "filename": "John Doe - Amazing Song",
      "url": "https://your-domain.com/John%20Doe%20-%20Amazing%20Song.mp3",
      "size": "4.2",
      "uploadedAt": "2025-07-11T10:30:00.000Z"
    }
  ]
}
```

#### `app_config.js` - Ready to use in your app
```javascript
export const SONGS = [
  {
    id: 1,
    title: "Amazing Song",
    artist: "John Doe",
    url: "https://your-domain.com/John%20Doe%20-%20Amazing%20Song.mp3"
  }
];

export const SONG_URLS = {
  "1": "https://your-domain.com/John%20Doe%20-%20Amazing%20Song.mp3"
};
```

## 🔧 Advanced Features

### Multiple Cloud Providers
To use multiple Cloudflare accounts:

```javascript
const providers = [
  {
    name: 'cf1',
    accountId: 'account-1',
    accessKey: 'key-1',
    secretKey: 'secret-1',
    bucketName: 'music-bucket-1'
  },
  {
    name: 'cf2',
    accountId: 'account-2',
    accessKey: 'key-2',
    secretKey: 'secret-2',
    bucketName: 'music-bucket-2'
  }
];
```

### Batch Processing
The script automatically:
- ✅ Skips files that already exist
- ✅ Shows progress for each upload
- ✅ Handles errors gracefully
- ✅ Generates ready-to-use config files
- ✅ Adds small delays to avoid rate limiting

### Integration with Your App

In your Next.js app:

```javascript
// Import the generated config
import { SONGS, SONG_URLS } from './app_config.js';

// Use in your component
const MusicPlayer = () => {
  const [currentSong, setCurrentSong] = useState(0);
  
  const playUrl = SONG_URLS[SONGS[currentSong].id];
  
  return (
    <audio src={playUrl} controls />
  );
};
```

## 🎯 Pro Tips

1. **Test with 5 songs first** before uploading all 90
2. **Keep your original files** - don't delete them
3. **Run the script periodically** to upload new songs
4. **Use consistent naming** for better metadata parsing
5. **Check your R2 usage** to monitor bandwidth

## 🚨 Important Notes

- The script uses **public-read** ACL, so files are publicly accessible
- Files are uploaded with proper content types for audio
- The script adds 1-second delays between uploads to be nice to Cloudflare
- Existing files are automatically skipped to save bandwidth

## 🆘 Troubleshooting

### "Access Denied" Error
- Check your API token permissions
- Ensure your Account ID is correct
- Verify bucket name spelling

### "Connection Failed" Error
- Check your internet connection
- Verify endpoint URL format
- Ensure credentials are not expired

### "File Already Exists" Warning
- This is normal - the script skips existing files
- Delete from R2 if you want to re-upload

## 📊 Cost Calculation

For 90 songs × 5MB each = 450MB:
- **Storage**: $0.015 per GB/month = ~$0.007/month
- **Upload**: Free (Class A operations)
- **Download**: 10GB free per month
- **Total**: Essentially free for your usage!

---

🎉 **You're all set!** Just drop your songs in the folder and run the script. No more manual uploads or copy-pasting links!