"""
Controller Configuration Factory

Creates controller configurations from device information.
Returns dictionary of controller configs with type, implementation, and parameters.
"""

from typing import Dict, Any


def create_controller_configs_from_device_info(device_config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create controller configurations from device configuration.
    
    Args:
        device_config: Device configuration dictionary
        
    Returns:
        Dictionary with controller configurations for JSON serialization
    """
    print(f"[@controller_factory:create_controller_configs_from_device_info] Creating configs for device: {device_config.get('device_name', 'unknown')}")
    
    device_model = device_config.get('device_model', 'unknown')
    capabilities = get_device_capabilities_from_model(device_model)
    controller_types = get_controller_types_from_model(device_model)
    
    print(f"[@controller_factory:create_controller_configs_from_device_info] Device model: {device_model}")
    print(f"[@controller_factory:create_controller_configs_from_device_info] Capabilities: {capabilities}")
    print(f"[@controller_factory:create_controller_configs_from_device_info] Controller types: {controller_types}")
    
    configs = {}
    
    # AV Controllers
    if 'av' in controller_types:
        if device_model == 'hdmi_capture':
            configs['av'] = {
                'type': 'av',
                'implementation': 'hdmi_stream',
                'params': {
                    'stream_path': device_config.get('stream_path', '/host/stream/capture1'),
                    'capture_path': device_config.get('capture_path', '/var/www/html/stream/capture1')
                }
            }
    
    # Remote Controllers
    if 'remote' in controller_types:
        if device_model == 'android_mobile':
            configs['remote'] = {
                'type': 'remote',
                'implementation': 'android_mobile',
                'params': {
                    'device_ip': device_config.get('device_ip'),
                    'device_port': device_config.get('device_port', 5555)
                }
            }
        elif device_model == 'android_tv':
            configs['remote'] = {
                'type': 'remote',
                'implementation': 'android_tv',
                'params': {
                    'device_ip': device_config.get('device_ip'),
                    'device_port': device_config.get('device_port', 5555)
                }
            }
        elif device_model == 'ios_mobile':
            configs['remote'] = {
                'type': 'remote',
                'implementation': 'appium',
                'params': {
                    'device_ip': device_config.get('device_ip'),
                    'device_port': device_config.get('device_port', 4723),
                    'appium_server_url': device_config.get('appium_server_url')
                }
            }
        elif device_model == 'infrared_remote':
            configs['remote'] = {
                'type': 'remote',
                'implementation': 'infrared',
                'params': {
                    'device_ip': device_config.get('device_ip'),
                    'device_port': device_config.get('device_port', 8080)
                }
            }
        elif device_model == 'bluetooth_remote':
            configs['remote'] = {
                'type': 'remote',
                'implementation': 'bluetooth',
                'params': {
                    'device_mac': device_config.get('device_mac'),
                    'device_ip': device_config.get('device_ip')
                }
            }
    
    # Power Controllers
    if 'power' in controller_types:
        if device_model == 'usb_power':
            configs['power'] = {
                'type': 'power',
                'implementation': 'usb_power',
                'params': {
                    'usb_hub': device_config.get('usb_hub', 1)
                }
            }
    
    # Verification Controllers (require AV controller dependency)
    if 'verification' in controller_types and 'av' in configs:
        # Note: av_controller will be injected at runtime, not in config
        configs['verification'] = {
            'type': 'verification',
            'implementation': 'image',  # Default to image verification
            'params': {}  # av_controller injected at runtime
        }
    
    print(f"[@controller_factory:create_controller_configs_from_device_info] Created {len(configs)} controller configs")
    return configs


def get_device_capabilities_from_model(device_model):
    """Get device capabilities based on device model."""
    capabilities_map = {
        'android_mobile': ['av', 'remote', 'verification'],
        'android_tv': ['av', 'remote', 'verification'],
        'ios_mobile': ['av', 'remote', 'verification'],
        'hdmi_capture': ['av', 'verification'],
        'infrared_remote': ['remote'],
        'bluetooth_remote': ['remote'],
        'usb_power': ['power'],
        'stb': ['av', 'verification']
    }
    return capabilities_map.get(device_model, [])


def get_controller_types_from_model(device_model):
    """Get controller types based on device model."""
    controller_map = {
        'android_mobile': ['av', 'remote', 'verification'],
        'android_tv': ['av', 'remote', 'verification'],
        'ios_mobile': ['av', 'remote', 'verification'],
        'hdmi_capture': ['av', 'verification'],
        'infrared_remote': ['remote'],
        'bluetooth_remote': ['remote'],
        'usb_power': ['power'],
        'stb': ['av', 'verification']
    }
    return controller_map.get(device_model, []) 