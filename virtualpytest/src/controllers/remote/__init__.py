"""
Remote Controllers Package

This package contains all remote control implementations for different device types.
Each controller provides remote control functionality for specific devices or protocols.

Available Controllers:
- MockRemoteController: Mock implementation for testing
- AndroidTVRemoteController: Real SSH+ADB Android TV remote control
- AndroidMobileRemoteController: Real SSH+ADB Android mobile remote control  
- IRRemoteController: Infrared remote control with classic TV/STB buttons
- BluetoothRemoteController: Bluetooth HID remote control
"""

from .mock import MockRemoteController
from .android_tv import AndroidTVRemoteController
from .android_mobile import AndroidMobileRemoteController
from .infrared import IRRemoteController
from .bluetooth import BluetoothRemoteController

__all__ = [
    'MockRemoteController',
    'AndroidTVRemoteController', 
    'AndroidMobileRemoteController',
    'IRRemoteController',
    'BluetoothRemoteController'
]
