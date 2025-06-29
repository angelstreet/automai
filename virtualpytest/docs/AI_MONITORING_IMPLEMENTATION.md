# AI Monitoring Implementation

## Overview

The AI Monitoring system provides real-time analysis of HDMI captured frames to detect blackscreen, freeze, subtitles, errors, and language identification. This system integrates seamlessly with the existing RecHostStreamModal and uses captured frames from the HDMI controller.

## Architecture

### Components

1. **Frontend Components**

   - `MonitoringPlayer.tsx` - Main player component displaying analyzed frames
   - `MonitoringOverlay.tsx` - Overlay showing AI analysis results
   - `useMonitoring.ts` - React hook managing monitoring state and operations

2. **Backend Routes**

   - `ai_monitoring_routes.py` - Flask routes for frame processing and analysis

3. **Integration**
   - `RecHostStreamModal.tsx` - Modal integration with monitoring mode toggle

## Features

### Detection Capabilities

#### 1. Blackscreen Detection

- **Method**: Pixel intensity analysis
- **Threshold**: Mean intensity < 15 (configurable)
- **Output**: Detection status, confidence level, consecutive frame count

#### 2. Freeze Detection

- **Method**: Frame comparison using structural similarity
- **Threshold**: Similarity > 95% with previous frames
- **Cache**: Keeps last 5 frames for comparison
- **Output**: Detection status, consecutive frame count

#### 3. Subtitle Detection

- **Method**: OCR on bottom 30% of frame
- **Engine**: Tesseract OCR with confidence filtering
- **Min Confidence**: 60% (configurable)
- **Output**: Detected text, truncated display text

#### 4. Error Detection

- **Method**: Pattern matching on OCR text
- **Patterns**: "error", "failed", "timeout", "exception", etc.
- **Scope**: Full frame analysis
- **Output**: Error type, error text

#### 5. Language Identification

- **Method**: Pattern-based detection using common words
- **Languages**: English, French (extensible)
- **Output**: Language code, confidence level

## Usage

### 1. Enable AI Monitoring

1. Open the RecHostStreamModal
2. Take control of the device
3. Click "AI Monitoring" button
4. The system switches from HLS video to processed frame display

### 2. Navigation

- **Play/Pause**: Auto-playback of processed frames
- **Scrubber**: Navigate to specific frames
- **Frame Counter**: Shows current position
- **Status Overlay**: Real-time analysis results

### 3. Frame Management

- **Capacity**: Stores last 180 frames (3 minutes at 1 fps)
- **Processing Rate**: 1 frame per second
- **Auto-cleanup**: Older frames automatically removed

## Technical Implementation

### Frame Processing Pipeline

1. **Frame Capture**: Uses existing HDMI controller captured frames
2. **Frame Detection**: Monitors capture folder for new frames
3. **AI Analysis**: Processes each frame with multiple detection algorithms
4. **Result Storage**: Maintains frame history with analysis results
5. **Display**: Shows processed frames with overlay information

### API Endpoints

#### GET `/server/ai-monitoring/health`

Health check for monitoring service

#### POST `/server/ai-monitoring/get-latest-frames`

```json
{
  "host": {...},
  "device_id": "device1",
  "last_processed_frame": 0
}
```

Returns list of new captured frames since last processed frame.

#### POST `/server/ai-monitoring/analyze-frame`

```json
{
  "frame_path": "/path/to/frame.jpg",
  "frame_number": 123,
  "host": {...},
  "device_id": "device1"
}
```

Analyzes a single frame and returns AI detection results.

### Data Structures

#### MonitoringFrame

```typescript
interface MonitoringFrame {
  frameNumber: number;
  timestamp: number;
  imagePath: string;
  analysis: FrameAnalysis;
  processed: boolean;
}
```

#### FrameAnalysis

```typescript
interface FrameAnalysis {
  status: 'ok' | 'issue' | 'processing' | 'error';
  blackscreen: {
    detected: boolean;
    consecutiveFrames: number;
    confidence: number;
  };
  freeze: {
    detected: boolean;
    consecutiveFrames: number;
  };
  subtitles: {
    detected: boolean;
    text: string;
    truncatedText: string;
  };
  errors: {
    detected: boolean;
    errorType: string;
    errorText: string;
  };
  language: {
    language: string;
    confidence: number;
  };
}
```

## Installation

### Dependencies

Install AI monitoring dependencies:

```bash
pip install -r requirements-ai-monitoring.txt
```

### System Requirements

#### Tesseract OCR

- **Ubuntu/Debian**: `sudo apt-get install tesseract-ocr`
- **macOS**: `brew install tesseract`
- **Windows**: Download from [UB-Mannheim/tesseract](https://github.com/UB-Mannheim/tesseract/wiki)

#### Optional: Coral TPU (Raspberry Pi)

For enhanced performance on Raspberry Pi:

```bash
pip install coral-ai-tpu==2.0.0
```

## Configuration

### Environment Variables

No additional environment variables required. Configuration is handled through constants in `ai_monitoring_routes.py`:

```python
BLACKSCREEN_THRESHOLD = 15  # Pixel intensity threshold
FREEZE_FRAME_THRESHOLD = 0.95  # Similarity threshold
SUBTITLE_MIN_CONFIDENCE = 60  # OCR confidence threshold
MAX_SUBTITLE_DISPLAY_LENGTH = 10  # Display truncation
```

### Performance Tuning

#### Raspberry Pi Optimization

- Processing rate: 1 fps (configurable)
- Frame downscaling: 320x240 for freeze detection
- Subtitle region: Bottom 30% only
- Memory management: Auto-cleanup old frames

## Integration Points

### RecHostStreamModal Integration

- **Mode Toggle**: Switches between HLS video and AI monitoring
- **Control Dependency**: Requires device control to be active
- **Remote Panel**: Auto-shows remote when monitoring is enabled
- **State Management**: Handles monitoring state lifecycle

### HDMI Controller Integration

- **Frame Source**: Uses existing captured frames from `/tmp/captures/`
- **Frame Detection**: Monitors for new frames by timestamp
- **Path Convention**: Expects `frame_XXX.jpg` naming pattern

## Troubleshooting

### Common Issues

1. **No frames detected**

   - Ensure HDMI controller is capturing frames
   - Check capture folder permissions
   - Verify frame naming convention

2. **OCR not working**

   - Install Tesseract OCR binary
   - Check system PATH configuration
   - Verify image quality and resolution

3. **Performance issues**
   - Reduce processing rate
   - Enable frame downscaling
   - Consider hardware acceleration

### Debugging

Enable debug logging:

```python
logging.basicConfig(level=logging.DEBUG)
```

Monitor frame processing:

```bash
tail -f /var/log/virtualpytest/ai-monitoring.log
```

## Future Enhancements

### Planned Features

- **Custom Models**: Support for trained detection models
- **Real-time Alerts**: Notification system for detected issues
- **Historical Analysis**: Long-term trend analysis
- **Export Functionality**: Export analysis results and frames
- **Multi-language Support**: Extended language detection

### Performance Improvements

- **GPU Acceleration**: CUDA support for faster processing
- **Edge Computing**: Optimized models for Raspberry Pi
- **Caching**: Intelligent frame caching strategies
- **Parallel Processing**: Multi-threaded analysis pipeline

## License

This implementation is part of the VirtualPyTest project and follows the same licensing terms.
