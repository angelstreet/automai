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

## Usage

1. Create a `.env.local` file in the `automai/virtualpytest/src/web/` directory
2. Add the environment variables you want to use
3. Restart the Flask backend (`python app.py`)
4. Open the Android TV or Android Mobile remote modal - the form fields will be automatically prefilled

## Example .env.local file

```bash
# SSH Host Connection (shared by both Android TV and Mobile)
HOST_IP=192.168.1.100
HOST_USERNAME=root
HOST_PASSWORD=your_ssh_password
HOST_PORT=22

# Android Device Connection (can be TV or Mobile device)
DEVICE_IP=192.168.1.101
DEVICE_PORT=5555
```

## Notes

- Both Android TV and Android Mobile remotes share the same environment variables since they use identical SSH+ADB connection methods
- You can use the same SSH host to connect to different Android devices by changing the `DEVICE_IP` value
- The `DEVICE_IP` can point to either an Android TV or Android Mobile device depending on which remote you're using
- This makes testing much easier as you don't need to manually enter the connection details every time you open the remote control modals 