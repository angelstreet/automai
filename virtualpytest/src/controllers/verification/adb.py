"""
ADB Verification Controller Implementation

This controller provides ADB-based verification functionality using SSH+ADB.
It can verify the existence of UI elements, text, and other attributes directly 
from the Android device using uiautomator dump and ADB commands.
"""

import time
import xml.etree.ElementTree as ET
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
from ..base_controllers import VerificationControllerInterface
from utils.sshUtils import SSHConnection
from utils.adbUtils import ADBUtils


class ADBVerificationController(VerificationControllerInterface):
    """ADB verification controller that uses SSH+ADB commands to verify UI elements and device state."""
    
    def __init__(self, ssh_connection: SSHConnection, device_id: str, device_name: str = "ADB Device", **kwargs):
        """
        Initialize the ADB Verification controller.
        
        Args:
            ssh_connection: Active SSH connection to the host
            device_id: Android device ID (e.g., "192.168.1.100:5555")
            device_name: Name of the device for logging
            **kwargs: Optional parameters
        """
        if not ssh_connection:
            raise ValueError("ssh_connection is required for ADB verification")
        if not device_id:
            raise ValueError("device_id is required for ADB verification")
            
        super().__init__(device_name)
        
        # SSH and ADB setup
        self.ssh_connection = ssh_connection
        self.device_id = device_id
        self.adb_utils = ADBUtils(ssh_connection)
        
        # Verification state
        self.last_ui_dump = None
        self.last_dump_time = 0
        self.dump_cache_timeout = 2.0  # Cache UI dump for 2 seconds
        
        # Controller is ready if SSH connection is active
        self.is_connected = ssh_connection.connected if ssh_connection else False
        self.verification_session_id = f"adb_verify_{int(time.time())}"
        
        print(f"[@controller:ADBVerification] Initialized for device {device_id}")
        print(f"[@controller:ADBVerification] SSH connection status: {self.is_connected}")

    