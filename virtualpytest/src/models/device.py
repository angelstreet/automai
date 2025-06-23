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
    
    def __init__(self, device_id: str, name: str, model: str, device_ip: str = None, device_port: str = None):
        """
        Initialize a device.
        
        Args:
            device_id: Device identifier (e.g., 'device1', 'device2')
            name: Device name from environment (e.g., 'EOSv1_PROD_Test2')
            model: Device model from environment (e.g., 'stb')
            device_ip: Device IP address
            device_port: Device port
        """
        self.device_id = device_id
        self.name = name
        self.model = model
        self.device_ip = device_ip
        self.device_port = device_port
        
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
        Convert device to dictionary for serialization.
        
        Returns:
            Dictionary representation of the device
        """
        # Get concrete controller implementations
        controller_implementations = []
        for controllers in self._controllers.values():
            for controller in controllers:
                controller_implementations.append(type(controller).__name__)
        
        return {
            'device_id': self.device_id,
            'device_name': self.name,
            'device_model': self.model,
            'device_ip': self.device_ip,
            'device_port': self.device_port,
            'capabilities': self.get_capabilities(),  # Abstract types: ['av', 'remote', 'verification']
            'controller_types': controller_implementations  # Concrete classes: ['HDMIStreamController', 'AndroidMobileRemoteController', ...]
        } 