"""
Verification Controllers Package

This package contains all verification and validation implementations.
Each controller provides different methods for verifying device states and content.

Available Controllers:
- MockVerificationController: Mock implementation for testing
- TextVerificationController: OCR-based text verification using Tesseract
- ImageVerificationController: Template matching-based image verification using OpenCV
- VideoVerificationController: Motion detection and video content verification
- AudioVerificationController: Audio level and sound verification
"""

from .mock import MockVerificationController
from .text import TextVerificationController
from .image import ImageVerificationController
from .video import VideoVerificationController
from .audio import AudioVerificationController

__all__ = [
    'MockVerificationController',
    'TextVerificationController', 
    'ImageVerificationController',
    'VideoVerificationController',
    'AudioVerificationController'
]
