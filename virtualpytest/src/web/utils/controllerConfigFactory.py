"""
Controller Configuration Factory

This module creates complete controller configurations from basic device registration information.
All communication is via direct device connections (ADB, uhubctl, etc.).
"""

def create_controller_configs_from_device_info(device_model, device_ip, device_port, host_ip, host_port):
    """
    Create complete controller_configs from basic device registration info.
    
    Args:
        device_model: Device model (e.g., 'android_mobile', 'android_tv')
        device_ip: Device IP address
        device_port: Device port (e.g., '5555' for ADB)
        host_ip: Host IP address (for Flask API communication)
        host_port: Host port (for Flask API communication)
    
    Returns:
        dict: Complete controller_configs structure
    """
    
    # Base configuration - all devices get these
    controller_configs = {}
    
    # Configure remote controller based on device model
    if device_model in ['android_mobile', 'real_android_mobile']:
        controller_configs['remote'] = {
            'type': 'android_mobile',
            'implementation': 'real_android_mobile',
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
            'host_ip': host_ip,
            'host_port': host_port,
            'stream_path': '/stream/video',
            'connection_timeout': 15
        }
    }
    
    # Configure verification controller
    if device_model in ['android_mobile', 'android_tv', 'real_android_mobile']:
        # Android devices can use ADB verification
        controller_configs['verification'] = {
            'implementation': 'adb',
            'parameters': {
                'device_ip': device_ip,
                'device_port': device_port,
                'connection_timeout': 10
            }
        }
    else:
        # Other devices use OCR verification
        controller_configs['verification'] = {
            'implementation': 'ocr',
            'parameters': {
                'host_ip': host_ip,
                'host_port': host_port
            }
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
    Get device capabilities based on device model.
    
    Args:
        device_model: Device model string
        
    Returns:
        list: List of capability strings
    """
    
    base_capabilities = ['stream', 'capture']
    
    if device_model in ['android_mobile', 'android_tv', 'real_android_mobile']:
        return base_capabilities + ['remote_control', 'adb_verification', 'power_control']
    elif device_model in ['ir_remote', 'bluetooth_remote']:
        return base_capabilities + ['remote_control', 'power_control']
    else:
        return base_capabilities


def get_controller_types_from_model(device_model):
    """
    Get controller types supported by device model.
    
    Args:
        device_model: Device model string
        
    Returns:
        list: List of controller type strings
    """
    
    # All devices support these basic controller types
    return ['remote', 'av', 'verification', 'power'] 