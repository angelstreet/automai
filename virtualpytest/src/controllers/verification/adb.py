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

    def waitForElementToAppear(self, **criteria) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Wait for an element matching criteria to appear.
        
        Args:
            **criteria: Element search criteria (resource_id, text, content_desc, class_name, timeout, check_interval)
        
        Returns:
            Tuple of (success, message, element_data)
        """
        try:
            timeout = criteria.get('timeout', 10.0)
            check_interval = criteria.get('check_interval', 1.0)
            
            print(f"[@controller:ADBVerification:waitForElementToAppear] Waiting for element (timeout: {timeout}s)")
            print(f"[@controller:ADBVerification:waitForElementToAppear] Criteria: {criteria}")
            
            start_time = time.time()
            
            while time.time() - start_time < timeout:
                # Use efficient element existence check that returns element details
                exists, element, error = self.adb_utils.check_element_exists(self.device_id, **criteria)
                
                if error:
                    print(f"[@controller:ADBVerification:waitForElementToAppear] Check failed: {error}")
                    # Continue checking even if one check fails
                
                if exists:
                    elapsed = time.time() - start_time
                    message = f"Element appeared after {elapsed:.1f}s"
                    print(f"[@controller:ADBVerification:waitForElementToAppear] SUCCESS: {message}")
                    
                    result_data = {
                        'criteria': criteria,
                        'wait_time': elapsed
                    }
                    
                    # Add element details if we have them
                    if element:
                        result_data['element'] = element.to_dict()
                        print(f"[@controller:ADBVerification:waitForElementToAppear] Element details: {element.to_dict()}")
                    else:
                        print(f"[@controller:ADBVerification:waitForElementToAppear] Element found but no details available")
                    
                    return True, message, result_data
                
                time.sleep(check_interval)
            
            elapsed = time.time() - start_time
            message = f"Element did not appear within {elapsed:.1f}s"
            print(f"[@controller:ADBVerification:waitForElementToAppear] FAILED: {message}")
            
            return False, message, {'wait_time': elapsed}
            
        except Exception as e:
            error_msg = f"Wait for element appear error: {e}"
            print(f"[@controller:ADBVerification:waitForElementToAppear] ERROR: {error_msg}")
            return False, error_msg, {}

    def waitForElementToDisappear(self, **criteria) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Wait for an element matching criteria to disappear.
        
        Args:
            **criteria: Element search criteria (same as waitForElementToAppear)
        
        Returns:
            Tuple of (success, message, element_data)
        """
        try:
            timeout = criteria.get('timeout', 10.0)
            check_interval = criteria.get('check_interval', 1.0)
            
            print(f"[@controller:ADBVerification:waitForElementToDisappear] Waiting for element to disappear (timeout: {timeout}s)")
            print(f"[@controller:ADBVerification:waitForElementToDisappear] Criteria: {criteria}")
            
            start_time = time.time()
            
            while time.time() - start_time < timeout:
                # Use efficient element existence check that returns element details
                exists, element, error = self.adb_utils.check_element_exists(self.device_id, **criteria)
                
                if error:
                    print(f"[@controller:ADBVerification:waitForElementToDisappear] Check failed: {error}")
                    # Continue checking even if one check fails
                
                if not exists:
                    elapsed = time.time() - start_time
                    message = f"Element disappeared after {elapsed:.1f}s"
                    print(f"[@controller:ADBVerification:waitForElementToDisappear] SUCCESS: {message}")
                    
                    return True, message, {'wait_time': elapsed}
                
                time.sleep(check_interval)
            
            elapsed = time.time() - start_time
            message = f"Element still present after {elapsed:.1f}s"
            print(f"[@controller:ADBVerification:waitForElementToDisappear] FAILED: {message}")
            
            # If element is still present, include its details in the failure response
            result_data = {'wait_time': elapsed}
            
            # Get final check to include element details in failure
            try:
                final_exists, final_element, _ = self.adb_utils.check_element_exists(self.device_id, **criteria)
                if final_exists and final_element:
                    result_data['still_present_element'] = final_element.to_dict()
                    print(f"[@controller:ADBVerification:waitForElementToDisappear] Element still present: {final_element.to_dict()}")
            except:
                pass  # Don't fail the whole operation if final check fails
            
            return False, message, result_data
            
        except Exception as e:
            error_msg = f"Wait for element disappear error: {e}"
            print(f"[@controller:ADBVerification:waitForElementToDisappear] ERROR: {error_msg}")
            return False, error_msg, {}
    