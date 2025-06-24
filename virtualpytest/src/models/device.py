"""
Device Model

Represents a single device with its controllers organized by type.
"""

from typing import Dict, List, Optional, Any
from ..controllers.base_controller import BaseController


class Device:
    """
    A device that holds controllers organized by abstract type.
    
    Example usage:
        device = Device("device1", "EOSv1_PROD_Test2", "stb")
        av_controller = device.get_controller('av')
        remote_controller = device.get_controller('remote')
        verification_controllers = device.get_controllers('verification')
    """
    
    def __init__(self, device_id: str, name: str, model: str, device_ip: str = None, device_port: str = None, video_stream_path: str = None, video_capture_path: str = None):
        """
        Initialize a device.
        
        Args:
            device_id: Device identifier (e.g., 'device1', 'device2')
            name: Device name from environment (e.g., 'EOSv1_PROD_Test2')
            model: Device model from environment (e.g., 'stb')
            device_ip: Device IP address
            device_port: Device port
            video_stream_path: Video stream path for URL building (e.g., '/host/stream/capture1')
            video_capture_path: Video capture path for URL building (e.g., '/var/www/html/stream/capture1')
        """
        self.device_id = device_id
        self.name = name
        self.model = model
        self.device_ip = device_ip
        self.device_port = device_port
        
        # Store video paths for URL building purposes
        self.video_stream_path = video_stream_path
        self.video_capture_path = video_capture_path
        
        # Controllers organized by type
        self._controllers: Dict[str, List[BaseController]] = {
            'av': [],
            'remote': [],
            'verification': [],
            'power': [],
            'network': []
        }
        
        # Capabilities derived from controllers
        self._capabilities: List[str] = []
    
    def add_controller(self, controller_type: str, controller: BaseController):
        """
        Add a controller to this device.
        
        Args:
            controller_type: Abstract type ('av', 'remote', 'verification', etc.)
            controller: The controller instance
        """
        if controller_type not in self._controllers:
            self._controllers[controller_type] = []
        
        self._controllers[controller_type].append(controller)
    
    def get_controller(self, controller_type: str) -> Optional[BaseController]:
        """
        Get the first controller of the specified type.
        
        Args:
            controller_type: Abstract type ('av', 'remote', 'verification', etc.)
            
        Returns:
            First controller of the type, or None if not found
        """
        controllers = self._controllers.get(controller_type, [])
        return controllers[0] if controllers else None
    
    def get_controllers(self, controller_type: str) -> List[BaseController]:
        """
        Get all controllers of the specified type.
        
        Args:
            controller_type: Abstract type ('av', 'remote', 'verification', etc.)
            
        Returns:
            List of controllers of the specified type
        """
        return self._controllers.get(controller_type, [])
    
    def has_controller(self, controller_type: str) -> bool:
        """
        Check if device has any controllers of the specified type.
        
        Args:
            controller_type: Abstract type to check
            
        Returns:
            True if device has controllers of this type
        """
        return len(self._controllers.get(controller_type, [])) > 0
    
    def get_capabilities(self) -> List[str]:
        """
        Get all capabilities of this device.
        
        Returns:
            List of abstract capability types (what the device can do)
        """
        # Return abstract types based on which controllers are present
        capabilities = []
        for controller_type, controllers in self._controllers.items():
            if controllers:  # If we have controllers of this type
                capabilities.append(controller_type)
        return capabilities
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert device to dictionary with detailed capabilities for serialization.
        
        Returns:
            Dictionary representation of the device with detailed capability format
        """
        from ..controllers.controller_config_factory import get_device_capabilities
        
        # Get detailed capabilities from factory
        detailed_capabilities = get_device_capabilities(self.model)
        
        print(f"[@device:to_dict] Device {self.name} ({self.model}) detailed capabilities: {detailed_capabilities}")
        
        # Base device information
        device_dict = {
            'device_id': self.device_id,
            'name': self.name,  # Updated field name for consistency
            'model': self.model,  # Updated field name for consistency
            'device_ip': self.device_ip,
            'device_port': self.device_port,
            'capabilities': detailed_capabilities  # New detailed format: {av: 'hdmi_stream', remote: 'android_mobile', verification: ['image', 'text']}
        }
        
        # Include video paths needed for URL building (if available)
        # These are required by buildUrlUtils functions
        if self.video_stream_path:
            device_dict['video_stream_path'] = self.video_stream_path
        if self.video_capture_path:
            device_dict['video_capture_path'] = self.video_capture_path
        
        return device_dict 