"""
Verification Controllers Package

This package contains all verification and validation implementations.
Each controller provides different methods for verifying device states and content.

Available Controllers:
- TextVerificationController: OCR-based text verification using Tesseract
- ImageVerificationController: Template matching-based image verification using OpenCV
- ADBVerificationController: Direct ADB element verification using SSH+ADB commands
- VideoVerificationController: Motion detection and video content verification
- AudioVerificationController: Audio level and sound verification
"""

from .text import TextVerificationController
from .image import ImageVerificationController
from .adb import ADBVerificationController
from .video import VideoVerificationController
from .audio import AudioVerificationController

__all__ = [
    'TextVerificationController', 
    'ImageVerificationController',
    'ADBVerificationController',
    'VideoVerificationController',
    'AudioVerificationController'
]
