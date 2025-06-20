"""
Controller Configuration Factory

This module creates complete controller configurations from basic device registration information.
All communication is via direct device connections (ADB, uhubctl, etc.).
"""

# Device Model to Verification Controllers Mapping
# This matches the mapping in Controller_Types.ts
DEVICE_MODEL_VERIFICATION_MAPPING = {
    'android_mobile': ['image', 'text', 'adb'],
    'android_tv': ['image', 'text'],
    'ios_phone': ['image', 'text'],
    'stb': ['image', 'text'],
}

def create_controller_configs_from_device_info(device_model, device_ip, device_port, host_url, host_port):
    """
    Create complete controller_configs from basic device registration info.
    
    Args:
        device_model: Device model (e.g., 'android_mobile', 'android_tv')
        device_ip: Device IP address
        device_port: Device port (e.g., '5555' for ADB)
        host_url: Host base URL (e.g., 'https://virtualpytest.com' or 'http://localhost:6109')
        host_port: Host port (for Flask API communication)
    
    Returns:
        dict: Complete controller_configs structure
    """
    
    # Base configuration - all devices get these
    controller_configs = {}
    
    # Configure remote controller based on device model
    if device_model in ['android_mobile', 'android_mobile']:
        controller_configs['remote'] = {
            'type': 'android_mobile',
            'implementation': 'android_mobile',
            'parameters': {
                'device_ip': device_ip,
                'device_port': device_port,
                'connection_timeout': 10
            }
        }
    elif device_model == 'android_tv':
        controller_configs['remote'] = {
            'type': 'android_tv',
            'implementation': 'android_tv', 
            'parameters': {
                'device_ip': device_ip,
                'device_port': device_port,
                'connection_timeout': 10
            }
        }
    elif device_model == 'ios_mobile':
        controller_configs['remote'] = {
            'type': 'appium_remote',
            'implementation': 'appium_remote',
            'parameters': {
                'device_udid': device_ip,  # For iOS, device_ip should contain the UDID
                'platform_name': 'iOS',
                'platform_version': '',  # Optional, can be configured later
                'appium_url': 'http://localhost:4723',
                'automation_name': 'XCUITest',
                'connection_timeout': 10
            }
        }
    elif device_model == 'ir_remote':
        controller_configs['remote'] = {
            'type': 'ir_remote',
            'implementation': 'ir_remote',
            'parameters': {
                'device_path': '/dev/lirc0',
                'protocol': 'NEC',
                'frequency': 38000
            }
        }
    elif device_model == 'bluetooth_remote':
        controller_configs['remote'] = {
            'type': 'bluetooth_remote',
            'implementation': 'bluetooth_remote',
            'parameters': {
                'device_address': '00:11:22:33:44:55',  # Default - should be configured per device
                'connection_timeout': 30
            }
        }
    
    # Configure AV controller - most devices use HDMI stream
    controller_configs['av'] = {
        'implementation': 'hdmi_stream',
        'parameters': {
            'video_device': '/dev/video0',
            'resolution': '1920x1080',
            'fps': 30,
            'stream_path': '/stream/video',
            'service_name': 'stream'  # Correct systemd service name
        }
    }
    
    # Configure verification controllers based on device model mapping
    verification_types = DEVICE_MODEL_VERIFICATION_MAPPING.get(device_model, ['text'])  # Default to text verification
    
    for verification_type in verification_types:
        controller_key = f'verification_{verification_type}'
        
        if verification_type == 'adb':
            # ADB verification needs device connection parameters
            controller_configs[controller_key] = {
                'implementation': 'adb',
                'parameters': {
                    'device_ip': device_ip,
                    'device_port': device_port,
                    'connection_timeout': 10
                }
            }
        else:
            # Other verification types (image, audio, text, video) work with AV controller
            controller_configs[controller_key] = {
                'implementation': verification_type,
                'parameters': {}
            }
    
    # Configure power controller - most use USB hub control
    controller_configs['power'] = {
        'implementation': 'usb',
        'parameters': {
            'hub_location': '1-1',  # Default USB hub location
            'port_number': 1,       # Default port number
        }
    }
    
    return controller_configs


def get_device_capabilities_from_model(device_model):
    """
    Get device capabilities based on device model by checking actual controller configs.
    
    Args:
        device_model: Device model string
        
    Returns:
        list: List of actual controller names that exist
    """
    
    # Get the actual controller configs for this device model
    controller_configs = create_controller_configs_from_device_info(
        device_model=device_model,
        device_ip='0.0.0.0',  # Placeholder for capability detection
        device_port='0000',   # Placeholder for capability detection
        host_url='http://localhost:0000',    # Placeholder for capability detection
        host_port='0000'      # Placeholder for capability detection
    )
    
    # Return the actual controller names that exist
    return list(controller_configs.keys())


def get_controller_types_from_model(device_model):
    """
    Get specific controller implementation types supported by device model.
    
    Args:
        device_model: Device model string
        
    Returns:
        list: List of specific implementation type strings (e.g., ['android_mobile', 'hdmi_stream', 'adb', 'usb'])
    """
    
    # Get the actual controller configs for this device model
    controller_configs = create_controller_configs_from_device_info(
        device_model=device_model,
        device_ip='0.0.0.0',  # Placeholder for capability detection
        device_port='0000',   # Placeholder for capability detection
        host_url='http://localhost:0000',    # Placeholder for capability detection
        host_port='0000'      # Placeholder for capability detection
    )
    
    # Extract the specific implementation types from each controller config
    implementation_types = []
    for controller_type, config in controller_configs.items():
        implementation = config.get('implementation')
        if implementation:
            implementation_types.append(implementation)
    
    return implementation_types 