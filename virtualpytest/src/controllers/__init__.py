"""
VirtualPyTest Controllers Package

This package contains:
1. Abstract base classes that define controller interfaces
2. Mock controller implementations for testing and demonstration
3. Framework for extending with real device controllers

Usage:
- Inherit from Base* classes to create real implementations
- Use Mock* classes for testing and demonstration
- Use the aliases (RemoteController, etc.) for backward compatibility
"""

# Base abstract classes
from .base_controllers import (
    BaseRemoteController,
    BaseAVController, 
    BaseVerificationController,
    RemoteControllerInterface,
    AVControllerInterface,
    VerificationControllerInterface
)

# Mock implementations
from .remote_controller import (
    MockRemoteController,
    MockAndroidPhone,
    MockAndroidTV,
    MockApplePhone,
    MockAppleTV,
    MockSTB_EOS,
    MockSTB_Apollo
)

from .av_controller import (
    MockAVController,
    MockHDMI_Acquisition,
    MockADB_Acquisition,
    MockCamera_Acquisition
)

from .verification_controller import MockVerificationController

# Backward compatibility aliases
from .remote_controller import RemoteController
from .av_controller import AVController
from .verification_controller import VerificationController

__all__ = [
    # Base classes
    'BaseRemoteController',
    'BaseAVController', 
    'BaseVerificationController',
    'RemoteControllerInterface',
    'AVControllerInterface',
    'VerificationControllerInterface',
    
    # Mock implementations
    'MockRemoteController',
    'MockAVController',
    'MockVerificationController',
    'MockAndroidPhone',
    'MockAndroidTV',
    'MockApplePhone',
    'MockAppleTV',
    'MockSTB_EOS',
    'MockSTB_Apollo',
    'MockHDMI_Acquisition',
    'MockADB_Acquisition',
    'MockCamera_Acquisition',
    
    # Backward compatibility
    'RemoteController',
    'AVController',
    'VerificationController'
]
