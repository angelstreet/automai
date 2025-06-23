"""
Controller Configuration Factory

Creates controller configurations from device information.
Returns list of controller configs with type, class, and parameters.
"""

from typing import Dict, List, Any

# Import all controller classes
from .audiovideo.hdmi_stream import HDMIStreamController
from .remote.android_mobile import AndroidMobileRemoteController
from .remote.android_tv import AndroidTVRemoteController
from .remote.appium_remote import AppiumRemoteController
from .remote.infrared import IRRemoteController
from .remote.bluetooth import BluetoothRemoteController
from .verification.image import ImageVerificationController
from .verification.text import TextVerificationController
from .verification.audio import AudioVerificationController
from .verification.video import VideoVerificationController
from .verification.adb import ADBVerificationController
from .power.usb_power import USBPowerController
# from .network.network_controller import NetworkController  # Not implemented yet


# Device Model to Controller Mapping
DEVICE_MODEL_CONTROLLERS = {
    'android_mobile': {
        'remote': ['android_mobile'],
        'verification': ['image', 'text', 'adb'],
        'av': ['hdmi_stream'],
        'power': []
        # 'network': ['network']  # Not implemented yet
    },
    'android_tv': {
        'remote': ['android_tv'],
        'verification': ['image', 'text'],
        'av': ['hdmi_stream'],
        'power': []
        # 'network': ['network']  # Not implemented yet
    },
    'ios_mobile': {
        'remote': ['appium'],
        'verification': ['image', 'text'],
        'av': ['hdmi_stream'],
        'power': []
        # 'network': ['network']  # Not implemented yet
    },
    'stb': {
        'remote': [],
        'verification': ['image',  'text'],
        'av': ['hdmi_stream'],
        'power': []
        # 'network': ['network']  # Not implemented yet
    },
}


def create_controller_configs_from_device_info(device_config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create controller configurations from device information.
    
    Args:
        device_config: Device configuration with all necessary parameters
        
    Returns:
        Dictionary of controller configurations (JSON serializable):
        {
            'av': {
                'type': 'av',
                'implementation': 'hdmi_stream',
                'params': {...}
            },
            'remote': {
                'type': 'remote', 
                'implementation': 'android_mobile',
                'params': {...}
            },
            ...
        }
    """
    device_id = device_config['device_id']
    model = device_config['device_model']
    
    print(f"[@controller_config_factory:create_controller_configs_from_device_info] Creating controllers for {device_id} (model: {model})")
    
    if model not in DEVICE_MODEL_CONTROLLERS:
        supported_models = list(DEVICE_MODEL_CONTROLLERS.keys())
        raise ValueError(f"Unsupported device model '{model}'. Supported models: {supported_models}")
    
    controller_configs = {}
    model_controllers = DEVICE_MODEL_CONTROLLERS[model]
    
    # Create controllers for each type
    for controller_type, implementations in model_controllers.items():
        for implementation in implementations:
            config = _create_serializable_controller_config(controller_type, implementation, device_config)
            if config:
                # Use a unique key for each controller
                key = f"{controller_type}_{implementation}" if len(implementations) > 1 else controller_type
                controller_configs[key] = config
    
    print(f"[@controller_config_factory:create_controller_configs_from_device_info] Created {len(controller_configs)} controllers for {device_id}")
    return controller_configs


def _create_serializable_controller_config(controller_type: str, implementation: str, device_config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create a single controller configuration (JSON serializable).
    
    Args:
        controller_type: Abstract type ('av', 'remote', 'verification', etc.)
        implementation: Specific implementation ('hdmi_stream', 'android_mobile', etc.)
        device_config: Device configuration
        
    Returns:
        Serializable controller configuration or None if not applicable
    """
    device_id = device_config['device_id']
    
    # AV Controllers
    if controller_type == 'av' and implementation == 'hdmi_stream':
        if 'video' not in device_config:
            return None  # No video device configured
        
        return {
            'type': 'av',
            'implementation': 'hdmi_stream',
            'params': {
                'video_device': device_config['video'],
                'resolution': '1920x1080',
                'fps': 30,
                'stream_path': device_config.get('video_stream_path', '/stream/video'),
                'capture_path': device_config.get('video_capture_path'),
                'service_name': 'stream'
            }
        }
    
    # Remote Controllers
    elif controller_type == 'remote':
        if implementation == 'android_mobile':
            if 'device_ip' not in device_config or 'device_port' not in device_config:
                return None
            
            return {
                'type': 'remote',
                'implementation': 'android_mobile',
                'params': {
                    'device_ip': device_config['device_ip'],
                    'device_port': device_config['device_port'],
                    'connection_timeout': 10,
                    'device_id': device_config['device_id']
                }
            }
        
        elif implementation == 'android_tv':
            if 'device_ip' not in device_config or 'device_port' not in device_config:
                return None
            
            return {
                'type': 'remote',
                'implementation': 'android_tv',
                'params': {
                    'device_ip': device_config['device_ip'],
                    'device_port': device_config['device_port'],
                    'connection_timeout': 10,
                    'device_id': device_config['device_id']
                }
            }
        
        elif implementation == 'appium':
            if 'device_ip' not in device_config or 'device_port' not in device_config:
                return None
            
            return {
                'type': 'remote',
                'implementation': 'appium',
                'params': {
                    'device_ip': device_config['device_ip'],
                    'device_port': device_config['device_port'],
                    'platform_name': 'iOS',
                    'appium_url': f"http://{device_config['device_ip']}:4723",
                    'automation_name': 'XCUITest',
                    'connection_timeout': 10,
                    'device_id': device_config['device_id']
                }
            }
        
        elif implementation == 'infrared':
            if 'ir_device' not in device_config:
                return None
            
            return {
                'type': 'remote',
                'implementation': 'infrared',
                'params': {
                    'device_path': device_config['ir_device'],
                    'protocol': 'NEC',
                    'frequency': 38000,
                    'device_id': device_config['device_id']
                }
            }
        
        elif implementation == 'bluetooth':
            if 'bluetooth_device' not in device_config:
                return None
            
            return {
                'type': 'remote',
                'implementation': 'bluetooth',
                'params': {
                    'device_address': device_config['bluetooth_device'],
                    'device_id': device_config['device_id']
                }
            }
    
    # Verification Controllers
    elif controller_type == 'verification':
        if implementation == 'image':
            return {
                'type': 'verification',
                'implementation': 'image',
                'params': {
                    'device_id': device_id,
                    'similarity_threshold': 0.8
                }
            }
        
        elif implementation == 'text':
            return {
                'type': 'verification',
                'implementation': 'text',
                'params': {
                    'device_id': device_id,
                    'ocr_language': 'eng'
                }
            }
        
        elif implementation == 'audio':
            return {
                'type': 'verification',
                'implementation': 'audio',
                'params': {
                    'device_id': device_id
                }
            }
        
        elif implementation == 'video':
            return {
                'type': 'verification',
                'implementation': 'video',
                'params': {
                    'device_id': device_id
                }
            }
        
        elif implementation == 'adb':
            if 'device_ip' not in device_config or 'device_port' not in device_config:
                return None
            
            return {
                'type': 'verification',
                'implementation': 'adb',
                'params': {
                    'device_ip': device_config['device_ip'],
                    'device_port': device_config['device_port'],
                    'device_id': device_id
                }
            }
    
    # Power Controllers
    elif controller_type == 'power':
        if implementation == 'smart_plug':
            if 'power_device' not in device_config:
                return None
            
            return {
                'type': 'power',
                'implementation': 'smart_plug',
                'params': {
                    'device_address': device_config['power_device'],
                    'device_id': device_id
                }
            }
    
    return None


def get_device_capabilities_from_model(device_model):
    """
    Get device capabilities based on device model by checking actual controller configs.
    
    Args:
        device_model: Device model string
        
    Returns:
        list: List of actual controller types that exist
    """
    
    # Create dummy device config for capability detection
    dummy_device_config = {
        'device_id': 'dummy',
        'device_model': device_model,
        'device_ip': '0.0.0.0',
        'device_port': '0000'
    }
    
    # Get the actual controller configs for this device model
    controller_configs = create_controller_configs_from_device_info(dummy_device_config)
    
    # Return unique controller types
    return list(set([config['type'] for config in controller_configs.values()]))


def get_controller_types_from_model(device_model):
    """
    Get specific controller implementation types supported by device model.
    
    Args:
        device_model: Device model string
        
    Returns:
        list: List of controller implementation names
    """
    
    # Create dummy device config for capability detection
    dummy_device_config = {
        'device_id': 'dummy',
        'device_model': device_model,
        'device_ip': '0.0.0.0',
        'device_port': '0000'
    }
    
    # Get the actual controller configs for this device model
    controller_configs = create_controller_configs_from_device_info(dummy_device_config)
    
    # Return controller implementation names
    return [f"{config['type']}_{config['implementation']}" for config in controller_configs.values()] 