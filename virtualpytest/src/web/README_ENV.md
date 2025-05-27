# Environment Variables for VirtualPyTest Remote Controllers

This document explains the environment variables you can set in your `.env.local` file to prefill connection forms for easier testing.

## Android TV and Android Mobile Remotes

Both Android TV and Android Mobile remotes use the same environment variables since they both use SSH+ADB connections:

```bash
# SSH Host Connection
HOST_IP=192.168.1.100          # IP address of the SSH host
HOST_USERNAME=root             # SSH username
HOST_PASSWORD=your_password    # SSH password
HOST_PORT=22                   # SSH port (default: 22)

# Android Device (TV or Mobile)
DEVICE_IP=192.168.1.101        # IP address of the Android device
DEVICE_PORT=5555               # ADB port (default: 5555)
```

## HDMI Stream Remote

The HDMI Stream remote uses SSH connection variables plus a stream path variable. It uses the same SSH connection infrastructure as Android controllers:

```bash
# SSH Host Connection (same as Android controllers)
HOST_IP=192.168.1.100          # IP address of the SSH host
HOST_USERNAME=root             # SSH username
HOST_PASSWORD=your_password    # SSH password
HOST_PORT=22                   # SSH port (default: 22)

# HDMI Stream Specific
STREAM_PATH=/var/www/html/stream/output.m3u8  # Path to the .m3u8 stream file on the host
```

## How It Works

1. **Android Controllers**: Connect via SSH to the host, then use ADB to control Android devices
2. **HDMI Stream Controller**: Connects via SSH to verify stream file accessibility for testing purposes

All controllers use the same SSH connection library (`sshUtils`) for consistent and reliable connections.

## Usage

1. Create a `.env.local` file in the `src/web/` directory
2. Add the appropriate environment variables for your setup
3. The connection forms will be automatically prefilled when you open the modals
4. Test the connections to ensure they work before using in automated tests

## Example .env.local file

```bash
# SSH Host Connection (shared by Android TV, Mobile, and HDMI Stream)
HOST_IP=192.168.1.100
HOST_USERNAME=root
HOST_PASSWORD=your_ssh_password
HOST_PORT=22

# Android Device Connection (can be TV or Mobile device)
DEVICE_IP=192.168.1.101
DEVICE_PORT=5555

# HDMI Stream Path (for HDMI Stream Viewer)
STREAM_PATH=/home/user/streams/output.m3u8
```

## Notes

- Android TV, Android Mobile, and HDMI Stream all share the same SSH connection environment variables (`HOST_IP`, `HOST_USERNAME`, `HOST_PASSWORD`, `HOST_PORT`)
- Android remotes additionally use `DEVICE_IP` and `DEVICE_PORT` for ADB connections
- HDMI Stream additionally uses `STREAM_PATH` for the location of the stream file on the remote server
- You can use the same SSH host to connect to different services by changing the specific variables (`DEVICE_IP` for Android devices, `STREAM_PATH` for HDMI streams)
- This makes testing much easier as you don't need to manually enter the connection details every time you open the remote control modals 