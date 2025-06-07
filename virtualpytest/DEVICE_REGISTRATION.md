# Device Registration Environment Variables

## Summary of Changes

The host registration system now properly reads device information from environment variables instead of hardcoding values.

## Required Environment Variables

### Host Information (Required)
- `SERVER_IP` - IP address of the server (e.g., 192.168.1.67)
- `HOST_NAME` - Name of this host (e.g., sunri-pi1)
- `HOST_IP` - IP address of this host
- `DEVICE_MODEL` - Model of the device this host controls (e.g., android_mobile, android_tv, firetv)

### Optional Environment Variables
- `DEVICE_NAME` - Human-readable name for the device (auto-generated if not provided)
- `DEVICE_IP` - IP address of the device (defaults to HOST_IP if not provided)
- `DEVICE_PORT` - Port for device communication (defaults to 5555 for ADB)

### Other Optional Variables
- `SERVER_PORT` - Server port (defaults to 5009)
- `SERVER_PROTOCOL` - Server protocol (defaults to http)
- `HOST_PROTOCOL` - Host protocol (defaults to http)
- `HOST_PORT_INTERNAL` - Internal Flask port (defaults to 5119)
- `HOST_PORT_EXTERNAL` - External communication port (defaults to 5119)
- `HOST_PORT_WEB` - HTTPS/nginx port (defaults to 444)

## Example .env.host file

```bash
# Required variables
SERVER_IP=192.168.1.67
HOST_NAME=sunri-pi1
HOST_IP=192.168.1.67
DEVICE_MODEL=android_mobile

# Optional device variables
DEVICE_NAME="Android Mobile Device"
DEVICE_IP=192.168.1.29
DEVICE_PORT=5555

# Optional host variables
SERVER_PORT=5009
HOST_PORT_INTERNAL=5119
HOST_PORT_EXTERNAL=5119
HOST_PORT_WEB=444
```

## Key Changes

1. **Device Model from Environment**: `DEVICE_MODEL` is now read from environment instead of hardcoded as 'android_mobile'
2. **Device ID is Dynamic**: Device ID is always generated as `{host_id}_device_{device_model}` - not from environment
3. **Device Name Optional**: `DEVICE_NAME` can be set in environment or auto-generated from device model
4. **Device IP/Port Configurable**: `DEVICE_IP` and `DEVICE_PORT` can be set independently of host IP/port

## Supported Device Models

- `android_mobile` - Android mobile devices
- `android_tv` - Android TV devices  
- `firetv` - Amazon Fire TV devices
- `appletv` - Apple TV devices
- `stb_eos` - Set-top box EOS devices
- `linux` - Linux devices
- `windows` - Windows devices
- `stb` - Generic set-top box devices 