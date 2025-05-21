import cv2
import os
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
        self.cap = cv2.VideoCapture(self.device_index)
        if not self.cap.isOpened():
            print(f"Error: Could not open capture card at index {self.device_index}")
            return False

        # Set resolution
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
        self.is_initialized = True
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
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"screenshot_{timestamp}.png"

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