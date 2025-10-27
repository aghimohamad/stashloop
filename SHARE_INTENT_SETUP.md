# Share Intent Setup Guide

This guide explains how to set up and test share intent functionality in your FamilyMeds app.

## What's Been Implemented

### 1. Android Share Intent Configuration
- Added `intentFilters` in `app.json` to register the app as a share target for text content
- Your app will now appear in the share menu when users share links from other apps

### 2. iOS Share Extension Support
- Added basic configuration for iOS share extensions
- Added associated domains for deep linking

### 3. Share Intent Handler
- Created `ShareIntentHandler` component that listens for incoming share intents
- Automatically navigates to the add screen with pre-filled content
- Detects content type (video, article, thread) based on URL patterns

### 4. Clipboard Monitor
- Added `ClipboardMonitor` component that detects URLs in clipboard
- Shows a helpful prompt when a URL is detected
- Allows users to quickly use clipboard URLs

### 5. Enhanced Add Screen
- Modified to handle shared content parameters
- Auto-detects content type from shared URLs
- Shows different UI when content is shared vs manually added
- Includes a test button for development

## How to Test

### 🚨 Important: Share Intents Don't Work in Expo Go
Share intents require native app registration and only work in standalone builds, not in Expo Go. Here are the working alternatives for testing:

### Method 1: Clipboard Detection (Works Now!)
1. Open YouTube (or any app) and copy a video URL
2. Switch back to your app and go to the "Add" tab
3. You should see a prompt asking if you want to use the clipboard URL
4. Tap "Use this URL" to auto-fill the form

### Method 2: Manual Share Simulation (Works Now!)
1. Go to the "Add" tab in your app
2. Look for the "📱 Simulate Share Intent" button
3. Tap it and paste any URL to simulate receiving it via share
4. The form will auto-fill with the URL and detect the content type

### Method 3: Development Test Button (Works Now!)
1. Go to the "Add" tab
2. Look for the "🧪 Test Random Share Intent" button (only visible in development)
3. Tap it to simulate receiving random shared content

### Testing Real Share Intents (Production Only)

#### Method 1: Build and Test
1. Build your app for Android:
   ```bash
   npx expo run:android
   ```
2. Open any app with shareable content (YouTube, Twitter, etc.)
3. Tap the share button
4. Look for "FamilyMeds" in the share menu
5. Select it - your app should open with the content pre-filled

#### Method 2: Using ADB (Advanced)
```bash
# Simulate a share intent via ADB
adb shell am start \
  -a android.intent.action.SEND \
  -t text/plain \
  --es android.intent.extra.TEXT "https://www.youtube.com/watch?v=dQw4w9WgXcQ" \
  com.yourcompany.famimeds
```

### Testing on iOS
iOS share extensions require additional setup:
1. Build for iOS: `npx expo run:ios`
2. The current setup provides basic deep linking support
3. For full iOS share extension support, you may need to create a native share extension

## Content Type Detection

The app automatically detects content types based on URL patterns:

- **Video**: YouTube, Vimeo, TikTok, Instagram Reels
- **Thread**: Twitter/X, Threads, Reddit
- **Article**: Everything else (default)

## Files Modified/Created

### New Files:
- `components/share-intent-handler.tsx` - Handles incoming share intents
- `components/clipboard-monitor.tsx` - Monitors clipboard for URLs
- `lib/share-intent.ts` - Share intent utility functions
- `hooks/use-share-intent.ts` - React hook for share intent handling

### Modified Files:
- `app.json` - Added intent filters and iOS configuration
- `app/_layout.tsx` - Added ShareIntentHandler component
- `app/(tabs)/add.tsx` - Enhanced to handle shared content
- `package.json` - Added clipboard and intent launcher packages

## Troubleshooting

### Android Share Intent Not Working
1. Make sure you've built the app (not just using Expo Go)
2. Check that the intent filters in `app.json` are correct
3. Verify the app is installed on the device
4. Try clearing the app's data and reinstalling

### Clipboard Detection Not Working
1. Ensure you've granted clipboard permissions
2. Check that the URL format is valid (starts with http:// or https://)
3. Try copying the URL again

### iOS Share Extension Issues
1. iOS share extensions require additional native development
2. Consider using Expo's managed workflow limitations
3. For full iOS support, you may need to eject to bare workflow

## Next Steps

### For Production:
1. Remove the test button (it's already wrapped in `__DEV__`)
2. Test thoroughly on physical devices
3. Consider adding analytics to track share intent usage
4. Add error handling for malformed URLs

### Potential Enhancements:
1. Add support for sharing images/files
2. Implement iOS share extension
3. Add batch URL processing
4. Include metadata extraction from shared URLs
5. Add user preferences for auto-save vs manual review

## Security Considerations

- Always validate URLs before processing
- Sanitize shared content to prevent XSS
- Consider rate limiting for shared content
- Implement proper error handling for malicious URLs