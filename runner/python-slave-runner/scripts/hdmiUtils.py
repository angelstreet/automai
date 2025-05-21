import cv2
import os
import glob
import subprocess
from datetime import datetime

class HDMIUtils:
    def __init__(self, device_index=None, width=1920, height=1080, trace_folder="traces"):
        """Initialize HDMI capture card as a webcam."""
        self.device_index = device_index
        self.width = width
        self.height = height
        self.trace_folder = trace_folder
        self.cap = None
        self.is_initialized = False
        if device_index is not None:
            self.initialize()

    def initialize(self):
        """Initialize capture card for screenshots."""
        # Check available video devices
        video_devices = glob.glob("/dev/video*")
        if not video_devices:
            print("Error: No video devices found in /dev/video*")
            return False
        
        # Verify device_index exists
        device_path = f"/dev/video{self.device_index}"
        if device_path not in video_devices:
            print(f"Error: Device /dev/video{self.device_index} not found. Available devices: {video_devices}")
            # Try to list device details with v4l2-ctl
            try:
                result = subprocess.run(["v4l2-ctl", "--list-devices"], capture_output=True, text=True)
                print(f"v4l2-ctl --list-devices output:\n{result.stdout}")
            except FileNotFoundError:
                print("v4l2-ctl not found. Install v4l-utils with 'sudo apt install v4l-utils' for device info.")
            except Exception as e:
                print(f"Error running v4l2-ctl: {e}")
            return False

        self.cap = cv2.VideoCapture(self.device_index)
        if not self.cap.isOpened():
            print(f"Error: Could not open capture card at index {self.device_index} (/dev/video{self.device_index})")
            return False

        # Set resolution
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
        self.is_initialized = True
        print(f"Initialized capture card at /dev/video{self.device_index} with resolution {self.width}x{self.height}")
        return True

    def take_screenshot(self, filename=None):
        """Take a screenshot from HDMI and save to trace_folder if HDMI is available."""
        if self.device_index is None or not self.is_initialized:
            return False

        ret, frame = self.cap.read()
        if not ret:
            print("Error: Failed to capture frame")
            return False

        # Ensure trace folder exists
        os.makedirs(self.trace_folder, exist_ok=True)

        # Generate filename if not provided
        if filename is None:
            prefix = "screenshot"
            screenshot_files = glob.glob(os.path.join(self.trace_folder, f"{prefix}_*.png"))
            next_number = max([int(os.path.basename(f).replace(f"{prefix}_", "").replace(".png", "")) for f in screenshot_files] + [0]) + 1
            filename = f"{prefix}_{next_number}.png"

        output_file = os.path.join(self.trace_folder, filename)
        cv2.imwrite(output_file, frame)
        print(f"Saved HDMI screenshot to {output_file}")
        return True

    def release(self):
        """Release capture card resources if HDMI is available."""
        if self.device_index is None:
            return

        if self.cap:
            self.cap.release()
        self.is_initialized = False
        print("Released HDMI capture resources")

    def __del__(self):
        """Cleanup resources on object destruction."""
        self.release()