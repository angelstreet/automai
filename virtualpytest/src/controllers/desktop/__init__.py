"""
Desktop Controllers Package

This package contains all desktop automation controller implementations.
Each controller provides desktop automation functionality for different platforms and shells.

Available Controllers:
- BashDesktopController: Bash command execution on Linux/Unix hosts via SSH
"""

from .bash import BashDesktopController

__all__ = [
    'BashDesktopController'
] 