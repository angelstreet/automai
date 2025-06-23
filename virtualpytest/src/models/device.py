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
    
    def __init__(self, device_id: str, name: str, model: str):
        """
        Initialize a device.
        
        Args:
            device_id: Device identifier (e.g., 'device1', 'device2')
            name: Device name from environment (e.g., 'EOSv1_PROD_Test2')
            model: Device model from environment (e.g., 'stb')
        """
        self.device_id = device_id
        self.name = name
        self.model = model
        
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
        
        # Update capabilities
        if hasattr(controller, 'get_capabilities'):
            capabilities = controller.get_capabilities()
            if isinstance(capabilities, list):
                for cap in capabilities:
                    if cap not in self._capabilities:
                        self._capabilities.append(cap)
            elif isinstance(capabilities, str):
                if capabilities not in self._capabilities:
                    self._capabilities.append(capabilities)
    
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
            List of capability strings
        """
        return self._capabilities.copy()
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert device to dictionary for serialization.
        
        Returns:
            Dictionary representation of the device
        """
        return {
            'device_id': self.device_id,
            'name': self.name,
            'model': self.model,
            'capabilities': self._capabilities,
            'controller_types': list(self._controllers.keys())
        } 