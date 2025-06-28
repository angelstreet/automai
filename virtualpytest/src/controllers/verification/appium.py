"""
Appium Verification Controller Implementation

This controller provides Appium-based verification functionality using Appium WebDriver.
It uses appiumUtils for cross-platform element verification (iOS, Android, etc.).
"""

import time
from typing import Dict, Any, List, Optional, Tuple

# Use absolute import to avoid conflicts with local utils directory
import sys
import os
src_utils_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'utils')
if src_utils_path not in sys.path:
    sys.path.insert(0, src_utils_path)

from appium_utils import AppiumUtils, AppiumElement
from ..base_controller import VerificationControllerInterface


class AppiumVerificationController(VerificationControllerInterface):
    """Appium verification controller that uses Appium WebDriver to verify UI elements across platforms."""
    
    def __init__(self, appium_platform_name: str, appium_device_id: str, appium_server_url: str = "http://localhost:4723", av_controller=None):
        """
        Initialize the Appium Verification controller.
        
        Args:
            appium_platform_name: Platform name ("iOS" or "Android") - MANDATORY
            appium_device_id: Device UDID/ID - MANDATORY  
            appium_server_url: Appium server URL - MANDATORY
            av_controller: AV controller for capturing screenshots (optional, not used by Appium)
        """
        super().__init__("Appium Verification", "appium")
        
        # Validate mandatory parameters
        if not appium_platform_name:
            raise ValueError("appium_platform_name is required for AppiumVerificationController")
        if not appium_device_id:
            raise ValueError("appium_device_id is required for AppiumVerificationController")
        if not appium_server_url:
            raise ValueError("appium_server_url is required for AppiumVerificationController")
        
        # Store mandatory fields - IMPORTANT: Keep device_id as host identifier, not UDID
        self.platform_name = appium_platform_name
        self.appium_device_id = appium_device_id  # This is the actual iOS/Android UDID
        self.appium_server_url = appium_server_url
        
        # Set verification type for controller lookup
        self.verification_type = 'appium'
        
       
            
        self.appium_utils = AppiumUtils()
        self.is_connected = True
        
        print(f"[@controller:AppiumVerification] Initialized for {self.platform_name} device UDID {self.appium_device_id}")
    
    def _get_default_automation_name(self) -> str:
        """Get default automation name based on platform."""
        if self.platform_name == 'ios':
            return 'XCUITest'
        elif self.platform_name == 'android':
            return 'UIAutomator2'
        else:
            return 'UIAutomator2'  # Default fallback
    
    def _connect_device(self) -> bool:
        """Connect to the device via Appium."""
        try:
            print(f"[@controller:AppiumVerification:_connect_device] Connecting to {self.platform_name} device {self.appium_device_id}")
            
            # Build capabilities based on platform
            capabilities = {
                'platformName': self.platform_name.capitalize(),
                'udid': self.appium_device_id,
                'automationName': self._get_default_automation_name(),
                'newCommandTimeout': 300,
                'noReset': True
            }
            
            # Connect using appium_utils
            success = self.appium_utils.connect_device(self.appium_device_id, capabilities, self.appium_server_url)
            
            if success:
                self.is_connected = True
                print(f"[@controller:AppiumVerification:_connect_device] Successfully connected")
            else:
                print(f"[@controller:AppiumVerification:_connect_device] Failed to connect")
            
            return success
            
        except Exception as e:
            print(f"[@controller:AppiumVerification:_connect_device] Connection error: {e}")
            return False

    def getElementLists(self) -> Tuple[bool, List[Dict[str, Any]], str]:
        """
        Get list of all UI elements from Appium UI dump.
        
        Returns:
            Tuple of (success, element_list, error_message)
        """
        try:
            print(f"[@controller:AppiumVerification:getElementLists] Getting elements for device {self.appium_device_id}")
            
            if not self.is_connected:
                if not self._connect_device():
                    return False, [], "Device not connected"
            
            # Use existing appiumUtils to dump UI elements
            success, elements, error = self.appium_utils.dump_ui_elements(self.appium_device_id)
            
            if not success:
                print(f"[@controller:AppiumVerification:getElementLists] Failed: {error}")
                return False, [], error
            
            # Convert AppiumElement objects to dictionaries
            element_list = [element.to_dict() for element in elements]
            
            print(f"[@controller:AppiumVerification:getElementLists] Success: {len(element_list)} elements")
            return True, element_list, ""
            
        except Exception as e:
            error_msg = f"Element listing error: {e}"
            print(f"[@controller:AppiumVerification:getElementLists] ERROR: {error_msg}")
            return False, [], error_msg

    def getElementListsWithSmartSearch(self, search_term: str = None) -> Tuple[bool, Dict[str, Any], str]:
        """
        Get enhanced element listing with optional smart search capabilities. Supports pipe-separated terms for fallback (e.g., "Settings|Preferences|Options").
        
        Args:
            search_term: Optional search term for filtering elements (case-insensitive)
                        Can use pipe-separated terms: "text1|text2|text3"
            
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
            print(f"[@controller:AppiumVerification:getElementListsWithSmartSearch] Getting enhanced element list for device {self.appium_device_id}")
            if search_term:
                print(f"[@controller:AppiumVerification:getElementListsWithSmartSearch] With smart search for: '{search_term}'")
            
            if not self.is_connected:
                if not self._connect_device():
                    return False, {}, "Device not connected"
            
            # Get all UI elements
            success, elements, error = self.appium_utils.dump_ui_elements(self.appium_device_id)
            
            if not success:
                print(f"[@controller:AppiumVerification:getElementListsWithSmartSearch] Failed: {error}")
                return False, {}, error
            
            # Convert AppiumElement objects to dictionaries
            element_list = [element.to_dict() for element in elements]
            
            # Build enhanced response
            enhanced_data = {
                "total_elements": len(element_list),
                "elements": element_list,
                "device_info": {
                    "device_id": self.appium_device_id,
                    "platform": self.platform_name,
                    "appium_server_url": self.appium_server_url
                }
            }
            
            # Add smart search results if search term provided
            if search_term and search_term.strip():
                search_term_clean = search_term.strip()
                print(f"[@controller:AppiumVerification:getElementListsWithSmartSearch] Performing smart search for '{search_term_clean}'")
                
                # Check if we have pipe-separated terms
                if '|' in search_term_clean:
                    terms = [term.strip() for term in search_term_clean.split('|') if term.strip()]
                    print(f"[@controller:AppiumVerification:getElementListsWithSmartSearch] Using fallback strategy with {len(terms)} terms: {terms}")
                    
                    # Try each term until one succeeds
                    search_success = False
                    matches = []
                    search_error = None
                    successful_term = None
                    
                    for i, term in enumerate(terms):
                        print(f"[@controller:AppiumVerification:getElementListsWithSmartSearch] Attempt {i+1}/{len(terms)}: Searching for '{term}'")
                        
                        term_success, term_matches, term_error = self.appium_utils.smart_element_search(self.appium_device_id, term)
                        
                        if term_success and term_matches:
                            search_success = True
                            matches = term_matches
                            successful_term = term
                            print(f"[@controller:AppiumVerification:getElementListsWithSmartSearch] SUCCESS: Found matches using term '{term}'")
                            break
                        elif term_error:
                            search_error = term_error
                            print(f"[@controller:AppiumVerification:getElementListsWithSmartSearch] Search failed for term '{term}': {term_error}")
                    
                    enhanced_data["search_results"] = {
                        "search_term": search_term_clean,
                        "attempted_terms": terms,
                        "successful_term": successful_term,
                        "search_performed": True,
                        "search_success": search_success,
                        "total_matches": len(matches) if search_success else 0,
                        "matches": matches if search_success else [],
                        "search_error": search_error if not search_success else None,
                        "search_details": {
                            "case_sensitive": False,
                            "search_method": "contains_any_attribute",
                            "searched_attributes": self._get_searchable_attributes(),
                            "fallback_strategy": True
                        }
                    }
                else:
                    # Single term - original logic
                    terms = [search_term_clean]
                    search_success, matches, search_error = self.appium_utils.smart_element_search(self.appium_device_id, search_term_clean)
                    
                    enhanced_data["search_results"] = {
                        "search_term": search_term_clean,
                        "attempted_terms": terms,
                        "successful_term": search_term_clean if search_success else None,
                        "search_performed": True,
                        "search_success": search_success,
                        "total_matches": len(matches) if search_success else 0,
                        "matches": matches if search_success else [],
                        "search_error": search_error if not search_success else None,
                        "search_details": {
                            "case_sensitive": False,
                            "search_method": "contains_any_attribute",
                            "searched_attributes": self._get_searchable_attributes(),
                            "fallback_strategy": False
                        }
                    }
                
                if search_success and matches:
                    print(f"[@controller:AppiumVerification:getElementListsWithSmartSearch] Smart search found {len(matches)} matches")
                    for i, match in enumerate(matches, 1):
                        print(f"[@controller:AppiumVerification:getElementListsWithSmartSearch]   {i}. Element {match['element_id']}: {match['match_reason']}")
                elif search_success:
                    print(f"[@controller:AppiumVerification:getElementListsWithSmartSearch] Smart search completed - no matches found")
                else:
                    print(f"[@controller:AppiumVerification:getElementListsWithSmartSearch] Smart search failed: {search_error}")
            else:
                enhanced_data["search_results"] = {
                    "search_performed": False,
                    "message": "No search term provided"
                }
            
            print(f"[@controller:AppiumVerification:getElementListsWithSmartSearch] Success: {len(element_list)} total elements")
            return True, enhanced_data, ""
            
        except Exception as e:
            error_msg = f"Enhanced element listing error: {e}"
            print(f"[@controller:AppiumVerification:getElementListsWithSmartSearch] ERROR: {error_msg}")
            return False, {}, error_msg
    
    def _get_searchable_attributes(self) -> List[str]:
        """Get list of searchable attributes based on platform."""
        if self.platform_name == 'ios':
            return ["text", "name", "label", "value", "accessibility_id", "className"]
        elif self.platform_name == 'android':
            return ["text", "contentDesc", "resource_id", "className"]
        else:
            return ["text", "contentDesc", "className"]

    def waitForElementToAppear(self, search_term: str, timeout: float = 10.0, check_interval: float = 1.0) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Wait for an element matching search_term to appear. Supports pipe-separated terms for fallback (e.g., "Settings|Preferences|Options").
        
        Args:
            search_term: The term to search for (case-insensitive, searches all attributes)
                        Can use pipe-separated terms: "text1|text2|text3"
            timeout: Maximum time to wait in seconds (default: 10.0)
            check_interval: Time between checks in seconds (default: 1.0)
        
        Returns:
            Tuple of (success, message, result_data)
            
            result_data contains rich match information with all found elements
        """
        try:
            print(f"[@controller:AppiumVerification:waitForElementToAppear] Waiting for '{search_term}' (timeout: {timeout}s)")
            
            if not self.is_connected:
                if not self._connect_device():
                    return False, "Device not connected", {"error": "Device connection failed"}
            
            # Check if we have pipe-separated terms
            if '|' in search_term:
                terms = [term.strip() for term in search_term.split('|') if term.strip()]
                print(f"[@controller:AppiumVerification:waitForElementToAppear] Using fallback strategy with {len(terms)} terms: {terms}")
            else:
                terms = [search_term]
                print(f"[@controller:AppiumVerification:waitForElementToAppear] Using single search term: '{search_term}'")
            
            start_time = time.time()
            consecutive_infrastructure_failures = 0
            max_consecutive_failures = 3  # After 3 consecutive infrastructure failures, give up
            
            # If check_interval is 0, only check once (no polling)
            if check_interval <= 0:
                print(f"[@controller:AppiumVerification:waitForElementToAppear] Single check mode (no polling)")
                max_iterations = 1
            else:
                print(f"[@controller:AppiumVerification:waitForElementToAppear] Polling mode: check every {check_interval}s")
                max_iterations = float('inf')
            
            iteration = 0
            while iteration < max_iterations and time.time() - start_time < timeout:
                iteration += 1
                # Try each term in sequence until one succeeds
                found_match = False
                successful_term = None
                final_matches = []
                final_error = None
                
                for i, term in enumerate(terms):
                    if len(terms) > 1:
                        print(f"[@controller:AppiumVerification:waitForElementToAppear] Attempt {i+1}/{len(terms)}: Searching for '{term}'")
                    
                    success, matches, error = self.appium_utils.smart_element_search(self.appium_device_id, term)
                    
                    if error:
                        print(f"[@controller:AppiumVerification:waitForElementToAppear] Search failed for term '{term}': {error}")
                        final_error = error
                        
                        # Check if this is an infrastructure error (Appium connection issues, etc.)
                        if any(infrastructure_error in error.lower() for infrastructure_error in [
                            'infrastructure failure', 'connection', 'webdriver', 'appium', 'session', 
                            'device not found', 'no such session', 'timeout'
                        ]):
                            consecutive_infrastructure_failures += 1
                            print(f"[@controller:AppiumVerification:waitForElementToAppear] Infrastructure failure #{consecutive_infrastructure_failures}: {error}")
                            
                            if consecutive_infrastructure_failures >= max_consecutive_failures:
                                elapsed = time.time() - start_time
                                error_message = f"Infrastructure failure: {error}"
                                print(f"[@controller:AppiumVerification:waitForElementToAppear] ERROR: Too many consecutive infrastructure failures")
                                
                                result_data = {
                                    'search_term': search_term,
                                    'wait_time': elapsed,
                                    'infrastructure_error': True,
                                    'error_details': error,
                                    'consecutive_failures': consecutive_infrastructure_failures,
                                    'attempted_terms': terms
                                }
                                
                                return False, error_message, result_data
                            
                            # Break out of term loop on infrastructure failure to retry all terms
                            break
                        else:
                            # Reset counter for non-infrastructure errors and continue with next term
                            consecutive_infrastructure_failures = 0
                    else:
                        # Reset counter on successful search
                        consecutive_infrastructure_failures = 0
                        
                        if success and matches:
                            found_match = True
                            successful_term = term
                            final_matches = matches
                            print(f"[@controller:AppiumVerification:waitForElementToAppear] SUCCESS: Found element using term '{term}'")
                            break  # Found a match, no need to try other terms
                
                if found_match:
                    elapsed = time.time() - start_time
                    message = f"Element found after {elapsed:.1f}s using term '{successful_term}'"
                    print(f"[@controller:AppiumVerification:waitForElementToAppear] SUCCESS: {message}")
                    
                    result_data = {
                        'search_term': search_term,
                        'successful_term': successful_term,
                        'attempted_terms': terms,
                        'wait_time': elapsed,
                        'total_matches': len(final_matches),
                        'matches': final_matches,
                        'search_details': {
                            'case_sensitive': False,
                            'search_method': 'contains_any_attribute',
                            'searched_attributes': self._get_searchable_attributes(),
                            'fallback_strategy': len(terms) > 1,
                            'platform': self.platform_name
                        }
                    }
                    
                    print(f"[@controller:AppiumVerification:waitForElementToAppear] Found {len(final_matches)} matching elements:")
                    for i, match in enumerate(final_matches, 1):
                        print(f"[@controller:AppiumVerification:waitForElementToAppear]   {i}. Element {match['element_id']}: {match['match_reason']}")
                    
                    return True, message, result_data
                
                # Only sleep if we're in polling mode (check_interval > 0)
                if check_interval > 0:
                    time.sleep(check_interval)
                else:
                    # In single-check mode, break after first iteration
                    break
            
            elapsed = time.time() - start_time
            message = f"Element '{search_term}' did not appear within {elapsed:.1f}s"
            print(f"[@controller:AppiumVerification:waitForElementToAppear] FAILED: {message}")
            
            result_data = {
                'search_term': search_term,
                'attempted_terms': terms,
                'wait_time': elapsed,
                'timeout_reached': True,
                'search_details': {
                    'case_sensitive': False,
                    'search_method': 'contains_any_attribute',
                    'searched_attributes': self._get_searchable_attributes(),
                    'fallback_strategy': len(terms) > 1,
                    'platform': self.platform_name
                },
                'last_error': final_error
            }
            
            return False, message, result_data
            
        except Exception as e:
            error_msg = f"Wait for element appear error: {e}"
            print(f"[@controller:AppiumVerification:waitForElementToAppear] ERROR: {error_msg}")
            
            result_data = {
                'search_term': search_term,
                'infrastructure_error': True,
                'error_details': str(e)
            }
            
            return False, error_msg, result_data

    def waitForElementToDisappear(self, search_term: str, timeout: float = 10.0, check_interval: float = 1.0) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Wait for an element matching search_term to disappear. Supports pipe-separated terms for fallback (e.g., "Settings|Preferences|Options").
        
        Args:
            search_term: The term to search for (case-insensitive, searches all attributes)
                        Can use pipe-separated terms: "text1|text2|text3"
            timeout: Maximum time to wait in seconds (default: 10.0)
            check_interval: Time between checks in seconds (default: 1.0)
        
        Returns:
            Tuple of (success, message, result_data)
        """
        try:
            print(f"[@controller:AppiumVerification:waitForElementToDisappear] Waiting for '{search_term}' to disappear (timeout: {timeout}s)")
            
            if not self.is_connected:
                if not self._connect_device():
                    return False, "Device not connected", {"error": "Device connection failed"}
            
            # Check if we have pipe-separated terms
            if '|' in search_term:
                terms = [term.strip() for term in search_term.split('|') if term.strip()]
                print(f"[@controller:AppiumVerification:waitForElementToDisappear] Using fallback strategy with {len(terms)} terms: {terms}")
            else:
                terms = [search_term]
                print(f"[@controller:AppiumVerification:waitForElementToDisappear] Using single search term: '{search_term}'")
            
            start_time = time.time()
            consecutive_infrastructure_failures = 0
            max_consecutive_failures = 3  # After 3 consecutive infrastructure failures, give up
            
            while time.time() - start_time < timeout:
                # Check if ANY of the terms still exist (element disappears when NONE are found)
                any_term_found = False
                successful_term = None
                final_matches = []
                final_error = None
                
                for i, term in enumerate(terms):
                    if len(terms) > 1:
                        print(f"[@controller:AppiumVerification:waitForElementToDisappear] Checking {i+1}/{len(terms)}: Searching for '{term}'")
                    
                    success, matches, error = self.appium_utils.smart_element_search(self.appium_device_id, term)
                    
                    if error:
                        print(f"[@controller:AppiumVerification:waitForElementToDisappear] Search failed for term '{term}': {error}")
                        final_error = error
                        
                        # Check if this is an infrastructure error (Appium connection issues, etc.)
                        if any(infrastructure_error in error.lower() for infrastructure_error in [
                            'infrastructure failure', 'connection', 'webdriver', 'appium', 'session', 
                            'device not found', 'no such session', 'timeout'
                        ]):
                            consecutive_infrastructure_failures += 1
                            print(f"[@controller:AppiumVerification:waitForElementToDisappear] Infrastructure failure #{consecutive_infrastructure_failures}: {error}")
                            
                            if consecutive_infrastructure_failures >= max_consecutive_failures:
                                elapsed = time.time() - start_time
                                error_message = f"Infrastructure failure: {error}"
                                print(f"[@controller:AppiumVerification:waitForElementToDisappear] ERROR: Too many consecutive infrastructure failures")
                                
                                result_data = {
                                    'search_term': search_term,
                                    'wait_time': elapsed,
                                    'infrastructure_error': True,
                                    'error_details': error,
                                    'consecutive_failures': consecutive_infrastructure_failures,
                                    'attempted_terms': terms
                                }
                                
                                return False, error_message, result_data
                            
                            # Break out of term loop on infrastructure failure to retry all terms
                            break
                        else:
                            # Reset counter for non-infrastructure errors and continue with next term
                            consecutive_infrastructure_failures = 0
                    else:
                        # Reset counter on successful search
                        consecutive_infrastructure_failures = 0
                        
                        if success and matches:
                            any_term_found = True
                            successful_term = term
                            final_matches.extend(matches)  # Collect all matches from all terms
                            print(f"[@controller:AppiumVerification:waitForElementToDisappear] Element still present using term '{term}'")
                            # Continue checking other terms to get complete picture
                
                # Element has disappeared if NO terms were found
                if not any_term_found:
                    elapsed = time.time() - start_time
                    message = f"Element '{search_term}' disappeared after {elapsed:.1f}s"
                    print(f"[@controller:AppiumVerification:waitForElementToDisappear] SUCCESS: {message}")
                    
                    result_data = {
                        'search_term': search_term,
                        'attempted_terms': terms,
                        'wait_time': elapsed,
                        'search_details': {
                            'case_sensitive': False,
                            'search_method': 'contains_any_attribute',
                            'searched_attributes': self._get_searchable_attributes(),
                            'fallback_strategy': len(terms) > 1,
                            'platform': self.platform_name
                        }
                    }
                    
                    return True, message, result_data
                
                time.sleep(check_interval)
            
            elapsed = time.time() - start_time
            message = f"Element '{search_term}' still present after {elapsed:.1f}s"
            print(f"[@controller:AppiumVerification:waitForElementToDisappear] FAILED: {message}")
            
            # Include details of still present elements in failure response
            result_data = {
                'search_term': search_term,
                'attempted_terms': terms,
                'wait_time': elapsed,
                'timeout_reached': True,
                'element_still_present': True,
                'search_details': {
                    'case_sensitive': False,
                    'search_method': 'contains_any_attribute',
                    'searched_attributes': self._get_searchable_attributes(),
                    'fallback_strategy': len(terms) > 1,
                    'platform': self.platform_name
                },
                'last_error': final_error
            }
            
            # Get final check to include element details in failure
            try:
                if successful_term and final_matches:
                    result_data['still_present_elements'] = final_matches
                    result_data['total_still_present'] = len(final_matches)
                    result_data['successful_term'] = successful_term
                    print(f"[@controller:AppiumVerification:waitForElementToDisappear] {len(final_matches)} elements still present using term '{successful_term}'")
                    for match in final_matches:
                        print(f"[@controller:AppiumVerification:waitForElementToDisappear] Still present: Element {match['element_id']} - {match['match_reason']}")
            except:
                pass  # Don't fail the whole operation if final check fails
            
            return False, message, result_data
            
        except Exception as e:
            error_msg = f"Wait for element disappear error: {e}"
            print(f"[@controller:AppiumVerification:waitForElementToDisappear] ERROR: {error_msg}")
            
            result_data = {
                'search_term': search_term,
                'infrastructure_error': True,
                'error_details': str(e)
            }
            
            return False, error_msg, result_data
    
    def get_available_verifications(self) -> List[Dict[str, Any]]:
        """Get available verifications for Appium controller."""
        return [
            {
                'command': 'waitForElementToAppear',
                'params': {
                    'search_term': '',      # Empty string for user input
                    'timeout': 0.0,         # Default: single check, no polling
                    'check_interval': 1.0   # Default value
                },
                'verification_type': 'appium'
            },
            {
                'command': 'waitForElementToDisappear',
                'params': {
                    'search_term': '',      # Empty string for user input
                    'timeout': 0.0,         # Default: single check, no polling
                    'check_interval': 1.0   # Default value
                },
                'verification_type': 'appium'
            }
        ]

    def execute_verification(self, verification_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Unified verification execution interface for centralized controller.
        
        Args:
            verification_config: {
                'verification_type': 'appium',
                'command': 'waitForElementToAppear',
                'params': {
                    'search_term': 'Settings',
                    'timeout': 10.0,
                    'check_interval': 1.0
                }
            }
            
        Returns:
            {
                'success': bool,
                'message': str,
                'confidence': float,
                'details': dict
            }
        """
        try:
            # Extract parameters
            params = verification_config.get('params', {})
            command = verification_config.get('command', 'waitForElementToAppear')
            
            # Required parameters
            search_term = params.get('search_term', '')
            if not search_term:
                return {
                    'success': False,
                    'message': 'No search term specified for Appium verification',
                    'confidence': 0.0,
                    'details': {'error': 'Missing search_term parameter'}
                }
            
            # Optional parameters with defaults
            timeout = params.get('timeout', 10.0)
            check_interval = params.get('check_interval', 1.0)
            
            print(f"[@controller:AppiumVerification] Executing {command} with search term: '{search_term}'")
            print(f"[@controller:AppiumVerification] Parameters: timeout={timeout}, check_interval={check_interval}, platform={self.platform_name}")
            
            # Execute verification based on command
            if command == 'waitForElementToAppear':
                success, message, details = self.waitForElementToAppear(
                    search_term=search_term,
                    timeout=timeout,
                    check_interval=check_interval
                )
            elif command == 'waitForElementToDisappear':
                success, message, details = self.waitForElementToDisappear(
                    search_term=search_term,
                    timeout=timeout,
                    check_interval=check_interval
                )
            else:
                return {
                    'success': False,
                    'message': f'Unknown Appium verification command: {command}',
                    'confidence': 0.0,
                    'details': {'error': f'Unsupported command: {command}'}
                }
            
            # Return unified format
            return {
                'success': success,
                'message': message,
                'confidence': 1.0 if success else 0.0,
                'details': details,
                # Appium-specific fields for frontend compatibility
                'search_term': search_term,
                'wait_time': details.get('wait_time', 0),
                'total_matches': details.get('total_matches', 0),
                'matches': details.get('matches', []),
                'platform': self.platform_name
            }
            
        except Exception as e:
            print(f"[@controller:AppiumVerification] Execution error: {e}")
            return {
                'success': False,
                'message': f'Appium verification execution error: {str(e)}',
                'confidence': 0.0,
                'details': {'error': str(e)}
            } 