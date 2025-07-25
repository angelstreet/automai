"""
Desktop Controllers Package

This package contains all desktop automation controller implementations.
Each controller provides desktop automation functionality for different platforms and shells.

Available Controllers:
- BashDesktopController: Bash command execution on Linux/Unix hosts via SSH
- PyAutoGUIDesktopController: PyAutoGUI cross-platform GUI automation (Windows/Linux/ARM)
"""

from .bash import BashDesktopController
from .pyautogui import PyAutoGUIDesktopController

__all__ = [
    'BashDesktopController',
    'PyAutoGUIDesktopController'
] 