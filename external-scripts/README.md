# External Scripts

This directory contains utility scripts for the Mus11c Player project.

## 📁 Scripts Overview

### `sync-env.js`
**Purpose**: Synchronizes environment variables from `env.txt` to `.env`

**Usage**:
```bash
node external-scripts/sync-env.js
```
**Windows**: Double-click `sync-env.bat` in the project root

**What it does**:
- Reads `env.txt` from the project root
- Filters out comments and empty lines
- Writes clean environment variables to `.env`
- Ensures the app uses the latest credentials

**When to use**:
- After updating `env.txt` with new credentials
- When setting up the project for the first time
- When troubleshooting environment variable issues

### `music-sync.js`
**Purpose**: Processes and uploads music files to Cloudflare R2

**Usage**:
```bash
node external-scripts/music-sync.js
```

### `setup-instructions.md`
**Purpose**: Detailed guide for setting up Cloudflare R2 integration

## 🔄 Environment Variables Workflow

This project uses a secure workflow for managing environment variables:

1. **Source**: `env.txt` (visible to AI assistants, contains comments)
2. **Target**: `.env` (used by the app, clean format)
3. **Sync**: `sync-env.js` (copies and filters variables)

**Benefits**:
- ✅ AI assistants can see and update credentials in `env.txt`
- ✅ App uses clean `.env` format
- ✅ Credentials stay secure (`.env` is in `.gitignore`)
- ✅ Automatic filtering of comments and empty lines

**Important**: Always run `sync-env.js` after updating `env.txt`! 