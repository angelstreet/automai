"""
VirtualPyTest Controllers Package

This package provides a flexible controller system where each controller type
(Remote, AV, Verification, Power) can be implemented independently for different devices.

The factory system allows you to select specific controller implementations
for each device type, providing maximum flexibility.
"""

from typing import Dict, Any, Optional, Type, Union
from .base_controllers import (
    BaseController,
    RemoteControllerInterface,
    AVControllerInterface,
    VerificationControllerInterface,
    PowerControllerInterface
)

# Import mock implementations
from .audiovideo.hdmi_stream import HDMIStreamController

# Import real implementations
from .remote.android_tv import AndroidTVRemoteController
from .remote.android_mobile import AndroidMobileRemoteController
from .remote.infrared import IRRemoteController
from .remote.bluetooth import BluetoothRemoteController

# Import power implementations
from .power.usb_power import USBPowerController

# Import verification implementations
from .verification.image import ImageVerificationController
from .verification.text import TextVerificationController
from .verification.adb import ADBVerificationController

# Controller type registry
CONTROLLER_REGISTRY = {
    'remote': {
        'android_tv': AndroidTVRemoteController,  # Real SSH+ADB-based Android TV controller
        'android_mobile': AndroidMobileRemoteController,  # Real SSH+ADB-based Android Mobile controller
        'ir_remote': IRRemoteController,     # IR remote with classic TV/STB buttons
        'bluetooth_remote': BluetoothRemoteController,  # Bluetooth HID remote
    },
    'av': {
        'hdmi_stream': HDMIStreamController, # HDMI stream URL controller
    },
    'verification': {
        'ocr': TextVerificationController,   # OCR-based text verification using Tesseract
        'image': ImageVerificationController, # Template matching-based image verification using OpenCV
        'adb': ADBVerificationController,    # Direct ADB element verification using ADBcommands
        'ai': TextVerificationController,    # Use text verification until AI implementation is available
    },
    'power': {
        'usb': USBPowerController,           # USB hub power control via SSH + uhubctl
    }
}


class ControllerFactory:
    """
    Factory class for creating controller instances.
    
    Allows flexible selection of controller implementations based on
    device type and controller type.
    """
    
    @staticmethod
    def create_remote_controller(
        device_type: str = "android_tv",
        device_name: str = "Unknown Device",
        **kwargs
    ) -> RemoteControllerInterface:
        """
        Create a remote controller instance.
        
        Args:
            device_type: Type of device/implementation (mock, android_tv, apple_tv, etc.)
            device_name: Name of the device for logging
            **kwargs: Additional parameters for the controller
        
        Returns:
            RemoteControllerInterface: Controller instance
        """
        controller_class = CONTROLLER_REGISTRY['remote'].get(device_type)
        if not controller_class:
            raise ValueError(f"Unknown remote controller type: {device_type}")
        
        return controller_class(device_name=device_name, device_type=device_type, **kwargs)
    
    @staticmethod
    def create_av_controller(
        capture_type: str = "hdmi_stream",
        device_name: str = "Unknown Device",
        capture_source: str = "HDMI",
        **kwargs
    ) -> AVControllerInterface:
        """
        Create an AV controller instance.
        
        Args:
            capture_type: Type of capture implementation (mock, hdmi, adb, camera, etc.)
            device_name: Name of the device for logging
            capture_source: Source for capture (HDMI, Network, USB, etc.)
            **kwargs: Additional parameters for the controller
        
        Returns:
            AVControllerInterface: Controller instance
        """
        controller_class = CONTROLLER_REGISTRY['av'].get(capture_type)
        if not controller_class:
            raise ValueError(f"Unknown AV controller type: {capture_type}")
        
        return controller_class(device_name=device_name, capture_source=capture_source, **kwargs)
    
    @staticmethod
    def create_verification_controller(
        verification_type: str = "ocr",
        device_name: str = "Unknown Device",
        **kwargs
    ) -> VerificationControllerInterface:
        """
        Create a verification controller instance.
        
        Args:
            verification_type: Type of verification implementation (ocr, image, ai, etc.)
            device_name: Name of the device for logging
            **kwargs: Additional parameters for the controller
        
        Returns:
            VerificationControllerInterface: Controller instance
        """
        controller_class = CONTROLLER_REGISTRY['verification'].get(verification_type)
        if not controller_class:
            raise ValueError(f"Unknown verification controller type: {verification_type}")
        
        return controller_class(device_name=device_name, **kwargs)
    
    @staticmethod
    def create_power_controller(
        power_type: str = "usb",
        device_name: str = "Unknown Device",
        **kwargs
    ) -> PowerControllerInterface:
        """
        Create a power controller instance.
        
        Args:
            power_type: Type of power implementation (mock, smart_plug, network, adb, etc.)
            device_name: Name of the device for logging
            **kwargs: Additional parameters for the controller
        
        Returns:
            PowerControllerInterface: Controller instance
        """
        controller_class = CONTROLLER_REGISTRY['power'].get(power_type)
        if not controller_class:
            raise ValueError(f"Unknown power controller type: {power_type}")
        
        return controller_class(device_name=device_name, power_type=power_type, **kwargs)
    
    @staticmethod
    def register_controller(
        controller_type: str,
        implementation_name: str,
        controller_class: Type[BaseController]
    ) -> None:
        """
        Register a new controller implementation.
        
        Args:
            controller_type: Type of controller (remote, av, verification, power)
            implementation_name: Name for this implementation
            controller_class: Controller class to register
        """
        if controller_type not in CONTROLLER_REGISTRY:
            CONTROLLER_REGISTRY[controller_type] = {}
        
        CONTROLLER_REGISTRY[controller_type][implementation_name] = controller_class
        print(f"Registered {controller_type} controller: {implementation_name}")
    
    @staticmethod
    def list_available_controllers() -> Dict[str, list]:
        """
        List all available controller implementations.
        
        Returns:
            Dict mapping controller types to available implementations
        """
        return {
            controller_type: list(implementations.keys())
            for controller_type, implementations in CONTROLLER_REGISTRY.items()
        }


class DeviceControllerSet:
    """
    Container for a complete set of controllers for a device.
    
    Allows you to configure different controller implementations
    for each controller type on a per-device basis.
    """
    
    def __init__(
        self,
        device_name: str,
        remote_type: str = "android_tv",
        av_type: str = "hdmi_stream", 
        verification_type: str = "ocr",
        power_type: str = "mock",
        **controller_kwargs
    ):
        """
        Initialize a complete controller set for a device.
        
        Args:
            device_name: Name of the device
            remote_type: Type of remote controller to use
            av_type: Type of AV controller to use
            verification_type: Type of verification controller to use
            power_type: Type of power controller to use
            **controller_kwargs: Additional parameters for controllers
        """
        self.device_name = device_name
        
        # Create controllers
        self.remote = ControllerFactory.create_remote_controller(
            device_type=remote_type,
            device_name=device_name,
            **controller_kwargs.get('remote', {})
        )
        
        self.av = ControllerFactory.create_av_controller(
            capture_type=av_type,
            device_name=device_name,
            **controller_kwargs.get('av', {})
        )
        
        self.verification = ControllerFactory.create_verification_controller(
            verification_type=verification_type,
            device_name=device_name,
            **controller_kwargs.get('verification', {})
        )
        
        self.power = ControllerFactory.create_power_controller(
            power_type=power_type,
            device_name=device_name,
            **controller_kwargs.get('power', {})
        )
    
    def connect_all(self) -> bool:
        """Connect all controllers."""
        results = []
        results.append(self.remote.connect())
        results.append(self.av.connect())
        results.append(self.verification.connect())
        results.append(self.power.connect())
        return all(results)
    
    def disconnect_all(self) -> bool:
        """Disconnect all controllers."""
        results = []
        results.append(self.remote.disconnect())
        results.append(self.av.disconnect())
        results.append(self.verification.disconnect())
        results.append(self.power.disconnect())
        return all(results)
    
    def get_status(self) -> Dict[str, Any]:
        """Get status of all controllers."""
        return {
            'device_name': self.device_name,
            'remote': self.remote.get_status(),
            'av': self.av.get_status(),
            'verification': self.verification.get_status(),
            'power': self.power.get_status()
        }


# Convenience functions for backward compatibility
def create_device_controllers(
    device_name: str,
    device_type: str = "android_tv",
    **kwargs
) -> DeviceControllerSet:
    """
    Create a complete set of controllers for a device.
    
    Args:
        device_name: Name of the device
        device_type: Type of device (determines default controller types)
        **kwargs: Override specific controller types
    
    Returns:
        DeviceControllerSet: Complete controller set
    """
    # Default controller mappings for different device types
    device_defaults = {
        'android_tv': {
            'remote_type': 'android_tv',  # ADBAndroid TV controller
            'av_type': 'adb',
            'verification_type': 'ocr',
            'power_type': 'usb',  # USB hub power control via SSH + uhubctl
        },
        'android_mobile': {
            'remote_type': 'android_mobile',  # ADBAndroid mobile controller
            'av_type': 'adb',
            'verification_type': 'ocr',
            'power_type': 'usb',  # USB hub power control via SSH + uhubctl
        },
        'ir_tv': {
            'remote_type': 'ir_remote',
            'av_type': 'hdmi',
            'verification_type': 'image',
            'power_type': 'usb'
        },
        'bluetooth_device': {
            'remote_type': 'bluetooth_remote',
            'av_type': 'hdmi_stream',
            'verification_type': 'ocr',
            'power_type': 'usb'  # USB hub power control via SSH + uhubctl
        }
    }
    
    defaults = device_defaults.get(device_type, device_defaults['android_tv'])
    
    # Override with any provided kwargs
    config = {**defaults, **kwargs}
    
    return DeviceControllerSet(device_name=device_name, **config)


# Export main classes and functions
__all__ = [
    'BaseController',
    'RemoteControllerInterface',
    'AVControllerInterface',
    'VerificationControllerInterface',
    'PowerControllerInterface',
    'ControllerFactory',
    'DeviceControllerSet',
    'create_device_controllers',
    'CONTROLLER_REGISTRY'
]
