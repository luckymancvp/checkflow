# Google Drive Integration Refactor

## Overview
Refactored the system to fetch Google Drive files directly using Google Drive API v3 instead of relying on the external proxy service at `https://go.pamoteam.top/ggdrive`.

## Changes Made

### 1. New Google Drive Client (`lib/google-drive-client.ts`)
- Created a new `GoogleDriveClient` class to handle Google Drive API interactions
- Extracts file IDs from various Google Drive URL formats
- Fetches file content using the Drive API v3 (`/files/{fileId}?alt=media`)
- Uses the same access token as Google Sheets (already includes Drive scope)
- Returns blob URLs for image display

### 2. Updated Image Cache Hook (`hooks/use-image-cache.ts`)
- Modified to detect Google Drive URLs instead of pamoteam.top URLs
- Uses `GoogleDriveClient` to fetch files directly from Google Drive API
- Maintains the same preload/cache functionality
- Exports `fetchGoogleDriveFile` for on-demand fetching

### 3. Updated Image Utils (`utils/image-utils.ts`)
- Removed proxy URL transformation
- Returns original URLs - cache system handles Google Drive links automatically

### 4. Updated LazyImage Component (`components/ui/lazy-image.tsx`)
- Added automatic Google Drive URL detection
- Fetches Google Drive files when image comes into view
- Resolves blob URLs for display
- Proper cleanup of blob URLs on unmount
- Shows loading state while fetching from Drive API

### 5. Updated Order Components
- `components/review/order-list-item.tsx`: Removed proxy URL generation
- `components/review/order-review-modal.tsx`: Removed proxy URL generation
- All components now use original URLs

## How It Works

1. **URL Detection**: When an image URL contains "drive.google.com", it's identified as a Google Drive file
2. **Token Reuse**: Uses the same access token from Google Sheets (already has Drive scope)
3. **API Fetch**: Calls Google Drive API v3 to get file content as blob
4. **Blob URL**: Creates object URL from blob for display in `<img>` tags
5. **Caching**: Preloads next order's mockup images for smooth navigation
6. **Cleanup**: Properly revokes blob URLs to prevent memory leaks

## Benefits

1. **No External Dependencies**: Removed reliance on `go.pamoteam.top` proxy service
2. **Direct API Access**: Faster and more reliable file fetching
3. **Token Reuse**: Leverages existing Google OAuth token (includes Drive scope)
4. **Better Error Handling**: Direct control over error states and retries
5. **Consistent Architecture**: All Google API calls now use the same token management

## OAuth Scope

The existing OAuth flow already includes the required scope:
\`\`\`typescript
scope: "openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive"
\`\`\`

No changes needed to authentication flow.

## Testing Checklist

- [ ] Images load correctly in order list
- [ ] Images load correctly in review modal
- [ ] Preload/cache works for next order
- [ ] Blob URLs are cleaned up properly
- [ ] Error states display fallback images
- [ ] Non-Google Drive URLs still work
- [ ] LazyImage intersection observer works
- [ ] Screenshot functionality still works
