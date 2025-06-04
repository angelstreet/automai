"""
ADB Verification Controller Implementation

This controller provides ADB-based verification functionality using SSH+ADB.
It uses existing SSH session and adbUtils for element verification.
"""

import time
from typing import Dict, Any, List, Optional, Tuple
from utils.sshUtils import SSHConnection
from utils.adbUtils import ADBUtils, AndroidElement


class ADBVerificationController:
    """ADB verification controller that uses SSH+ADB commands to verify UI elements."""
    
    def __init__(self, ssh_connection: SSHConnection, device_id: str, device_name: str = "ADB Device", **kwargs):
        """
        Initialize the ADB Verification controller.
        
        Args:
            ssh_connection: Active SSH connection to the host
            device_id: Android device ID (e.g., "192.168.1.100:5555")
            device_name: Name of the device for logging
        """
        self.device_name = device_name
        self.ssh_connection = ssh_connection
        self.device_id = device_id
        self.adb_utils = ADBUtils(ssh_connection)
        self.is_connected = True  # Always connected if we have an active SSH session
        
        print(f"[@controller:ADBVerification] Initialized for device {device_id}")

    def getElementLists(self) -> Tuple[bool, List[Dict[str, Any]], str]:
        """
        Get list of all UI elements from ADB UI dump.
        
        Returns:
            Tuple of (success, element_list, error_message)
        """
        try:
            print(f"[@controller:ADBVerification:getElementLists] Getting elements for device {self.device_id}")
            
            # Use existing adbUtils to dump UI elements
            success, elements, error = self.adb_utils.dump_ui_elements(self.device_id)
            
            if not success:
                print(f"[@controller:ADBVerification:getElementLists] Failed: {error}")
                return False, [], error
            
            # Convert AndroidElement objects to dictionaries
            element_list = [element.to_dict() for element in elements]
            
            print(f"[@controller:ADBVerification:getElementLists] Success: {len(element_list)} elements")
            return True, element_list, ""
            
        except Exception as e:
            error_msg = f"Element listing error: {e}"
            print(f"[@controller:ADBVerification:getElementLists] ERROR: {error_msg}")
            return False, [], error_msg

    def getElementListsWithSmartSearch(self, search_term: str = None) -> Tuple[bool, Dict[str, Any], str]:
        """
        Get enhanced element listing with optional smart search capabilities.
        
        Args:
            search_term: Optional search term for filtering elements (case-insensitive)
            
        Returns:
            Tuple of (success, enhanced_element_data, error_message)
            
            enhanced_element_data contains:
            {
                "total_elements": int,
                "elements": [list of all elements],
                "search_results": {
                    "search_term": str,
                    "total_matches": int, 
                    "matches": [list of matching elements with details]
                } if search_term provided
            }
        """
        try:
            print(f"[@controller:ADBVerification:getElementListsWithSmartSearch] Getting enhanced element list for device {self.device_id}")
            if search_term:
                print(f"[@controller:ADBVerification:getElementListsWithSmartSearch] With smart search for: '{search_term}'")
            
            # Get all UI elements
            success, elements, error = self.adb_utils.dump_ui_elements(self.device_id)
            
            if not success:
                print(f"[@controller:ADBVerification:getElementListsWithSmartSearch] Failed: {error}")
                return False, {}, error
            
            # Convert AndroidElement objects to dictionaries
            element_list = [element.to_dict() for element in elements]
            
            # Build enhanced response
            enhanced_data = {
                "total_elements": len(element_list),
                "elements": element_list,
                "device_info": {
                    "device_id": self.device_id,
                    "device_name": self.device_name
                }
            }
            
            # Add smart search results if search term provided
            if search_term and search_term.strip():
                print(f"[@controller:ADBVerification:getElementListsWithSmartSearch] Performing smart search for '{search_term}'")
                
                search_success, matches, search_error = self.adb_utils.smart_element_search(self.device_id, search_term.strip())
                
                enhanced_data["search_results"] = {
                    "search_term": search_term.strip(),
                    "search_performed": True,
                    "search_success": search_success,
                    "total_matches": len(matches) if search_success else 0,
                    "matches": matches if search_success else [],
                    "search_error": search_error if not search_success else None,
                    "search_details": {
                        "case_sensitive": False,
                        "search_method": "contains_any_attribute",
                        "searched_attributes": ["text", "content_desc", "resource_id", "class_name"]
                    }
                }
                
                if search_success and matches:
                    print(f"[@controller:ADBVerification:getElementListsWithSmartSearch] Smart search found {len(matches)} matches")
                    for i, match in enumerate(matches, 1):
                        print(f"[@controller:ADBVerification:getElementListsWithSmartSearch]   {i}. Element {match['element_id']}: {match['match_reason']}")
                elif search_success:
                    print(f"[@controller:ADBVerification:getElementListsWithSmartSearch] Smart search completed - no matches found")
                else:
                    print(f"[@controller:ADBVerification:getElementListsWithSmartSearch] Smart search failed: {search_error}")
            else:
                enhanced_data["search_results"] = {
                    "search_performed": False,
                    "message": "No search term provided"
                }
            
            print(f"[@controller:ADBVerification:getElementListsWithSmartSearch] Success: {len(element_list)} total elements")
            return True, enhanced_data, ""
            
        except Exception as e:
            error_msg = f"Enhanced element listing error: {e}"
            print(f"[@controller:ADBVerification:getElementListsWithSmartSearch] ERROR: {error_msg}")
            return False, {}, error_msg

    def waitForElementToAppear(self, search_term: str, timeout: float = 10.0, check_interval: float = 1.0) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Wait for an element matching search_term to appear.
        
        Args:
            search_term: The term to search for (case-insensitive, searches all attributes)
            timeout: Maximum time to wait in seconds (default: 10.0)
            check_interval: Time between checks in seconds (default: 1.0)
        
        Returns:
            Tuple of (success, message, result_data)
            
            result_data contains rich match information with all found elements
        """
        try:
            print(f"[@controller:ADBVerification:waitForElementToAppear] Waiting for '{search_term}' (timeout: {timeout}s)")
            
            start_time = time.time()
            consecutive_infrastructure_failures = 0
            max_consecutive_failures = 3  # After 3 consecutive infrastructure failures, give up
            
            while time.time() - start_time < timeout:
                success, matches, error = self.adb_utils.smart_element_search(self.device_id, search_term)
                
                if error:
                    print(f"[@controller:ADBVerification:waitForElementToAppear] Search failed: {error}")
                    
                    # Check if this is an infrastructure error (SSH timeout, ADB connection issues, etc.)
                    if any(infrastructure_error in error.lower() for infrastructure_error in [
                        'infrastructure failure', 'timeout opening channel', 'failed to dump ui', 'ssh', 'connection', 
                        'adb connect failed', 'device not found', 'no devices', 'offline'
                    ]):
                        consecutive_infrastructure_failures += 1
                        print(f"[@controller:ADBVerification:waitForElementToAppear] Infrastructure failure #{consecutive_infrastructure_failures}: {error}")
                        
                        if consecutive_infrastructure_failures >= max_consecutive_failures:
                            elapsed = time.time() - start_time
                            error_message = f"Infrastructure failure: {error}"
                            print(f"[@controller:ADBVerification:waitForElementToAppear] ERROR: Too many consecutive infrastructure failures")
                            
                            result_data = {
                                'search_term': search_term,
                                'wait_time': elapsed,
                                'infrastructure_error': True,
                                'error_details': error,
                                'consecutive_failures': consecutive_infrastructure_failures
                            }
                            
                            return False, error_message, result_data
                    else:
                        # Reset counter for non-infrastructure errors
                        consecutive_infrastructure_failures = 0
                else:
                    # Reset counter on successful search
                    consecutive_infrastructure_failures = 0
                
                if success and matches:
                    elapsed = time.time() - start_time
                    message = f"Element found after {elapsed:.1f}s"
                    print(f"[@controller:ADBVerification:waitForElementToAppear] SUCCESS: {message}")
                    
                    result_data = {
                        'search_term': search_term,
                        'wait_time': elapsed,
                        'total_matches': len(matches),
                        'matches': matches,
                        'search_details': {
                            'case_sensitive': False,
                            'search_method': 'contains_any_attribute',
                            'searched_attributes': ['text', 'content_desc', 'resource_id', 'class_name']
                        }
                    }
                    
                    print(f"[@controller:ADBVerification:waitForElementToAppear] Found {len(matches)} matching elements:")
                    for i, match in enumerate(matches, 1):
                        print(f"[@controller:ADBVerification:waitForElementToAppear]   {i}. Element {match['element_id']}: {match['match_reason']}")
                    
                    return True, message, result_data
                
                time.sleep(check_interval)
            
            elapsed = time.time() - start_time
            message = f"Element '{search_term}' did not appear within {elapsed:.1f}s"
            print(f"[@controller:ADBVerification:waitForElementToAppear] FAILED: {message}")
            
            result_data = {
                'search_term': search_term,
                'wait_time': elapsed,
                'timeout_reached': True,
                'search_details': {
                    'case_sensitive': False,
                    'search_method': 'contains_any_attribute',
                    'searched_attributes': ['text', 'content_desc', 'resource_id', 'class_name']
                }
            }
            
            return False, message, result_data
            
        except Exception as e:
            error_msg = f"Wait for element appear error: {e}"
            print(f"[@controller:ADBVerification:waitForElementToAppear] ERROR: {error_msg}")
            
            result_data = {
                'search_term': search_term,
                'infrastructure_error': True,
                'error_details': str(e)
            }
            
            return False, error_msg, result_data

    def waitForElementToDisappear(self, search_term: str, timeout: float = 10.0, check_interval: float = 1.0) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Wait for an element matching search_term to disappear.
        
        Args:
            search_term: The term to search for (case-insensitive, searches all attributes)
            timeout: Maximum time to wait in seconds (default: 10.0)
            check_interval: Time between checks in seconds (default: 1.0)
        
        Returns:
            Tuple of (success, message, result_data)
        """
        try:
            print(f"[@controller:ADBVerification:waitForElementToDisappear] Waiting for '{search_term}' to disappear (timeout: {timeout}s)")
            
            start_time = time.time()
            consecutive_infrastructure_failures = 0
            max_consecutive_failures = 3  # After 3 consecutive infrastructure failures, give up
            
            while time.time() - start_time < timeout:
                success, matches, error = self.adb_utils.smart_element_search(self.device_id, search_term)
                
                if error:
                    print(f"[@controller:ADBVerification:waitForElementToDisappear] Search failed: {error}")
                    
                    # Check if this is an infrastructure error (SSH timeout, ADB connection issues, etc.)
                    if any(infrastructure_error in error.lower() for infrastructure_error in [
                        'infrastructure failure', 'timeout opening channel', 'failed to dump ui', 'ssh', 'connection', 
                        'adb connect failed', 'device not found', 'no devices', 'offline'
                    ]):
                        consecutive_infrastructure_failures += 1
                        print(f"[@controller:ADBVerification:waitForElementToDisappear] Infrastructure failure #{consecutive_infrastructure_failures}: {error}")
                        
                        if consecutive_infrastructure_failures >= max_consecutive_failures:
                            elapsed = time.time() - start_time
                            error_message = f"Infrastructure failure: {error}"
                            print(f"[@controller:ADBVerification:waitForElementToDisappear] ERROR: Too many consecutive infrastructure failures")
                            
                            result_data = {
                                'search_term': search_term,
                                'wait_time': elapsed,
                                'infrastructure_error': True,
                                'error_details': error,
                                'consecutive_failures': consecutive_infrastructure_failures
                            }
                            
                            return False, error_message, result_data
                    else:
                        # Reset counter for non-infrastructure errors
                        consecutive_infrastructure_failures = 0
                else:
                    # Reset counter on successful search
                    consecutive_infrastructure_failures = 0
                
                if not success or not matches:
                    elapsed = time.time() - start_time
                    message = f"Element '{search_term}' disappeared after {elapsed:.1f}s"
                    print(f"[@controller:ADBVerification:waitForElementToDisappear] SUCCESS: {message}")
                    
                    result_data = {
                        'search_term': search_term,
                        'wait_time': elapsed,
                        'search_details': {
                            'case_sensitive': False,
                            'search_method': 'contains_any_attribute',
                            'searched_attributes': ['text', 'content_desc', 'resource_id', 'class_name']
                        }
                    }
                    
                    return True, message, result_data
                
                time.sleep(check_interval)
            
            elapsed = time.time() - start_time
            message = f"Element '{search_term}' still present after {elapsed:.1f}s"
            print(f"[@controller:ADBVerification:waitForElementToDisappear] FAILED: {message}")
            
            # Include details of still present elements in failure response
            result_data = {
                'search_term': search_term,
                'wait_time': elapsed,
                'timeout_reached': True,
                'element_still_present': True,
                'search_details': {
                    'case_sensitive': False,
                    'search_method': 'contains_any_attribute',
                    'searched_attributes': ['text', 'content_desc', 'resource_id', 'class_name']
                }
            }
            
            # Get final check to include element details in failure
            try:
                final_success, final_matches, _ = self.adb_utils.smart_element_search(self.device_id, search_term)
                if final_success and final_matches:
                    result_data['still_present_elements'] = final_matches
                    result_data['total_still_present'] = len(final_matches)
                    print(f"[@controller:ADBVerification:waitForElementToDisappear] {len(final_matches)} elements still present")
                    for match in final_matches:
                        print(f"[@controller:ADBVerification:waitForElementToDisappear] Still present: Element {match['element_id']} - {match['match_reason']}")
            except:
                pass  # Don't fail the whole operation if final check fails
            
            return False, message, result_data
            
        except Exception as e:
            error_msg = f"Wait for element disappear error: {e}"
            print(f"[@controller:ADBVerification:waitForElementToDisappear] ERROR: {error_msg}")
            
            result_data = {
                'search_term': search_term,
                'infrastructure_error': True,
                'error_details': str(e)
            }
            
            return False, error_msg, result_data
    