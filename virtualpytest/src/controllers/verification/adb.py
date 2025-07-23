"""
ADB Verification Controller Implementation

This controller provides ADB-based verification functionality using direct ADB connections.
It uses adbUtils for element verification.
"""

import time
from typing import Dict, Any, List, Optional, Tuple

# Use absolute import to avoid conflicts with local utils directory
import sys
import os
src_utils_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'utils')
if src_utils_path not in sys.path:
    sys.path.insert(0, src_utils_path)

from adb_utils import ADBUtils, AndroidElement
from ..base_controller import VerificationControllerInterface


class ADBVerificationController(VerificationControllerInterface):
    """ADB verification controller that uses direct ADB commands to verify UI elements."""
    
    def __init__(self, av_controller=None, device_ip: str = None, device_port: int = 5555, **kwargs):
        """
        Initialize the ADB Verification controller.
        
        Args:
            av_controller: AV controller for capturing screenshots (optional, not used by ADB)
            device_ip: Android device IP address (required for ADB connection)
            device_port: ADB port (default: 5555)
        """
        super().__init__("ADB Verification", "adb")
        
        # Store device connection parameters
        self.device_ip = device_ip
        self.device_port = device_port
        self.verification_type = 'adb'
        self.device_id = f"{self.device_ip}:{self.device_port}"
        
        self.adb_utils = ADBUtils()
        self.is_connected = True  # Assume connected since we're using direct ADB
        
        print(f"[@controller:ADBVerification] Initialized for device {self.device_id}")

    def connect(self) -> bool:
        """Connect to the ADB device if device_ip is provided."""
        if not self.device_ip:
            print(f"[@controller:ADBVerification] No device IP provided, skipping ADB connection")
            return True  # Return True for fallback mode
        
        try:
            print(f"[@controller:ADBVerification] Connecting to ADB device {self.device_id}")
            success = self.adb_utils.connect_device(self.device_id)
            if success:
                print(f"[@controller:ADBVerification] Successfully connected to {self.device_id}")
                self.is_connected = True
            else:
                print(f"[@controller:ADBVerification] Failed to connect to {self.device_id}")
                self.is_connected = False
            return success
        except Exception as e:
            print(f"[@controller:ADBVerification] Connection error: {e}")
            self.is_connected = False
            return False

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
        Get enhanced element listing with optional smart search capabilities. Supports pipe-separated terms for fallback (e.g., "BBC ONE|SRF 1|RTS 1").
        
        Args:
            search_term: Optional search term for filtering elements (case-insensitive)
                        Can use pipe-separated terms: "text1|text2|text3"
            
        Returns:
            Tuple of (success, enhanced_element_data, error_message)
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
                    "device_name": "adb_verification"
                }
            }
            
            # Add smart search results if search term provided
            if search_term and search_term.strip():
                search_term_clean = search_term.strip()
                print(f"[@controller:ADBVerification:getElementListsWithSmartSearch] Performing smart search for '{search_term_clean}'")
                
                # Check if we have pipe-separated terms
                if '|' in search_term_clean:
                    terms = [term.strip() for term in search_term_clean.split('|') if term.strip()]
                    print(f"[@controller:ADBVerification:getElementListsWithSmartSearch] Using fallback strategy with {len(terms)} terms: {terms}")
                    
                    # Try each term until one succeeds
                    search_success = False
                    matches = []
                    search_error = None
                    successful_term = None
                    
                    for i, term in enumerate(terms):
                        print(f"[@controller:ADBVerification:getElementListsWithSmartSearch] Attempt {i+1}/{len(terms)}: Searching for '{term}'")
                        
                        term_success, term_matches, term_error = self.adb_utils.smart_element_search(self.device_id, term)
                        
                        if term_success and term_matches:
                            search_success = True
                            matches = term_matches
                            successful_term = term
                            print(f"[@controller:ADBVerification:getElementListsWithSmartSearch] SUCCESS: Found matches using term '{term}'")
                            break
                        elif term_error:
                            search_error = term_error
                            print(f"[@controller:ADBVerification:getElementListsWithSmartSearch] Search failed for term '{term}': {term_error}")
                    
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
                            "searched_attributes": ["text", "content_desc", "resource_id", "class_name"],
                            "fallback_strategy": True
                        }
                    }
                else:
                    # Single term - original logic
                    terms = [search_term_clean]
                    search_success, matches, search_error = self.adb_utils.smart_element_search(self.device_id, search_term_clean)
                    
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
                            "searched_attributes": ["text", "content_desc", "resource_id", "class_name"],
                            "fallback_strategy": False
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

    def waitForElementToAppear(self, search_term: str, timeout: float = 0.0) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Wait for an element matching search_term to appear. Supports pipe-separated terms for fallback (e.g., "BBC ONE|SRF 1|RTS 1").
        
        Args:
            search_term: The term to search for (case-insensitive, searches all attributes)
                        Can use pipe-separated terms: "text1|text2|text3"
            timeout: Maximum time to wait in seconds (default: 0.0 = check only once, no polling)
        
        Returns:
            Tuple of (success, message, result_data)
        """
        try:
            print(f"[@controller:ADBVerification:waitForElementToAppear] Waiting for '{search_term}' (timeout: {timeout}s)")
            
            # Check if we have pipe-separated terms
            if '|' in search_term:
                terms = [term.strip() for term in search_term.split('|') if term.strip()]
                print(f"[@controller:ADBVerification:waitForElementToAppear] Using fallback strategy with {len(terms)} terms: {terms}")
            else:
                terms = [search_term]
                print(f"[@controller:ADBVerification:waitForElementToAppear] Using single search term: '{search_term}'")
            
            start_time = time.time()
            
            # Always do at least one check, then continue if timeout > 0
            while True:
                # Try each term in sequence until one succeeds
                found_match = False
                successful_term = None
                final_matches = []
                final_error = None
                
                for i, term in enumerate(terms):
                    if len(terms) > 1:
                        print(f"[@controller:ADBVerification:waitForElementToAppear] Attempt {i+1}/{len(terms)}: Searching for '{term}'")
                    
                    success, matches, error = self.adb_utils.smart_element_search(self.device_id, term)
                    
                    if error:
                        print(f"[@controller:ADBVerification:waitForElementToAppear] Search failed for term '{term}': {error}")
                        final_error = error
                    else:
                        if success and matches:
                            found_match = True
                            successful_term = term
                            final_matches = matches
                            print(f"[@controller:ADBVerification:waitForElementToAppear] SUCCESS: Found element using term '{term}'")
                            break  # Found a match, no need to try other terms
                
                if found_match:
                    elapsed = time.time() - start_time
                    message = f"Element found after {elapsed:.1f}s using term '{successful_term}'"
                    print(f"[@controller:ADBVerification:waitForElementToAppear] SUCCESS: {message}")
                    
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
                            'searched_attributes': ['text', 'content_desc', 'resource_id', 'class_name'],
                            'fallback_strategy': len(terms) > 1
                        }
                    }
                    
                    print(f"[@controller:ADBVerification:waitForElementToAppear] Found {len(final_matches)} matching elements:")
                    for i, match in enumerate(final_matches, 1):
                        print(f"[@controller:ADBVerification:waitForElementToAppear]   {i}. Element {match['element_id']}: {match['match_reason']}")
                    
                    return True, message, result_data
                
                # Check if we should continue polling
                elapsed = time.time() - start_time
                if timeout <= 0 or elapsed >= timeout:
                    break
                
                # Sleep before next check
                time.sleep(1.0)
            
            elapsed = time.time() - start_time
            message = f"Element '{search_term}' not found after {elapsed:.1f}s"
            print(f"[@controller:ADBVerification:waitForElementToAppear] FAILED: {message}")
            
            result_data = {
                'search_term': search_term,
                'attempted_terms': terms,
                'wait_time': elapsed,
                'timeout_reached': True,
                'search_details': {
                    'case_sensitive': False,
                    'search_method': 'contains_any_attribute',
                    'searched_attributes': ['text', 'content_desc', 'resource_id', 'class_name'],
                    'fallback_strategy': len(terms) > 1
                },
                'last_error': final_error
            }
            
            return False, message, result_data
            
        except Exception as e:
            error_msg = f"Wait for element appear error: {e}"
            print(f"[@controller:ADBVerification:waitForElementToAppear] ERROR: {error_msg}")
            
            result_data = {
                'search_term': search_term,
                'error_details': str(e)
            }
            
            return False, error_msg, result_data

    def waitForElementToDisappear(self, search_term: str, timeout: float = 0.0) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Wait for an element matching search_term to disappear. Supports pipe-separated terms for fallback (e.g., "BBC ONE|SRF 1|RTS 1").
        
        Args:
            search_term: The term to search for (case-insensitive, searches all attributes)
                        Can use pipe-separated terms: "text1|text2|text3"
            timeout: Maximum time to wait in seconds (default: 0.0 = check only once, no polling)
        
        Returns:
            Tuple of (success, message, result_data)
        """
        try:
            print(f"[@controller:ADBVerification:waitForElementToDisappear] Waiting for '{search_term}' to disappear (timeout: {timeout}s)")
            
            # Check if we have pipe-separated terms
            if '|' in search_term:
                terms = [term.strip() for term in search_term.split('|') if term.strip()]
                print(f"[@controller:ADBVerification:waitForElementToDisappear] Using fallback strategy with {len(terms)} terms: {terms}")
            else:
                terms = [search_term]
                print(f"[@controller:ADBVerification:waitForElementToDisappear] Using single search term: '{search_term}'")
            
            start_time = time.time()
            
            # Always do at least one check, then continue if timeout > 0
            while True:
                # Check if ANY of the terms still exist (element disappears when NONE are found)
                any_term_found = False
                successful_term = None
                final_matches = []
                final_error = None
                
                for i, term in enumerate(terms):
                    if len(terms) > 1:
                        print(f"[@controller:ADBVerification:waitForElementToDisappear] Checking {i+1}/{len(terms)}: Searching for '{term}'")
                    
                    success, matches, error = self.adb_utils.smart_element_search(self.device_id, term)
                    
                    if error:
                        print(f"[@controller:ADBVerification:waitForElementToDisappear] Search failed for term '{term}': {error}")
                        final_error = error
                    else:
                        if success and matches:
                            any_term_found = True
                            successful_term = term
                            final_matches.extend(matches)  # Collect all matches from all terms
                            print(f"[@controller:ADBVerification:waitForElementToDisappear] Element still present using term '{term}'")
                            # Continue checking other terms to get complete picture
                
                # Element has disappeared if NO terms were found
                if not any_term_found:
                    elapsed = time.time() - start_time
                    message = f"Element '{search_term}' disappeared after {elapsed:.1f}s"
                    print(f"[@controller:ADBVerification:waitForElementToDisappear] SUCCESS: {message}")
                    
                    result_data = {
                        'search_term': search_term,
                        'attempted_terms': terms,
                        'wait_time': elapsed,
                        'search_details': {
                            'case_sensitive': False,
                            'search_method': 'contains_any_attribute',
                            'searched_attributes': ['text', 'content_desc', 'resource_id', 'class_name'],
                            'fallback_strategy': len(terms) > 1
                        }
                    }
                    
                    return True, message, result_data
                
                # Check if we should continue polling
                elapsed = time.time() - start_time
                if timeout <= 0 or elapsed >= timeout:
                    break
                
                # Sleep before next check
                time.sleep(1.0)
            
            elapsed = time.time() - start_time
            message = f"Element '{search_term}' still present after {elapsed:.1f}s"
            print(f"[@controller:ADBVerification:waitForElementToDisappear] FAILED: {message}")
            
            result_data = {
                'search_term': search_term,
                'attempted_terms': terms,
                'wait_time': elapsed,
                'timeout_reached': True,
                'element_still_present': True,
                'search_details': {
                    'case_sensitive': False,
                    'search_method': 'contains_any_attribute',
                    'searched_attributes': ['text', 'content_desc', 'resource_id', 'class_name'],
                    'fallback_strategy': len(terms) > 1
                },
                'last_error': final_error
            }
            
            # Include details of still present elements in failure response
            if successful_term and final_matches:
                result_data['still_present_elements'] = final_matches
                result_data['total_still_present'] = len(final_matches)
                result_data['successful_term'] = successful_term
                print(f"[@controller:ADBVerification:waitForElementToDisappear] {len(final_matches)} elements still present using term '{successful_term}'")
                for match in final_matches:
                    print(f"[@controller:ADBVerification:waitForElementToDisappear] Still present: Element {match['element_id']} - {match['match_reason']}")
            
            return False, message, result_data
            
        except Exception as e:
            error_msg = f"Wait for element disappear error: {e}"
            print(f"[@controller:ADBVerification:waitForElementToDisappear] ERROR: {error_msg}")
            
            result_data = {
                'search_term': search_term,
                'error_details': str(e)
            }
            
            return False, error_msg, result_data
    
    def get_available_verifications(self) -> List[Dict[str, Any]]:
        """Get available verifications for ADB controller."""
        return [
            {
                'command': 'waitForElementToAppear',
                'params': {
                    'search_term': '',      # Empty string for user input
                    'timeout': 0.0,         # Default: single check, no polling
                },
                'verification_type': 'adb'
            },
            {
                'command': 'waitForElementToDisappear',
                'params': {
                    'search_term': '',      # Empty string for user input
                    'timeout': 0.0,         # Default: single check, no polling
                },
                'verification_type': 'adb'
            }
        ]

    def execute_verification(self, verification_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute verification and return frontend-expected format (consistent with image/text).
        
        Args:
            verification_config: {
                'command': 'waitForElementToAppear',
                'params': {
                    'search_term': 'Settings',
                    'timeout': 10.0
                }
            }
            
        Returns:
            Frontend-expected format matching image/text verification
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
                    'message': 'No search term specified for ADB verification',
                    'matching_result': 0.0,
                    'user_threshold': 0.8,
                    'image_filter': 'none',
                    'searchedText': search_term,
                    'extractedText': '',
                    'details': {'error': 'Missing search_term parameter'}
                }
            
            # Optional parameters with defaults
            timeout = float(params.get('timeout', 0.0))
            
            print(f"[@controller:ADBVerification] Executing {command} with search term: '{search_term}'")
            print(f"[@controller:ADBVerification] Parameters: timeout={timeout}")
            
            # Execute verification based on command
            if command == 'waitForElementToAppear':
                success, message, details = self.waitForElementToAppear(
                    search_term=search_term,
                    timeout=timeout
                )
            elif command == 'waitForElementToDisappear':
                success, message, details = self.waitForElementToDisappear(
                    search_term=search_term,
                    timeout=timeout
                )
            else:
                return {
                    'success': False,
                    'message': f'Unknown ADB verification command: {command}',
                    'matching_result': 0.0,
                    'user_threshold': 0.8,
                    'image_filter': 'none',
                    'searchedText': search_term,
                    'extractedText': '',
                    'details': {'error': f'Unsupported command: {command}'}
                }
            
            # Return frontend-expected format (consistent with image/text verification + ADB-specific properties)
            response = {
                'success': success,
                'message': message,
                'matching_result': 1.0 if success else 0.0,  # Binary for ADB (found/not found)
                'user_threshold': 0.8,                       # Default for consistency
                'image_filter': 'none',                      # Not applicable for ADB
                'searchedText': search_term,                 # What we searched for
                'extractedText': f"Found {details.get('total_matches', 0)} matches" if success else "No matches found",
                
                # ADB-specific properties for frontend compatibility
                'search_term': search_term,                  # Frontend expects this
                'wait_time': details.get('wait_time', 0.0),  # Frontend expects this
                'total_matches': details.get('total_matches', 0),  # Frontend expects this
                'matches': details.get('matches', []),       # Frontend expects this
                
                'details': details  # Keep for route processing, will be removed by route
            }
            
            return response
            
        except Exception as e:
            print(f"[@controller:ADBVerification] Execution error: {e}")
            return {
                'success': False,
                'message': f'ADB verification execution error: {str(e)}',
                'matching_result': 0.0,
                'user_threshold': 0.8,
                'image_filter': 'none',
                'searchedText': search_term if 'search_term' in locals() else '',
                'extractedText': '',
                'search_term': search_term if 'search_term' in locals() else '',
                'wait_time': 0.0,
                'total_matches': 0,
                'matches': [],
                'details': {'error': str(e)}
            }
    