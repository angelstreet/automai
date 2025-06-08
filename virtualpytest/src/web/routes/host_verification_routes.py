def execute_adb_verification_host(verification, source_path, model, verification_index, results_dir):
    """Execute ADB verification using existing ADB utilities."""
    try:
        params = verification.get('params', {})
        command = verification.get('command', '')
        
        # Get element selector from inputValue (where client stores it)
        element_selector = verification.get('inputValue', '') or params.get('text', '')
        timeout = params.get('timeout', 10.0)
        
        print(f"[@route:execute_adb_verification_host] Command: {command}")
        print(f"[@route:execute_adb_verification_host] Element selector: '{element_selector}'")
        print(f"[@route:execute_adb_verification_host] Timeout: {timeout}s")
        print(f"[@route:execute_adb_verification_host] Available params: {list(params.keys())}")
        print(f"[@route:execute_adb_verification_host] Verification keys: {list(verification.keys())}")
        
        if not element_selector:
            return {
                'success': False,
                'error': 'No element selector specified for ADB verification',
                'verification_type': 'adb'
            }
        
        # Import ADB controller
        from controllers.verification.adb import ADBVerificationController
        from utils.sshUtils import SSHConnection
        
        # Create SSH connection (localhost since we're on the host)
        ssh_connection = SSHConnection()
        ssh_connection.connect('localhost', 22, 'root', password='your_password')  # Adjust credentials as needed
        
        # Get device ID from model
        device_id = get_device_id_from_model(model)
        if not device_id:
            return {
                'success': False,
                'error': f'No ADB device configured for model: {model}',
                'verification_type': 'adb'
            }
        
        # Initialize ADB controller
        adb_controller = ADBVerificationController(ssh_connection, device_id, model)
        
        # Execute verification based on command
        if command == 'adb_element_appear':
            success, message, result_data = adb_controller.waitForElementToAppear(element_selector, timeout)
        elif command == 'adb_element_disappear':
            success, message, result_data = adb_controller.waitForElementToDisappear(element_selector, timeout)
        else:
            return {
                'success': False,
                'error': f'Unknown ADB command: {command}',
                'verification_type': 'adb'
            }
        
        # Build comprehensive result
        result = {
            'success': success,
            'message': message,
            'verification_type': 'adb',
            'command': command,
            'element_selector': element_selector,
            'timeout': timeout,
            'device_id': device_id,
            'model': model
        }
        
        # Add result data if available
        if result_data:
            result.update({
                'search_term': result_data.get('search_term'),
                'wait_time': result_data.get('wait_time'),
                'total_matches': result_data.get('total_matches', 0),
                'matches': result_data.get('matches', []),
                'successful_term': result_data.get('successful_term'),
                'attempted_terms': result_data.get('attempted_terms', []),
                'search_details': result_data.get('search_details', {}),
                'timeout_reached': result_data.get('timeout_reached', False),
                'infrastructure_error': result_data.get('infrastructure_error', False)
            })
            
            # Add specific data for disappear verification
            if command == 'adb_element_disappear':
                result.update({
                    'element_still_present': result_data.get('element_still_present', False),
                    'still_present_elements': result_data.get('still_present_elements', []),
                    'total_still_present': result_data.get('total_still_present', 0)
                })
        
        print(f"[@route:execute_adb_verification_host] Verification completed: {success}")
        if success:
            print(f"[@route:execute_adb_verification_host] Success message: {message}")
        else:
            print(f"[@route:execute_adb_verification_host] Failure message: {message}")
            
        return result
        
    except Exception as e:
        print(f"[@route:execute_adb_verification_host] Error: {str(e)}")
        return {
            'success': False,
            'error': f'ADB verification error: {str(e)}',
            'verification_type': 'adb'
        }

def get_device_id_from_env(model):
    """
    Get ADB device ID from environment variables.
    Uses DEVICE_IP from environment to construct device ID.
    """
    import os
    
    device_ip = os.environ.get('DEVICE_IP')
    device_port = os.environ.get('DEVICE_PORT', '5555')  # Default ADB port
    
    if not device_ip:
        print(f"[@route:get_device_id_from_env] No DEVICE_IP found in environment for model: {model}")
        return None
    
    device_id = f"{device_ip}:{device_port}"
    print(f"[@route:get_device_id_from_env] Model '{model}' mapped to device: {device_id}")
    return device_id

class DirectADBController:
    """Direct ADB controller that executes ADB commands"""
    
    def __init__(self, device_id: str, device_name: str = "ADB Device"):
        """
        Initialize the Direct ADB controller.
        
        Args:
            device_id: Android device ID (e.g., "192.168.1.29:5555")
            device_name: Name of the device for logging
        """
        self.device_name = device_name
        self.device_id = device_id
        self.is_connected = True  # Assume connected since we're on host
        
        print(f"[@controller:DirectADB] Initialized for device {device_id}")
    
    def execute_adb_command(self, command: str):
        """Execute ADB command directly using subprocess."""
        try:
            import subprocess
            
            print(f"[@controller:DirectADB] Executing: {command}")
            
            result = subprocess.run(
                command.split(),
                capture_output=True,
                text=True,
                timeout=30
            )
            
            success = result.returncode == 0
            stdout = result.stdout.strip()
            stderr = result.stderr.strip()
            
            if success:
                print(f"[@controller:DirectADB] Command successful: {stdout}")
            else:
                print(f"[@controller:DirectADB] Command failed: {stderr}")
            
            return success, stdout, stderr, result.returncode
            
        except subprocess.TimeoutExpired:
            print(f"[@controller:DirectADB] Command timed out: {command}")
            return False, "", "Command timed out", -1
        except Exception as e:
            print(f"[@controller:DirectADB] Command error: {str(e)}")
            return False, "", str(e), -1
    
    def smart_element_search(self, search_term: str):
        """Search for UI elements using ADB UI dump."""
        try:
            # Dump UI hierarchy
            command = f"adb -s {self.device_id} shell uiautomator dump /sdcard/ui_dump.xml"
            success, stdout, stderr, exit_code = self.execute_adb_command(command)
            
            if not success:
                return False, [], f"Failed to dump UI: {stderr}"
            
            # Get the XML content
            command = f"adb -s {self.device_id} shell cat /sdcard/ui_dump.xml"
            success, xml_content, stderr, exit_code = self.execute_adb_command(command)
            
            if not success:
                return False, [], f"Failed to read UI dump: {stderr}"
            
            # Parse XML and search for elements
            matches = self._search_elements_in_xml(xml_content, search_term)
            
            print(f"[@controller:DirectADB] Found {len(matches)} matches for '{search_term}'")
            return True, matches, None
            
        except Exception as e:
            print(f"[@controller:DirectADB] Error in smart_element_search: {str(e)}")
            return False, [], str(e)
    
    def _search_elements_in_xml(self, xml_content: str, search_term: str):
        """Parse XML content and search for matching elements."""
        import re
        import xml.etree.ElementTree as ET
        
        matches = []
        
        try:
            # Parse XML
            root = ET.fromstring(xml_content)
            
            # Search all nodes for matching text, content-desc, or resource-id
            for elem in root.iter():
                element_data = {
                    'text': elem.get('text', ''),
                    'content_desc': elem.get('content-desc', ''),
                    'resource_id': elem.get('resource-id', ''),
                    'class': elem.get('class', ''),
                    'bounds': elem.get('bounds', ''),
                    'clickable': elem.get('clickable', 'false') == 'true',
                    'enabled': elem.get('enabled', 'true') == 'true'
                }
                
                # Check if search term matches any of the searchable fields
                searchable_text = f"{element_data['text']} {element_data['content_desc']} {element_data['resource_id']}".lower()
                
                if search_term.lower() in searchable_text:
                    matches.append(element_data)
            
            return matches
            
        except Exception as e:
            print(f"[@controller:DirectADB] Error parsing XML: {str(e)}")
            return []
    
    def waitForElementToAppear(self, search_term: str, timeout: float = 10.0):
        """Wait for element to appear on screen."""
        import time
        
        start_time = time.time()
        check_interval = 1.0
        
        print(f"[@controller:DirectADB] Waiting for element to appear: '{search_term}' (timeout: {timeout}s)")
        
        while time.time() - start_time < timeout:
            success, matches, error = self.smart_element_search(search_term)
            
            if error:
                print(f"[@controller:DirectADB] Search error: {error}")
                return False, f"Search failed: {error}", {
                    'search_term': search_term,
                    'wait_time': time.time() - start_time,
                    'infrastructure_error': True,
                    'error_details': error
                }
            
            if success and matches:
                elapsed = time.time() - start_time
                print(f"[@controller:DirectADB] Element found after {elapsed:.2f}s: {len(matches)} matches")
                
                return True, f"Element '{search_term}' appeared after {elapsed:.2f}s", {
                    'search_term': search_term,
                    'wait_time': elapsed,
                    'total_matches': len(matches),
                    'matches': matches[:5],  # Limit to first 5 matches
                    'successful_term': search_term
                }
            
            print(f"[@controller:DirectADB] Element not found, waiting {check_interval}s...")
            time.sleep(check_interval)
        
        # Timeout reached
        elapsed = time.time() - start_time
        print(f"[@controller:DirectADB] Timeout reached after {elapsed:.2f}s")
        
        return False, f"Element '{search_term}' did not appear within {timeout}s", {
            'search_term': search_term,
            'wait_time': elapsed,
            'timeout_reached': True,
            'total_matches': 0
        }
    
    def waitForElementToDisappear(self, search_term: str, timeout: float = 10.0):
        """Wait for element to disappear from screen."""
        import time
        
        start_time = time.time()
        check_interval = 1.0
        
        print(f"[@controller:DirectADB] Waiting for element to disappear: '{search_term}' (timeout: {timeout}s)")
        
        while time.time() - start_time < timeout:
            success, matches, error = self.smart_element_search(search_term)
            
            if error:
                print(f"[@controller:DirectADB] Search error: {error}")
                return False, f"Search failed: {error}", {
                    'search_term': search_term,
                    'wait_time': time.time() - start_time,
                    'infrastructure_error': True,
                    'error_details': error
                }
            
            if success and not matches:
                elapsed = time.time() - start_time
                print(f"[@controller:DirectADB] Element disappeared after {elapsed:.2f}s")
                
                return True, f"Element '{search_term}' disappeared after {elapsed:.2f}s", {
                    'search_term': search_term,
                    'wait_time': elapsed,
                    'element_still_present': False,
                    'total_still_present': 0
                }
            
            print(f"[@controller:DirectADB] Element still present ({len(matches) if matches else 0} matches), waiting {check_interval}s...")
            time.sleep(check_interval)
        
        # Timeout reached - element still present
        elapsed = time.time() - start_time
        print(f"[@controller:DirectADB] Timeout reached after {elapsed:.2f}s - element still present")
        
        return False, f"Element '{search_term}' still present after {timeout}s", {
            'search_term': search_term,
            'wait_time': elapsed,
            'timeout_reached': True,
            'element_still_present': True,
            'total_still_present': len(matches) if matches else 0,
            'still_present_elements': matches[:3] if matches else []  # Limit to first 3
        } 