"""
Audio/Video Controllers Package

This package contains all audio/video capture and processing implementations.
Each controller provides AV functionality for different capture sources and methods.

Available Controllers:
- MockAVController: Mock implementation for testing
"""

from .mock import MockAVController

__all__ = [
    'MockAVController'
]
