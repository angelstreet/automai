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


def create_controller_configs_from_device_info(device_config: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Create controller configurations from device information.
    
    Args:
        device_config: Device configuration with all necessary parameters
        
    Returns:
        List of controller configurations with format:
        [
            {
                'type': 'av',  # Abstract type
                'class': HDMIStreamController,  # Controller class
                'params': {...}  # Constructor parameters
            },
            ...
        ]
    """
    device_id = device_config['device_id']
    model = device_config['model']
    
    print(f"[@controller_config_factory:create_controller_configs_from_device_info] Creating controllers for {device_id} (model: {model})")
    
    if model not in DEVICE_MODEL_CONTROLLERS:
        supported_models = list(DEVICE_MODEL_CONTROLLERS.keys())
        raise ValueError(f"Unsupported device model '{model}'. Supported models: {supported_models}")
    
    controller_configs = []
    model_controllers = DEVICE_MODEL_CONTROLLERS[model]
    
    # Create controllers for each type
    for controller_type, implementations in model_controllers.items():
        for implementation in implementations:
            config = _create_controller_config(controller_type, implementation, device_config)
            if config:
                controller_configs.append(config)
    
    print(f"[@controller_config_factory:create_controller_configs_from_device_info] Created {len(controller_configs)} controllers for {device_id}")
    return controller_configs


def _create_controller_config(controller_type: str, implementation: str, device_config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create a single controller configuration.
    
    Args:
        controller_type: Abstract type ('av', 'remote', 'verification', etc.)
        implementation: Specific implementation ('hdmi_stream', 'android_mobile', etc.)
        device_config: Device configuration
        
    Returns:
        Controller configuration or None if not applicable
    """
    device_id = device_config['device_id']
    
    # AV Controllers
    if controller_type == 'av' and implementation == 'hdmi_stream':
        if 'video' not in device_config:
            return None  # No video device configured
        
        return {
            'type': 'av',
            'class': HDMIStreamController,
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
                'class': AndroidMobileRemoteController,
                'params': {
                    'device_ip': device_config['device_ip'],
                    'device_port': device_config['device_port'],
                    'connection_timeout': 10,
                    'device_id': device_config['device_id'],
                    'device_config': device_config
                }
            }
        
        elif implementation == 'android_tv':
            if 'device_ip' not in device_config or 'device_port' not in device_config:
                return None
            
            return {
                'type': 'remote',
                'class': AndroidTVRemoteController,
                'params': {
                    'device_ip': device_config['device_ip'],
                    'device_port': device_config['device_port'],
                    'connection_timeout': 10,
                    'device_id': device_config['device_id'],
                    'device_config': device_config
                }
            }
        
        elif implementation == 'appium':
            if 'device_ip' not in device_config or 'device_port' not in device_config:
                return None
            
            return {
                'type': 'remote',
                'class': AppiumRemoteController,
                'params': {
                    'device_ip': device_config['device_ip'],
                    'device_port': device_config['device_port'],
                    'platform_name': 'iOS',
                    'appium_url': f"http://{device_config['device_ip']}:4723",
                    'automation_name': 'XCUITest',
                    'connection_timeout': 10,
                    'device_id': device_config['device_id'],
                    'device_config': device_config
                }
            }
        
        elif implementation == 'infrared':
            if 'ir_device' not in device_config:
                return None
            
            return {
                'type': 'remote',
                'class': IRRemoteController,
                'params': {
                    'device_path': device_config['ir_device'],
                    'protocol': 'NEC',
                    'frequency': 38000,
                    'device_id': device_config['device_id'],
                    'device_config': device_config
                }
            }
        
        elif implementation == 'bluetooth':
            if 'bluetooth_device' not in device_config:
                return None
            
            return {
                'type': 'remote',
                'class': BluetoothRemoteController,
                'params': {
                    'device_address': device_config['bluetooth_device'],
                    'device_id': device_config['device_id'],
                    'device_config': device_config
                }
            }
    
    # Verification Controllers
    elif controller_type == 'verification':
        if implementation == 'image':
            return {
                'type': 'verification',
                'class': ImageVerificationController,
                'params': {}
            }
        
        elif implementation == 'text':
            return {
                'type': 'verification',
                'class': TextVerificationController,
                'params': {}
            }
        
        elif implementation == 'audio':
            return {
                'type': 'verification',
                'class': AudioVerificationController,
                'params': {}
            }
        
        elif implementation == 'video':
            return {
                'type': 'verification',
                'class': VideoVerificationController,
                'params': {}
            }
        
        elif implementation == 'adb':
            if 'device_ip' not in device_config or 'device_port' not in device_config:
                return None
            
            return {
                'type': 'verification',
                'class': ADBVerificationController,
                'params': {
                    'device_ip': device_config['device_ip'],
                    'device_port': device_config['device_port'],
                    'connection_timeout': 10
                }
            }
    
    # Power Controllers
    elif controller_type == 'power' and implementation == 'usb':
        if 'power_device' not in device_config:
            return None
        
        return {
            'type': 'power',
            'class': USBPowerController,
            'params': {
                'hub_location': device_config['power_device'],
                'port_number': 1
            }
        }
    
    # Network Controllers
    elif controller_type == 'network' and implementation == 'network':
        return {
            'type': 'network',
            'class': NetworkController,
            'params': {}
        }
    
    return None 