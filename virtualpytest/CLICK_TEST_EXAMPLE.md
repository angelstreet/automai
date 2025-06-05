# StreamViewer Click Test Example

## Quick Test Setup

To test the new click functionality, you can use this simple example:

```typescript
// In your component that uses StreamViewer
<StreamViewer
  streamUrl="https://192.168.1.100:444/stream/output.m3u8"
  isStreamActive={true}
  model="android_mobile"
  
  // Enable click functionality
  enableClick={true}
  deviceResolution={{ width: 1080, height: 2340 }}
  deviceId="192.168.1.100:5555"
  onTap={(x, y) => console.log(`🎯 Tapped at device coordinates: ${x}, ${y}`)}
/>
```

## Visual Feedback You Should See

### 1. **Green Breathing Dot** (Top-Right Corner)
- A small green dot that pulses in the top-right corner
- Indicates the click overlay is active and ready

### 2. **Crosshair Cursor**
- Mouse cursor changes to crosshair when hovering over the stream
- Shows the area is clickable

### 3. **Subtle Hover Effect**
- Very light white overlay appears on hover
- Confirms the overlay is responding to mouse movement

### 4. **Click Animation**
- Green circle animation appears at click location
- Expands and fades out over 0.5 seconds
- Provides immediate visual feedback that click was registered

## Console Logs You Should See

### When Overlay Loads:
```
[@component:StreamViewer] Click overlay status: {enabled: true, streamLoaded: true, ...}
[@component:StreamClickOverlay] 🎯 Click overlay mounted and ready! Device resolution: {width: 1080, height: 2340}
```

### When You Click:
```
[@component:StreamClickOverlay] 🎯 Click at display (245, 156) -> device (523, 334)
[@component:StreamClickOverlay] Sending tap command: 523, 334
[@component:StreamClickOverlay] ✅ Tap successful at (523, 334)
```

### If Click Fails:
```
[@component:StreamClickOverlay] ❌ Tap failed: Device not connected
```

## Troubleshooting

### No Green Dot Visible?
- Check that `enableClick={true}` is set
- Verify `deviceResolution` is provided
- Ensure stream is loaded and playing
- Check console for overlay status logs

### Crosshair Cursor Not Showing?
- Make sure you're hovering over the video area
- Check that the overlay is mounted (look for green dot)
- Verify browser CSS is not overriding cursor

### Clicks Not Working?
- Check browser console for error messages
- Verify the backend API is running
- Ensure Android device is connected via ADB
- Test with a simple UI element first

### Inaccurate Coordinates?
- Double-check the `deviceResolution` values
- Test with known UI elements to calibrate
- Verify the video aspect ratio matches device

## Common Device Resolutions

```typescript
const testResolutions = {
  // Common phone resolutions
  'android_phone': { width: 1080, height: 2340 },
  'pixel_6': { width: 1080, height: 2400 },
  
  // TV/Set-top box resolutions  
  'android_tv': { width: 1920, height: 1080 },
  'fire_tv_stick': { width: 1920, height: 1080 },
  
  // Tablet resolutions
  'android_tablet': { width: 1920, height: 1200 },
};
```

## Test Sequence

1. **Load the stream** - Wait for video to start playing
2. **Look for green dot** - Should appear in top-right corner
3. **Move mouse over stream** - Cursor should change to crosshair
4. **Click anywhere on stream** - Should see green circle animation
5. **Check console logs** - Should see coordinate conversion and API call
6. **Verify on device** - Should see actual tap on Android device

If all steps work, the click-to-tap functionality is properly integrated! 