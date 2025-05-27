# VirtualPyTest Controller Web Interface

This document explains how to use the VirtualPyTest Controller web interface to manage and configure controllers for testing.

## Overview

The VirtualPyTest Controller System provides a web interface to:
- View available controller types and implementations
- Create and configure controller instances
- Test controller functionality
- Manage device controller sets

## Accessing the Interface

1. **Start the Backend Server**:
   ```bash
   cd /path/to/virtualpytest/src/web
   python app.py
   ```
   The Flask backend will start on `http://localhost:5009`

2. **Start the Frontend Development Server**:
   ```bash
   cd /path/to/virtualpytest/src/web
   npm run dev
   ```
   The React frontend will start on `http://localhost:5173`

3. **Navigate to Controller Configuration**:
   Open your browser and go to: `http://localhost:5173/configuration/controller`

## Available Controller Types

The system supports four main controller types:

### 1. Remote Controllers
Control devices remotely using various protocols:
- **Mock Remote**: Simulated remote for testing
- **IR Remote**: Infrared remote with classic TV/STB buttons (61 keycodes)
- **Bluetooth Remote**: Bluetooth HID remote with alphanumeric support (62 keycodes)
- **Real Android TV (ADB)**: Real Android TV control via ADB
- **Android Mobile (SSH+ADB)**: Real Android mobile control via SSH+ADB
- **Android TV**: Placeholder for Android TV implementation
- **Apple TV**: Placeholder for Apple TV implementation
- **Fire TV**: Placeholder for Fire TV implementation
- **STB EOS/Apollo**: Placeholders for set-top box implementations

### 2. Audio/Video Controllers
Capture and analyze audio/video content:
- **Mock AV**: Simulated audio/video capture
- **HDMI Capture**: HDMI video capture device (placeholder)
- **ADB Capture**: Android Debug Bridge capture (placeholder)
- **Camera Capture**: USB/IP camera capture (placeholder)
- **Network Capture**: Network-based capture (placeholder)

### 3. Verification Controllers
Verify test results and UI states:
- **Mock Verification**: Simulated verification
- **OCR Verification**: Optical Character Recognition (placeholder)
- **Image Verification**: Image matching verification (placeholder)
- **AI Verification**: AI-based verification (placeholder)

### 4. Power Controllers
Manage device power states:
- **Mock Power**: Simulated power management
- **Smart Plug**: Smart plug power control (placeholder)
- **Network Power**: Network-based power management (placeholder)
- **ADB Power**: Android Debug Bridge power (placeholder)
- **IPMI Power**: IPMI power management (placeholder)
- **Wake on LAN**: Wake on LAN power control (placeholder)

## Using the Interface

### Quick Actions

1. **Create Controller**: Create a new controller instance
2. **Test Controller**: Test a controller configuration without creating it
3. **Refresh Types**: Reload available controller types from the backend

### Creating a Controller

1. Click "Create Controller" button
2. Fill in the form:
   - **Controller Name**: Give your controller a descriptive name
   - **Controller Type**: Select from Remote, AV, Verification, or Power
   - **Implementation**: Choose a specific implementation (only available ones are enabled)
3. Click "Create" to instantiate the controller

### Testing a Controller

1. Click "Test Controller" button
2. Select:
   - **Controller Type**: The type of controller to test
   - **Implementation**: The specific implementation to test
3. Click "Run Test" to execute the test
4. View test results including:
   - Connection status
   - Controller capabilities
   - Supported keys/functions
   - Test-specific results (e.g., key press tests for remotes)

### Viewing Controller Details

The interface displays:
- **Controller Types Overview**: Summary cards showing available implementations
- **Detailed Controller Lists**: Expandable sections with full implementation details
- **Status Indicators**: 
  - ✅ Green: Available and ready to use
  - ⚪ Gray: Placeholder/planned implementation

## API Endpoints

The web interface communicates with these backend endpoints:

### GET `/api/virtualpytest/controller-types`
Returns all available controller types and implementations with metadata.

### POST `/api/virtualpytest/controllers`
Creates a new controller instance.

**Request Body**:
```json
{
  "name": "My Controller",
  "controller_type": "remote",
  "implementation": "ir_remote",
  "parameters": {}
}
```

### POST `/api/virtualpytest/controllers/test`
Tests a controller configuration.

**Request Body**:
```json
{
  "controller_type": "remote",
  "implementation": "bluetooth_remote",
  "parameters": {}
}
```

### POST `/api/virtualpytest/device-sets`
Creates a complete device controller set.

**Request Body**:
```json
{
  "device_name": "Living Room TV",
  "device_type": "android_tv",
  "overrides": {
    "remote_type": "ir_remote"
  }
}
```

## Example Usage

### Testing an IR Remote Controller

1. Navigate to the Controller Configuration page
2. Click "Test Controller"
3. Select:
   - Controller Type: "Remote Control"
   - Implementation: "IR Remote"
4. Click "Run Test"
5. View results showing:
   - Connection: ✅ Success
   - 61 supported keys (UP, DOWN, POWER, etc.)
   - Key press test: ✅ Success
   - Text input test: ✅ Success

### Testing a Bluetooth Remote Controller

1. Click "Test Controller"
2. Select:
   - Controller Type: "Remote Control" 
   - Implementation: "Bluetooth Remote"
3. Click "Run Test"
4. View results showing:
   - Connection: ✅ Success
   - 62 supported keys (including A-Z letters)
   - Bluetooth pairing: ✅ Success
   - HID profile: keyboard

## Controller Capabilities

### IR Remote Controller
- **Protocol**: NEC (configurable)
- **Frequency**: 38kHz (configurable)
- **Keys**: 61 predefined keycodes
- **Features**: Navigation, media control, volume, channels, color buttons
- **Use Cases**: Classic TVs, STBs, legacy devices

### Bluetooth Remote Controller  
- **Protocol**: Bluetooth HID
- **Profile**: Keyboard (configurable)
- **Keys**: 62 keycodes including full alphabet
- **Features**: Wireless pairing, text input, media control
- **Use Cases**: Smart TVs, modern devices, text input

### Android Controllers
- **Real Android TV**: Direct ADB connection
- **Android Mobile**: SSH + ADB connection with UI automation
- **Features**: App launching, UI interaction, screenshot capture

## Troubleshooting

### Backend Connection Issues
- Ensure Flask server is running on port 5009
- Check that VirtualPyTest controllers are properly imported
- Verify paramiko is installed for SSH functionality

### Frontend Issues
- Ensure React dev server is running on port 5173
- Check browser console for JavaScript errors
- Verify API endpoints are accessible

### Controller Test Failures
- Mock controllers should always pass tests
- Real hardware controllers may fail if hardware is not connected
- Check controller-specific requirements (e.g., ADB for Android devices)

## Development

### Adding New Controller Types
1. Implement the controller class in the VirtualPyTest system
2. Register it in the `CONTROLLER_REGISTRY`
3. Add metadata in the Flask app's `controller_metadata` dictionary
4. The web interface will automatically detect and display the new controller

### Extending the Web Interface
- Frontend: React with Material-UI components
- Backend: Flask with CORS enabled
- State Management: React hooks and local state
- API Communication: Fetch API with JSON

## Next Steps

1. **Persistent Controller Storage**: Store created controllers in database
2. **Real Hardware Integration**: Connect to actual IR transmitters and Bluetooth adapters
3. **Controller Monitoring**: Real-time status monitoring of active controllers
4. **Batch Operations**: Create and test multiple controllers simultaneously
5. **Configuration Profiles**: Save and load controller configurations 