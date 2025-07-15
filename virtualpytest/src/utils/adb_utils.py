"""
ADB Utilities for Android Device Control

This module provides utilities for controlling Android devices via ADB commands.
Uses direct ADB commands without SSH dependencies.
"""

import subprocess
import time
import re
import base64
import xml.etree.ElementTree as ET
from typing import Dict, Any, List, Optional, Tuple


class AndroidElement:
    """Represents an Android UI element from UI dump."""
    
    def __init__(self, element_id: int, tag: str, text: str, resource_id: str, 
                 content_desc: str, class_name: str, bounds: str, clickable: bool = False, enabled: bool = True):
        self.id = element_id
        self.tag = tag
        self.text = text
        self.resource_id = resource_id
        self.content_desc = content_desc
        self.class_name = class_name
        self.bounds = bounds
        self.clickable = clickable
        self.enabled = enabled
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert element to dictionary for JSON serialization."""
        return {
            'id': self.id,
            'tag': self.tag,
            'text': self.text,
            'resource_id': self.resource_id,
            'content_desc': self.content_desc,
            'class_name': self.class_name,
            'bounds': self.bounds,
            'clickable': self.clickable,
            'enabled': self.enabled
        }


class AndroidApp:
    """Represents an Android application."""
    
    def __init__(self, package_name: str, label: str):
        self.package_name = package_name
        self.label = label
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert app to dictionary for JSON serialization."""
        return {
            'package_name': self.package_name,
            'label': self.label
        }


class ADBUtils:
    """ADB utilities for Android device control using direct ADB commands."""
    
    # ADB key mappings (supporting both simple and DPAD formats)
    ADB_KEYS = {
        # Simple directional keys
        'UP': 'KEYCODE_DPAD_UP',
        'DOWN': 'KEYCODE_DPAD_DOWN',
        'LEFT': 'KEYCODE_DPAD_LEFT',
        'RIGHT': 'KEYCODE_DPAD_RIGHT',
        'SELECT': 'KEYCODE_DPAD_CENTER',
        
        # DPAD format (for Android TV remote compatibility)
        'DPAD_UP': 'KEYCODE_DPAD_UP',
        'DPAD_DOWN': 'KEYCODE_DPAD_DOWN',
        'DPAD_LEFT': 'KEYCODE_DPAD_LEFT',
        'DPAD_RIGHT': 'KEYCODE_DPAD_RIGHT',
        'DPAD_CENTER': 'KEYCODE_DPAD_CENTER',
        
        # System keys
        'BACK': 'KEYCODE_BACK',
        'HOME': 'KEYCODE_HOME',
        'MENU': 'KEYCODE_MENU',
        'POWER': 'KEYCODE_POWER',
        
        # Volume keys
        'VOLUME_UP': 'KEYCODE_VOLUME_UP',
        'VOLUME_DOWN': 'KEYCODE_VOLUME_DOWN',
        'VOLUME_MUTE': 'KEYCODE_VOLUME_MUTE',
        
        # Phone specific keys
        'CAMERA': 'KEYCODE_CAMERA',
        'CALL': 'KEYCODE_CALL',
        'ENDCALL': 'KEYCODE_ENDCALL',
        
        # TV/Media specific keys
        'MEDIA_PLAY_PAUSE': 'KEYCODE_MEDIA_PLAY_PAUSE',
        'MEDIA_PLAY': 'KEYCODE_MEDIA_PLAY',
        'MEDIA_PAUSE': 'KEYCODE_MEDIA_PAUSE',
        'MEDIA_STOP': 'KEYCODE_MEDIA_STOP',
        'MEDIA_REWIND': 'KEYCODE_MEDIA_REWIND',
        'MEDIA_FAST_FORWARD': 'KEYCODE_MEDIA_FAST_FORWARD',
        'MEDIA_NEXT': 'KEYCODE_MEDIA_NEXT',
        'MEDIA_PREVIOUS': 'KEYCODE_MEDIA_PREVIOUS',
    }
    
    def __init__(self):
        """
        Initialize ADB utilities.
        """
        
    def execute_command(self, command: str, timeout: int = 30) -> Tuple[bool, str, str, int]:
        """
        Execute a command using subprocess.
        
        Args:
            command: Command to execute
            timeout: Command timeout in seconds
            
        Returns:
            Tuple of (success, stdout, stderr, exit_code)
        """
        try:
            print(f"[@lib:adbUtils:execute_command] Executing: {command}")
            
            result = subprocess.run(
                command.split(),
                capture_output=True,
                text=True,
                timeout=timeout
            )
            
            success = result.returncode == 0
            stdout = result.stdout.strip()
            stderr = result.stderr.strip()
            exit_code = result.returncode
            
            if success:
                print(f"[@lib:adbUtils:execute_command] Command successful")
            else:
                print(f"[@lib:adbUtils:execute_command] Command failed with exit code {exit_code}: {stderr}")
            
            return success, stdout, stderr, exit_code
            
        except subprocess.TimeoutExpired:
            print(f"[@lib:adbUtils:execute_command] Command timed out: {command}")
            return False, "", "Command timed out", -1
        except Exception as e:
            print(f"[@lib:adbUtils:execute_command] Command error: {str(e)}")
            return False, "", str(e), -1
    
    def download_file(self, remote_path: str, local_path: str) -> Tuple[bool, str]:
        """
        Download a file from remote path to local path.
        Since we're using direct ADB, this is just a file copy.
        
        Args:
            remote_path: Source file path
            local_path: Destination file path
            
        Returns:
            Tuple of (success, error_message)
        """
        try:
            import shutil
            shutil.copy2(remote_path, local_path)
            return True, ""
        except Exception as e:
            return False, str(e)
        
    def connect_device(self, device_id: str) -> bool:
        """
        Connect to ADB device.
        
        Args:
            device_id: Android device ID (IP:port)
            
        Returns:
            bool: True if connection successful
        """
        try:
            print(f"[@lib:adbUtils:connect_device] Connecting to ADB device: {device_id}")
            
            # Connect to ADB device
            success, stdout, stderr, exit_code = self.execute_command(f"adb connect {device_id}")
            
            if not success or exit_code != 0:
                print(f"[@lib:adbUtils:connect_device] ADB connect failed: {stderr}")
                return False
                
            print(f"[@lib:adbUtils:connect_device] ADB connect output: {stdout.strip()}")
            
            # Verify device is connected
            success, stdout, stderr, exit_code = self.execute_command("adb devices")
            
            if not success or exit_code != 0:
                print(f"[@lib:adbUtils:connect_device] Failed to verify device connection")
                return False
                
            # Check if device appears in devices list
            device_lines = [line.strip() for line in stdout.split('\n') 
                          if line.strip() and not line.startswith('List of devices')]
            
            device_found = None
            for line in device_lines:
                if device_id in line:
                    device_found = line
                    break
                    
            if not device_found:
                print(f"[@lib:adbUtils:connect_device] Device {device_id} not found in adb devices list")
                return False
                
            if 'offline' in device_found:
                print(f"[@lib:adbUtils:connect_device] Device {device_id} is offline")
                return False
                
            if 'device' not in device_found:
                status = device_found.split('\t')[1] if '\t' in device_found else 'unknown'
                print(f"[@lib:adbUtils:connect_device] Device {device_id} status: {status}")
                return False
                
            print(f"[@lib:adbUtils:connect_device] Successfully connected to device {device_id}")
            return True
            
        except Exception as e:
            print(f"[@lib:adbUtils:connect_device] Error: {e}")
            return False
            
    def execute_key_command(self, device_id: str, key: str) -> bool:
        """
        Execute ADB key command.
        
        Args:
            device_id: Android device ID
            key: Key name (e.g., 'UP', 'DOWN', 'HOME', 'DPAD_RIGHT', 'KEYCODE_BACK')
            
        Returns:
            bool: True if command successful
        """
        try:
            # Normalize the key - remove 'KEYCODE_' prefix if present
            normalized_key = key.upper()
            if normalized_key.startswith('KEYCODE_'):
                normalized_key = normalized_key.replace('KEYCODE_', '')
            
            print(f"[@lib:adbUtils:execute_key_command] Attempting to execute key: '{key}' (normalized: '{normalized_key}')")
            
            keycode = self.ADB_KEYS.get(normalized_key)
            if not keycode:
                available_keys = list(self.ADB_KEYS.keys())
                print(f"[@lib:adbUtils:execute_key_command] Invalid key: '{key}' (normalized: '{normalized_key}')")
                print(f"[@lib:adbUtils:execute_key_command] Available keys: {', '.join(available_keys[:10])}...")
                print(f"[@lib:adbUtils:execute_key_command] Total available keys: {len(available_keys)}")
                return False
                
            command = f"adb -s {device_id} shell input keyevent {keycode}"
            print(f"[@lib:adbUtils:execute_key_command] Executing: {command}")
            
            success, stdout, stderr, exit_code = self.execute_command(command)
            
            if success and exit_code == 0:
                print(f"[@lib:adbUtils:execute_key_command] Successfully sent keyevent {keycode} for key '{key}'")
                return True
            else:
                print(f"[@lib:adbUtils:execute_key_command] Key command failed: {stderr}")
                return False
                
        except Exception as e:
            print(f"[@lib:adbUtils:execute_key_command] Error: {e}")
            return False
            
    def get_installed_apps(self, device_id: str) -> List[AndroidApp]:
        """
        Get list of installed apps on Android device.
        
        Args:
            device_id: Android device ID
            
        Returns:
            List of AndroidApp objects
        """
        try:
            print(f"[@lib:adbUtils:get_installed_apps] Getting apps for device {device_id}")
            
            # Get list of installed packages (3rd party apps only)
            command = f"adb -s {device_id} shell pm list packages -3"
            success, stdout, stderr, exit_code = self.execute_command(command)
            
            if not success or exit_code != 0:
                print(f"[@lib:adbUtils:get_installed_apps] Failed to get packages list: {stderr}")
                return []
                
            packages = []
            for line in stdout.split('\n'):
                if line.startswith('package:'):
                    package_name = line.replace('package:', '').strip()
                    packages.append(package_name)
                    
            apps = []
            # Get app labels for each package (limit to first 20 for performance)
            for package_name in packages[:20]:
                try:
                    label_command = f"adb -s {device_id} shell dumpsys package {package_name} | grep -A1 'applicationLabel'"
                    success, stdout, stderr, exit_code = self.execute_command(label_command)
                    
                    label = package_name  # Default to package name
                    if success and stdout:
                        match = re.search(r'applicationLabel=(.+)', stdout)
                        if match:
                            label = match.group(1).strip()
                            
                    apps.append(AndroidApp(package_name, label))
                    
                except Exception:
                    # If we can't get the label, use package name
                    apps.append(AndroidApp(package_name, package_name))
                    
            print(f"[@lib:adbUtils:get_installed_apps] Found {len(apps)} apps")
            return apps
            
        except Exception as e:
            print(f"[@lib:adbUtils:get_installed_apps] Error: {e}")
            return []
            
    def launch_app(self, device_id: str, package_name: str) -> bool:
        """
        Launch an app by package name.
        
        Args:
            device_id: Android device ID
            package_name: App package name
            
        Returns:
            bool: True if launch successful
        """
        try:
            print(f"[@lib:adbUtils:launch_app] Launching app {package_name} on device {device_id}")
            
            command = f"adb -s {device_id} shell monkey -p {package_name} -c android.intent.category.LAUNCHER 1"
            success, stdout, stderr, exit_code = self.execute_command(command)
            
            if success and exit_code == 0:
                print(f"[@lib:adbUtils:launch_app] Successfully launched {package_name}")
                return True
            else:
                print(f"[@lib:adbUtils:launch_app] App launch failed: {stderr}")
                return False
                
        except Exception as e:
            print(f"[@lib:adbUtils:launch_app] Error: {e}")
            return False
            
    def close_app(self, device_id: str, package_name: str) -> bool:
        """
        Close/stop an app by package name.
        
        Args:
            device_id: Android device ID
            package_name: App package name to close
            
        Returns:
            bool: True if close successful
        """
        try:
            print(f"[@lib:adbUtils:close_app] Closing app {package_name} on device {device_id}")
            
            command = f"adb -s {device_id} shell am force-stop {package_name}"
            success, stdout, stderr, exit_code = self.execute_command(command)
            
            if success and exit_code == 0:
                print(f"[@lib:adbUtils:close_app] Successfully closed {package_name}")
                return True
            else:
                print(f"[@lib:adbUtils:close_app] App close failed: {stderr}")
                return False
                
        except Exception as e:
            print(f"[@lib:adbUtils:close_app] Error: {e}")
            return False
            
    def kill_app(self, device_id: str, package_name: str) -> bool:
        """
        Kill an app by package name (alias for close_app).
        
        Args:
            device_id: Android device ID
            package_name: App package name to kill
            
        Returns:
            bool: True if kill successful
        """
        return self.close_app(device_id, package_name)
            
    def dump_ui_elements(self, device_id: str) -> Tuple[bool, List[AndroidElement], str]:
        """
        Dump UI elements from Android device (similar to TypeScript version).
        
        Args:
            device_id: Android device ID
            
        Returns:
            Tuple of (success, elements_list, error_message)
        """
        try:
            print(f"[@lib:adbUtils:dump_ui_elements] Dumping UI elements for device {device_id}")
            
            # First, dump the UI hierarchy to a file
            dump_command = f"adb -s {device_id} shell uiautomator dump --compressed /sdcard/ui_dump.xml"
            success, stdout, stderr, exit_code = self.execute_command(dump_command)
            
            if not success or exit_code != 0:
                # Make infrastructure errors more explicit
                if 'timeout' in stderr.lower() or 'connection' in stderr.lower() or 'ssh' in stderr.lower():
                    error_msg = f"Infrastructure failure - Failed to dump UI: {stderr}"
                else:
                    error_msg = f"Failed to dump UI: {stderr}"
                print(f"[@lib:adbUtils:dump_ui_elements] {error_msg}")
                return False, [], error_msg
                
            print(f"[@lib:adbUtils:dump_ui_elements] Dump successful, reading file...")
            
            # Read the dumped file
            read_command = f"adb -s {device_id} shell cat /sdcard/ui_dump.xml"
            success, stdout, stderr, exit_code = self.execute_command(read_command)
            
            if not success or exit_code != 0:
                # Make infrastructure errors more explicit
                if 'timeout' in stderr.lower() or 'connection' in stderr.lower() or 'ssh' in stderr.lower():
                    error_msg = f"Infrastructure failure - Failed to read UI dump: {stderr}"
                else:
                    error_msg = f"Failed to read UI dump: {stderr}"
                print(f"[@lib:adbUtils:dump_ui_elements] {error_msg}")
                return False, [], error_msg
                
            if not stdout or stdout.strip() == "":
                error_msg = "No UI data received from device"
                print(f"[@lib:adbUtils:dump_ui_elements] {error_msg}")
                return False, [], error_msg
                
            print(f"[@lib:adbUtils:dump_ui_elements] Received XML data, length: {len(stdout)}")
            
            # Parse XML to extract elements
            elements = self._parse_ui_elements(stdout)
            
            print(f"[@lib:adbUtils:dump_ui_elements] Processing complete: {len(elements)} useful elements")
            return True, elements, ""
            
        except Exception as e:
            error_msg = f"Error dumping UI elements: {e}"
            print(f"[@lib:adbUtils:dump_ui_elements] {error_msg}")
            return False, [], error_msg
            
    def _parse_ui_elements(self, xml_data: str) -> List[AndroidElement]:
        """
        Parse XML data to extract UI elements.
        
        Args:
            xml_data: XML content from uiautomator dump
            
        Returns:
            List of AndroidElement objects
        """
        elements = []
        
        # Check if we have valid XML
        if '<node' not in xml_data or '</hierarchy>' not in xml_data:
            print(f"[@lib:adbUtils:_parse_ui_elements] Invalid XML format received")
            return elements
            
       
        # Pattern 1: Self-closing nodes
        self_closing_pattern = r'<node[^>]*\/>'
        self_closing_matches = re.findall(self_closing_pattern, xml_data, re.DOTALL)
        print(f"[@lib:adbUtils:_parse_ui_elements] Self-closing nodes found: {len(self_closing_matches)}")
        
        # Pattern 2: Open/close nodes
        open_close_pattern = r'<node[^>]*>.*?<\/node>'
        open_close_matches = re.findall(open_close_pattern, xml_data, re.DOTALL)
        print(f"[@lib:adbUtils:_parse_ui_elements] Open/close nodes found: {len(open_close_matches)}")
        
        # Pattern 3: All nodes (both patterns combined)
        all_nodes_pattern = r'<node[^>]*(?:\/>|>.*?<\/node>)'
        all_matches = re.findall(all_nodes_pattern, xml_data, re.DOTALL)
        print(f"[@lib:adbUtils:_parse_ui_elements] All nodes found: {len(all_matches)}")
        
        # Use the pattern that finds the most nodes (same logic as TypeScript)
        matches = all_matches
        if len(self_closing_matches) > len(all_matches):
            matches = self_closing_matches
            print(f"[@lib:adbUtils:_parse_ui_elements] Using self-closing pattern (found more matches)")
        
        print(f"[@lib:adbUtils:_parse_ui_elements] Selected {len(matches)} total node elements for processing")
            
        element_counter = 0
        filtered_out_count = 0
        
        for i, match in enumerate(matches):
            try:
                # Extract attributes using regex
                def get_attr(attr_name: str) -> str:
                    pattern = f'{attr_name}="([^"]*)"'
                    attr_match = re.search(pattern, match)
                    return attr_match.group(1) if attr_match else ''
                
                text = get_attr('text').strip()
                resource_id = get_attr('resource-id')
                content_desc = get_attr('content-desc')
                class_name = get_attr('class')
                bounds = get_attr('bounds')
                clickable = get_attr('clickable') == 'true'
                enabled = get_attr('enabled') == 'true'
                 
                # Apply filtering logic (same as TypeScript version)
                should_filter = False
                filter_reason = ''
                
                # Skip elements with no useful identifiers
                if (not class_name or class_name.lower() == 'none' or class_name == '') and \
                   (not text or text == '') and \
                   (not resource_id or resource_id == 'null' or resource_id == '') and \
                   (not content_desc or content_desc == ''):
                    should_filter = True
                    filter_reason = 'No useful identifiers (class, text, resource-id, content-desc all empty/null)'
                
                # Skip elements with null resource-id
                if resource_id == 'null':
                    should_filter = True
                    filter_reason = 'Resource-ID is null'
                
                # Skip elements that are not interactive and have no text
                if not clickable and not enabled and (not text or text == ''):
                    should_filter = True
                    filter_reason = 'Not interactive (not clickable, not enabled, no text)'
                
                if should_filter:
                    filtered_out_count += 1
                    if i < 10:
                        print(f"[@lib:adbUtils:_parse_ui_elements]   -> FILTERED OUT: {filter_reason}")
                    continue
                
                element_counter += 1
                element = AndroidElement(
                    element_id=element_counter,
                    tag=class_name or 'unknown',
                    text=text or '<no text>',
                    resource_id=resource_id or '<no resource-id>',
                    content_desc=content_desc or '<no content-desc>',
                    class_name=class_name or '',
                    bounds=bounds or '',
                    clickable=clickable,
                    enabled=enabled
                )
                
                elements.append(element)
                
                if i < 10:
                    print(f"[@lib:adbUtils:_parse_ui_elements]   -> KEPT: Element ID {element_counter}")
                
            except Exception as e:
                print(f"[@lib:adbUtils:_parse_ui_elements] Error parsing element {i+1}: {e}")
                filtered_out_count += 1
        
        print(f"[@lib:adbUtils:_parse_ui_elements] Processing complete:")
        print(f"[@lib:adbUtils:_parse_ui_elements] - Total nodes found: {len(matches)}")
        print(f"[@lib:adbUtils:_parse_ui_elements] - Useful elements: {len(elements)}")
        print(f"[@lib:adbUtils:_parse_ui_elements] - Filtered out: {filtered_out_count}")
        
        # Log all kept elements for debugging (same as TypeScript)
        print(f"[@lib:adbUtils:_parse_ui_elements] Final kept elements (OVERLAY NUMBERS):")
        print(f"[@lib:adbUtils:_parse_ui_elements] ===============================================")
        for index, el in enumerate(elements):
            overlay_number = index + 1
            print(f"[@lib:adbUtils:_parse_ui_elements] {overlay_number}.element{overlay_number} | ID={el.id} | Class={el.tag} | Text=\"{el.text}\" | ResourceID=\"{el.resource_id}\" | ContentDesc=\"{el.content_desc}\" | Bounds={el.bounds}")
        print(f"[@lib:adbUtils:_parse_ui_elements] ===============================================")
        
        return elements
        
    def click_element(self, device_id: str, element: AndroidElement) -> bool:
        """
        Click on a UI element.
        
        Args:
            device_id: Android device ID
            element: AndroidElement to click
            
        Returns:
            bool: True if click successful
        """
        try:
            print(f"[@lib:adbUtils:click_element] Attempting to click element ID={element.id}")
            
            # Parse bounds to get coordinates if available
            coordinates = None
            if element.bounds and element.bounds != '':
                # Bounds format: [x1,y1][x2,y2]
                bounds_match = re.match(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', element.bounds)
                if bounds_match:
                    x1, y1, x2, y2 = map(int, bounds_match.groups())
                    coordinates = {
                        'x': (x1 + x2) // 2,
                        'y': (y1 + y2) // 2
                    }
                    print(f"[@lib:adbUtils:click_element] Calculated tap coordinates: {coordinates['x']}, {coordinates['y']}")
            
            # If we have coordinates from bounds, use direct tap
            if coordinates:
                command = f"adb -s {device_id} shell input tap {coordinates['x']} {coordinates['y']}"
                success, stdout, stderr, exit_code = self.execute_command(command)
                
                if success and exit_code == 0:
                    print(f"[@lib:adbUtils:click_element] Successfully clicked element using coordinates")
                    return True
                else:
                    print(f"[@lib:adbUtils:click_element] Direct tap failed: {stderr}")
            
            # Fallback methods would go here (resource ID, text, content-desc)
            # For now, we'll just return False if direct tap failed
            print(f"[@lib:adbUtils:click_element] All click methods failed for element")
            return False
            
        except Exception as e:
            print(f"[@lib:adbUtils:click_element] Error: {e}")
            return False
            
    def get_device_resolution(self, device_id: str) -> Optional[Dict[str, int]]:
        """
        Get device screen resolution.
        
        Args:
            device_id: Android device ID
            
        Returns:
            Dictionary with width and height, or None if failed
        """
        try:
            print(f"[@lib:adbUtils:get_device_resolution] Getting resolution for device {device_id}")
            
            command = f"adb -s {device_id} shell wm size"
            success, stdout, stderr, exit_code = self.execute_command(command)
            
            if not success or exit_code != 0:
                print(f"[@lib:adbUtils:get_device_resolution] Command failed: {stderr}")
                return None
                
            # Parse output like "Physical size: 1080x2340"
            match = re.search(r'(\d+)x(\d+)', stdout)
            if not match:
                print(f"[@lib:adbUtils:get_device_resolution] Could not parse screen resolution")
                return None
                
            width = int(match.group(1))
            height = int(match.group(2))
            
            print(f"[@lib:adbUtils:get_device_resolution] Device resolution: {width}x{height}")
            return {'width': width, 'height': height}
            
        except Exception as e:
            print(f"[@lib:adbUtils:get_device_resolution] Error: {e}")
            return None
            
    def take_screenshot(self, device_id: str) -> Tuple[bool, str, str]:
        """
        Take a screenshot of the Android device.
        
        Args:
            device_id: Android device ID
            
        Returns:
            Tuple of (success, base64_screenshot_data, error_message)
        """
        try:
            print(f"[@lib:adbUtils:take_screenshot] Taking screenshot for device {device_id}")
            
            # Take screenshot and save to device
            screenshot_path = "/sdcard/screenshot.png"
            screenshot_command = f"adb -s {device_id} shell screencap -p {screenshot_path}"
            
            success, stdout, stderr, exit_code = self.execute_command(screenshot_command, timeout=30)
            
            if not success or exit_code != 0:
                error_msg = f"Failed to take screenshot: {stderr}"
                print(f"[@lib:adbUtils:take_screenshot] {error_msg}")
                return False, "", error_msg
                
            print(f"[@lib:adbUtils:take_screenshot] Screenshot saved to device at {screenshot_path}")
            
            # Pull screenshot to SSH host
            remote_temp_path = "/tmp/android_screenshot.png"
            pull_command = f"adb -s {device_id} pull {screenshot_path} {remote_temp_path}"
            success, stdout, stderr, exit_code = self.execute_command(pull_command, timeout=30)
            
            if not success or exit_code != 0:
                error_msg = f"Failed to pull screenshot: {stderr}"
                print(f"[@lib:adbUtils:take_screenshot] {error_msg}")
                return False, "", error_msg
                
            print(f"[@lib:adbUtils:take_screenshot] Screenshot pulled to SSH host at {remote_temp_path}")
            
            # Download the file from SSH host to our local server
            import tempfile
            import os
            
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as temp_file:
                local_temp_path = temp_file.name
                
            try:
                success, error_msg = self.download_file(remote_temp_path, local_temp_path)
                
                if not success:
                    print(f"[@lib:adbUtils:take_screenshot] Failed to download file: {error_msg}")
                    return False, "", error_msg
                    
                print(f"[@lib:adbUtils:take_screenshot] Screenshot downloaded to local server at {local_temp_path}")
                
                # Now do base64 encoding locally on our server (much more reliable)
                with open(local_temp_path, 'rb') as f:
                    screenshot_data = base64.b64encode(f.read()).decode('utf-8')
                    
                print(f"[@lib:adbUtils:take_screenshot] Screenshot encoded locally, data length: {len(screenshot_data)}")
                
            finally:
                # Clean up local temp file
                try:
                    os.unlink(local_temp_path)
                except:
                    pass
            
            # Clean up files on remote hosts
            cleanup_commands = [
                f"adb -s {device_id} shell rm {screenshot_path}",  # Remove from device
                f"rm -f {remote_temp_path}"  # Remove from SSH host
            ]
            
            for cleanup_cmd in cleanup_commands:
                self.execute_command(cleanup_cmd)  # Don't check result, it's cleanup
            
            return True, screenshot_data, ""
            
        except Exception as e:
            error_msg = f"Screenshot error: {e}"
            print(f"[@lib:adbUtils:take_screenshot] {error_msg}")
            return False, "", error_msg 

    def smart_element_search(self, device_id: str, search_term: str, **options) -> Tuple[bool, List[Dict[str, Any]], str]:
        """
        Smart element search that looks for search_term (case-insensitive) in ANY attribute.
        
        Args:
            device_id: Android device ID
            search_term: The term to search for (case-insensitive)
            **options: Additional options (timeout, check_interval, etc.)
        
        Returns:
            Tuple of (success, list_of_matches, error_message)
            
            Each match contains:
            {
                "element_id": int,
                "matched_attribute": str,
                "matched_value": str, 
                "match_reason": str,
                "search_term": str,
                "case_match": str,
                "all_matches": list,
                "full_element": dict
            }
        """
        try:
            print(f"[@lib:adbUtils:smart_element_search] Smart searching for '{search_term}' on device {device_id}")
            
            # Get all UI elements
            dump_success, elements, dump_error = self.dump_ui_elements(device_id)
            
            if not dump_success:
                # Make infrastructure failures more explicit in smart search
                if 'infrastructure failure' in dump_error.lower() or 'timeout' in dump_error.lower() or 'connection' in dump_error.lower():
                    error_msg = f"Infrastructure failure - Cannot search elements: {dump_error}"
                else:
                    error_msg = f"Failed to dump UI elements: {dump_error}"
                print(f"[@lib:adbUtils:smart_element_search] {error_msg}")
                return False, [], error_msg
            
            # Convert search term to lowercase for case-insensitive comparison
            search_lower = search_term.lower()
            matches = []
            
            print(f"[@lib:adbUtils:smart_element_search] Searching {len(elements)} elements for '{search_term}' (case-insensitive)")
            
            for element in elements:
                # Check each attribute for matches
                element_matches = []
                
                # Check text attribute
                if element.text and search_lower in element.text.lower():
                    element_matches.append({
                        "attribute": "text",
                        "value": element.text,
                        "reason": f"Contains '{search_term}' in text"
                    })
                
                # Check content_desc attribute  
                if element.content_desc and search_lower in element.content_desc.lower():
                    element_matches.append({
                        "attribute": "content_desc", 
                        "value": element.content_desc,
                        "reason": f"Contains '{search_term}' in content description"
                    })
                
                # Check resource_id attribute
                if element.resource_id and search_lower in element.resource_id.lower():
                    element_matches.append({
                        "attribute": "resource_id",
                        "value": element.resource_id, 
                        "reason": f"Contains '{search_term}' in resource ID"
                    })
                
                # Check class_name attribute
                if element.class_name and search_lower in element.class_name.lower():
                    element_matches.append({
                        "attribute": "class_name",
                        "value": element.class_name,
                        "reason": f"Contains '{search_term}' in class name"
                    })
                
                # If any matches found for this element, add to results
                if element_matches:
                    # Use the first/best match for primary result
                    primary_match = element_matches[0]
                    
                    # Determine case match description
                    case_match = "Exact case match" if search_term in primary_match["value"] else f"Different case: searched '{search_term}', found '{primary_match['value']}'"
                    
                    match_info = {
                        "element_id": element.id,
                        "matched_attribute": primary_match["attribute"],
                        "matched_value": primary_match["value"],
                        "match_reason": f"{primary_match['reason']} (case-insensitive)",
                        "search_term": search_term,
                        "case_match": case_match,
                        "all_matches": element_matches,  # Include all matching attributes
                        "full_element": element.to_dict()
                    }
                    
                    matches.append(match_info)
                    
                    print(f"[@lib:adbUtils:smart_element_search] Match found - Element {element.id}: {primary_match['reason']}")
            
            success = len(matches) > 0
            if success:
                print(f"[@lib:adbUtils:smart_element_search] SUCCESS: Found {len(matches)} matching elements")
            else:
                print(f"[@lib:adbUtils:smart_element_search] No elements found matching '{search_term}'")
            
            return success, matches, ""
            
        except Exception as e:
            error_msg = f"Smart element search failed: {e}"
            print(f"[@lib:adbUtils:smart_element_search] ERROR: {error_msg}")
            return False, [], error_msg

    def check_element_exists(self, device_id: str, search_term: str, **options) -> Tuple[bool, Optional[AndroidElement], str]:
        """
        Check if an element exists using smart search. Supports pipe-separated terms for fallback (e.g., "OK|Accept|Confirm").
        
        Args:
            device_id: Android device ID
            search_term: The term to search for (case-insensitive, searches all attributes)
                        Can use pipe-separated terms: "text1|text2|text3"
            **options: Additional options (timeout, check_interval, etc.)
        
        Returns:
            Tuple of (exists, element_data_if_found, error_message)
        """
        try:
            # Check if we have pipe-separated terms
            if '|' in search_term:
                terms = [term.strip() for term in search_term.split('|') if term.strip()]
                print(f"[@lib:adbUtils:check_element_exists] Checking {len(terms)} terms: {terms}")
                
                for i, term in enumerate(terms):
                    print(f"[@lib:adbUtils:check_element_exists] Attempt {i+1}/{len(terms)}: Searching for '{term}'")
                    
                    success, matches, error = self.smart_element_search(device_id, term)
                    
                    if success and matches:
                        # Return the first match as AndroidElement
                        first_match = matches[0]
                        element_dict = first_match["full_element"]
                        
                        element = AndroidElement(
                            element_id=element_dict['id'],
                            tag=element_dict.get('tag', ''),
                            text=element_dict['text'],
                            resource_id=element_dict['resource_id'],
                            content_desc=element_dict['content_desc'], 
                            class_name=element_dict['class_name'],
                            bounds=element_dict['bounds'],
                            clickable=element_dict['clickable'],
                            enabled=element_dict['enabled']
                        )
                        
                        print(f"[@lib:adbUtils:check_element_exists] Found element using term '{term}': ID={element.id}")
                        return True, element, ""
                
                print(f"[@lib:adbUtils:check_element_exists] No matches found for any term in: {search_term}")
                return False, None, ""
            else:
                # Single term - original logic
                print(f"[@lib:adbUtils:check_element_exists] Smart searching for '{search_term}' on device {device_id}")
                
                success, matches, error = self.smart_element_search(device_id, search_term)
                
                if not success:
                    return False, None, error
                
                if matches:
                    # Return the first match as AndroidElement
                    first_match = matches[0]
                    element_dict = first_match["full_element"]
                    
                    # Create AndroidElement from dict
                    element = AndroidElement(
                        element_id=element_dict['id'],
                        tag=element_dict.get('tag', ''),
                        text=element_dict['text'],
                        resource_id=element_dict['resource_id'],
                        content_desc=element_dict['content_desc'], 
                        class_name=element_dict['class_name'],
                        bounds=element_dict['bounds'],
                        clickable=element_dict['clickable'],
                        enabled=element_dict['enabled']
                    )
                    
                    print(f"[@lib:adbUtils:check_element_exists] Found element: ID={element.id}")
                    return True, element, ""
                else:
                    print(f"[@lib:adbUtils:check_element_exists] No matches found")
                    return False, None, ""
            
        except Exception as e:
            error_msg = f"Element existence check failed: {e}"
            print(f"[@lib:adbUtils:check_element_exists] ERROR: {error_msg}")
            return False, None, error_msg

    def click_element_by_search(self, device_id: str, search_term: str, **options) -> bool:
        """
        Click on an element using search term. Supports pipe-separated terms for fallback (e.g., "OK|Accept|Confirm").
        
        Args:
            device_id: Android device ID
            search_term: Search term (case-insensitive, searches all attributes)
                        Can use pipe-separated terms: "text1|text2|text3"
            **options: Additional options
            
        Returns:
            bool: True if click successful
        """
        try:
            print(f"[@lib:adbUtils:click_element_by_search] Attempting to click using search term: '{search_term}'")
            
            # Check if element exists (handles pipe-separated terms automatically)
            exists, element, error = self.check_element_exists(device_id, search_term)
            
            if exists and element:
                print(f"[@lib:adbUtils:click_element_by_search] Found element, attempting click")
                return self.click_element(device_id, element)
            else:
                print(f"[@lib:adbUtils:click_element_by_search] No element found: {error}")
                return False
                
        except Exception as e:
            print(f"[@lib:adbUtils:click_element_by_search] Error: {e}")
            return False

    def input_text(self, device_id: str, search_term: str, text_to_input: str, **options) -> bool:
        """
        Input text into an element. Supports pipe-separated terms for fallback (e.g., "Username|Email|Login").
        
        Args:
            device_id: Android device ID
            search_term: Search term (case-insensitive, searches all attributes)
                        Can use pipe-separated terms: "text1|text2|text3"
            text_to_input: Text to input into the found element
            **options: Additional options
            
        Returns:
            bool: True if input successful
        """
        try:
            print(f"[@lib:adbUtils:input_text] Looking for input field using search term: '{search_term}'")
            print(f"[@lib:adbUtils:input_text] Text to input: '{text_to_input}'")
            
            # Check if element exists (handles pipe-separated terms automatically)
            exists, element, error = self.check_element_exists(device_id, search_term)
            
            if exists and element:
                print(f"[@lib:adbUtils:input_text] Found input field, attempting to click and input text")
                
                # First click on the element to focus it
                click_success = self.click_element(device_id, element)
                
                if click_success:
                    # Small delay after click
                    time.sleep(0.5)
                    
                    # Clear existing text first
                    clear_command = f"adb -s {device_id} shell input keyevent KEYCODE_CTRL_A"
                    self.execute_command(clear_command)
                    time.sleep(0.2)
                    
                    clear_command = f"adb -s {device_id} shell input keyevent KEYCODE_DEL"
                    self.execute_command(clear_command)
                    time.sleep(0.2)
                    
                    # Input the text
                    # Escape special characters for shell
                    escaped_text = text_to_input.replace('"', '\\"').replace("'", "\\'").replace(' ', '\\ ')
                    input_command = f"adb -s {device_id} shell input text \"{escaped_text}\""
                    
                    success, stdout, stderr, exit_code = self.execute_command(input_command)
                    
                    if success and exit_code == 0:
                        print(f"[@lib:adbUtils:input_text] SUCCESS: Input text completed")
                        return True
                    else:
                        print(f"[@lib:adbUtils:input_text] Text input failed: {stderr}")
                        return False
                else:
                    print(f"[@lib:adbUtils:input_text] Element found but click failed")
                    return False
            else:
                print(f"[@lib:adbUtils:input_text] No input field found: {error}")
                return False
                
        except Exception as e:
            print(f"[@lib:adbUtils:input_text] Error: {e}")
            return False

    def tap_coordinates(self, device_id: str, x: int, y: int) -> bool:
        """
        Tap at specific coordinates on the device screen.
        
        Args:
            device_id: Android device ID
            x: X coordinate
            y: Y coordinate
            
        Returns:
            bool: True if tap successful
        """
        try:
            command = f"adb -s {device_id} shell input tap {x} {y}"
            success, stdout, stderr, exit_code = self.execute_command(command)
            
            if success and exit_code == 0:
                print(f"[@lib:adbUtils:tap_coordinates] Successfully tapped at ({x}, {y})")
                return True
            else:
                print(f"[@lib:adbUtils:tap_coordinates] Tap failed: {stderr}")
                return False
                
        except Exception as e:
            print(f"[@lib:adbUtils:tap_coordinates] Error: {e}")
            return False 