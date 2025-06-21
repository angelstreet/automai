"""
Centralized Verification Controller

This module provides a unified interface for executing verifications that can be used by:
- Server routes (for frontend requests)
- Python scripts (for autonomous execution)
- Background tasks
- Test automation

All verification logic is centralized here to avoid duplication.
"""

import time
from typing import Dict, Any, List, Optional
from src.utils.host_utils import get_local_controller


class VerificationController:
    """
    Centralized verification controller that handles all verification execution logic.
    
    This class encapsulates all verification workflows and can be used by:
    - Server routes
    - Python scripts
    - Background automation
    """
    
    def __init__(self, host_device: Dict[str, Any] = None):
        """
        Initialize verification controller.
        
        Args:
            host_device: Host device information (optional, can be set later)
        """
        self.host_device = host_device
        self.controllers_cache = {}
        
        print(f"[@controller:VerificationController] Initialized")
    
    def set_host_device(self, host_device: Dict[str, Any]):
        """Set or update host device information"""
        self.host_device = host_device
        # Clear controllers cache when host changes
        self.controllers_cache.clear()
        print(f"[@controller:VerificationController] Host device updated: {host_device.get('device_model', 'unknown')}")
    
    def get_controller(self, controller_type: str):
        """Get controller instance with caching"""
        if controller_type not in self.controllers_cache:
            controller = get_local_controller(controller_type)
            if controller:
                self.controllers_cache[controller_type] = controller
                print(f"[@controller:VerificationController] Cached controller: {controller_type}")
            else:
                print(f"[@controller:VerificationController] Controller not available: {controller_type}")
                return None
        
        return self.controllers_cache.get(controller_type)
    
    def execute_verifications(self, verifications: List[Dict[str, Any]], 
                            source_filename: str = None) -> Dict[str, Any]:
        """
        Execute multiple verifications in batch.
        
        Args:
            verifications: List of verification configurations
            source_filename: Optional source screenshot filename (if None, will take new screenshot)
            
        Returns:
            {
                'success': bool,
                'results': List[Dict],
                'passed_count': int,
                'total_count': int,
                'execution_time_ms': int
            }
        """
        start_time = time.time()
        
        print(f"[@controller:VerificationController] Executing {len(verifications)} verifications")
        
        if not verifications:
            return {
                'success': False,
                'error': 'No verifications provided',
                'results': [],
                'passed_count': 0,
                'total_count': 0,
                'execution_time_ms': 0
            }
        
        # Take screenshot if not provided
        source_path = None
        if source_filename:
            source_path = f'/var/www/html/stream/captures/{source_filename}'
            print(f"[@controller:VerificationController] Using provided screenshot: {source_filename}")
        else:
            source_path = self._take_screenshot()
            if not source_path:
                return {
                    'success': False,
                    'error': 'Failed to capture screenshot',
                    'results': [],
                    'passed_count': 0,
                    'total_count': 0,
                    'execution_time_ms': int((time.time() - start_time) * 1000)
                }
        
        # Execute each verification
        results = []
        passed_count = 0
        
        for i, verification in enumerate(verifications):
            print(f"[@controller:VerificationController] Executing verification {i+1}/{len(verifications)}: {verification.get('verification_type', 'unknown')}")
            
            result = self.execute_verification_autonomous(verification, source_path)
            results.append(result)
            
            if result.get('success'):
                passed_count += 1
        
        execution_time_ms = int((time.time() - start_time) * 1000)
        overall_success = passed_count == len(verifications)
        
        print(f"[@controller:VerificationController] Batch completed: {passed_count}/{len(verifications)} passed in {execution_time_ms}ms")
        
        return {
            'success': overall_success,
            'results': results,
            'passed_count': passed_count,
            'total_count': len(verifications),
            'failed_count': len(verifications) - passed_count,
            'execution_time_ms': execution_time_ms
        }
    
    def execute_verification_autonomous(self, verification_config: Dict[str, Any], 
                                      source_path: str = None) -> Dict[str, Any]:
        """
        Execute single verification autonomously.
        
        Args:
            verification_config: Verification configuration
            source_path: Optional source image path (if None, will take screenshot)
            
        Returns:
            {
                'success': bool,
                'message': str,
                'confidence': float,
                'verification_type': str,
                'execution_time_ms': int,
                'details': dict
            }
        """
        start_time = time.time()
        
        verification_type = verification_config.get('verification_type', 'text')
        print(f"[@controller:VerificationController] Executing {verification_type} verification")
        
        try:
            # Get verification controller
            verification_controller = self.get_controller(f'verification_{verification_type}')
            if not verification_controller:
                return {
                    'success': False,
                    'message': f'Verification controller not available: {verification_type}',
                    'confidence': 0.0,
                    'verification_type': verification_type,
                    'execution_time_ms': int((time.time() - start_time) * 1000),
                    'error': f'Controller not found: verification_{verification_type}',
                    'details': {}
                }
            
            # Take screenshot if not provided
            if not source_path:
                source_path = self._take_screenshot()
                if not source_path:
                    return {
                        'success': False,
                        'message': 'Failed to capture screenshot for verification',
                        'confidence': 0.0,
                        'verification_type': verification_type,
                        'execution_time_ms': int((time.time() - start_time) * 1000),
                        'error': 'Screenshot capture failed',
                        'details': {}
                    }
            
            # Execute verification using unified interface
            result = verification_controller.execute_verification(verification_config, source_path)
            
            execution_time_ms = int((time.time() - start_time) * 1000)
            
            # Ensure result has required fields
            if isinstance(result, dict):
                result['verification_type'] = verification_type
                result['execution_time_ms'] = execution_time_ms
                
                # Normalize confidence field
                if 'threshold' in result and 'confidence' not in result:
                    result['confidence'] = result['threshold']
                elif 'confidence' not in result:
                    result['confidence'] = 1.0 if result.get('success') else 0.0
                
                print(f"[@controller:VerificationController] Verification completed: {result.get('success')} in {execution_time_ms}ms")
                return result
            else:
                # Handle legacy tuple return format
                success, message, details = result
                return {
                    'success': success,
                    'message': message,
                    'confidence': details.get('threshold', 1.0 if success else 0.0),
                    'verification_type': verification_type,
                    'execution_time_ms': execution_time_ms,
                    'details': details
                }
                
        except Exception as e:
            execution_time_ms = int((time.time() - start_time) * 1000)
            error_msg = f'Verification execution error: {str(e)}'
            print(f"[@controller:VerificationController] {error_msg}")
            
            return {
                'success': False,
                'message': error_msg,
                'confidence': 0.0,
                'verification_type': verification_type,
                'execution_time_ms': execution_time_ms,
                'error': str(e),
                'details': {}
            }
    
    def _take_screenshot(self) -> Optional[str]:
        """Take screenshot using AV controller"""
        try:
            av_controller = self.get_controller('av')
            if not av_controller:
                print(f"[@controller:VerificationController] AV controller not available")
                return None
            
            screenshot_path = av_controller.take_screenshot()
            if screenshot_path:
                print(f"[@controller:VerificationController] Screenshot taken: {screenshot_path}")
                return screenshot_path
            else:
                print(f"[@controller:VerificationController] Screenshot capture failed")
                return None
                
        except Exception as e:
            print(f"[@controller:VerificationController] Screenshot error: {e}")
            return None
    
    def get_available_verification_types(self) -> List[str]:
        """Get list of available verification types on this host"""
        available_types = []
        
        for verification_type in ['image', 'text', 'adb', 'appium', 'audio', 'video']:
            controller = self.get_controller(f'verification_{verification_type}')
            if controller:
                available_types.append(verification_type)
        
        print(f"[@controller:VerificationController] Available verification types: {available_types}")
        return available_types
    
    def get_verification_capabilities(self) -> Dict[str, Any]:
        """Get detailed verification capabilities"""
        capabilities = {
            'available_types': self.get_available_verification_types(),
            'av_controller_available': self.get_controller('av') is not None,
            'host_device': self.host_device.get('device_model') if self.host_device else None
        }
        
        # Get capabilities from each verification controller
        for verification_type in capabilities['available_types']:
            controller = self.get_controller(f'verification_{verification_type}')
            if controller and hasattr(controller, 'get_available_verifications'):
                capabilities[f'{verification_type}_verifications'] = controller.get_available_verifications()
        
        return capabilities

    # =====================================================
    # REFERENCE MANAGEMENT FUNCTIONS (Extracted from Routes)
    # =====================================================
    
    def get_all_references(self, team_id: str = None) -> Dict[str, Any]:
        """
        Get all references from database for the host device model.
        
        Args:
            team_id: Team ID (optional, will use default if not provided)
            
        Returns:
            {
                'success': bool,
                'images': List[Dict],
                'count': int,
                'device_model': str,
                'error': str (if failed)
            }
        """
        try:
            print(f"[@controller:VerificationController:get_all_references] Getting all references from database")
            
            if not self.host_device:
                return {
                    'success': False,
                    'error': 'Host device information required',
                    'images': [],
                    'count': 0
                }
            
            # Get device model
            device_model = self.host_device.get('device_model', 'default')
            print(f"[@controller:VerificationController:get_all_references] Using device model: {device_model}")
            
            # Get team_id with fallback
            if not team_id:
                from src.utils.app_utils import DEFAULT_TEAM_ID
                team_id = DEFAULT_TEAM_ID
            
            # Get references from database
            from src.lib.supabase.images_db import get_images
            
            result = get_images(
                team_id=team_id,
                device_model=device_model
            )
            
            if result['success']:
                images = result['images']
                print(f"[@controller:VerificationController:get_all_references] Found {len(images)} references from database")
                
                return {
                    'success': True,
                    'images': images,
                    'count': len(images),
                    'device_model': device_model
                }
            else:
                print(f"[@controller:VerificationController:get_all_references] Database query failed: {result.get('error')}")
                return {
                    'success': False,
                    'error': result.get('error', 'Database query failed'),
                    'images': [],
                    'count': 0,
                    'device_model': device_model
                }
                
        except Exception as e:
            print(f"[@controller:VerificationController:get_all_references] Error: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'images': [],
                'count': 0
            }
    
    def get_image_references(self, team_id: str = None) -> Dict[str, Any]:
        """
        Get image references from database for the host device model.
        
        Args:
            team_id: Team ID (optional, will use default if not provided)
            
        Returns:
            {
                'success': bool,
                'images': List[Dict],
                'count': int,
                'device_model': str,
                'error': str (if failed)
            }
        """
        try:
            print(f"[@controller:VerificationController:get_image_references] Getting image references from database")
            
            if not self.host_device:
                return {
                    'success': False,
                    'error': 'Host device information required',
                    'images': [],
                    'count': 0
                }
            
            # Get device model
            device_model = self.host_device.get('device_model', 'default')
            print(f"[@controller:VerificationController:get_image_references] Using device model: {device_model}")
            
            # Get team_id with fallback
            if not team_id:
                from src.utils.app_utils import DEFAULT_TEAM_ID
                team_id = DEFAULT_TEAM_ID
            
            # Get image references from database
            from src.lib.supabase.images_db import get_images
            
            result = get_images(
                team_id=team_id,
                device_model=device_model,
                image_type='reference_image'
            )
            
            if result['success']:
                images = result['images']
                print(f"[@controller:VerificationController:get_image_references] Found {len(images)} image references from database")
                
                return {
                    'success': True,
                    'images': images,
                    'count': len(images),
                    'device_model': device_model
                }
            else:
                print(f"[@controller:VerificationController:get_image_references] Database query failed: {result.get('error')}")
                return {
                    'success': False,
                    'error': result.get('error', 'Database query failed'),
                    'images': [],
                    'count': 0,
                    'device_model': device_model
                }
                
        except Exception as e:
            print(f"[@controller:VerificationController:get_image_references] Error: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'images': [],
                'count': 0
            }
    
    def get_text_references(self, team_id: str = None) -> Dict[str, Any]:
        """
        Get text references from database for the host device model.
        
        Args:
            team_id: Team ID (optional, will use default if not provided)
            
        Returns:
            {
                'success': bool,
                'images': List[Dict],
                'count': int,
                'device_model': str,
                'error': str (if failed)
            }
        """
        try:
            print(f"[@controller:VerificationController:get_text_references] Getting text references from database")
            
            if not self.host_device:
                return {
                    'success': False,
                    'error': 'Host device information required',
                    'images': [],
                    'count': 0
                }
            
            # Get device model
            device_model = self.host_device.get('device_model', 'default')
            print(f"[@controller:VerificationController:get_text_references] Using device model: {device_model}")
            
            # Get team_id with fallback
            if not team_id:
                from src.utils.app_utils import DEFAULT_TEAM_ID
                team_id = DEFAULT_TEAM_ID
            
            # Get text references from database
            from src.lib.supabase.images_db import get_images
            
            result = get_images(
                team_id=team_id,
                device_model=device_model,
                image_type='reference_text'
            )
            
            if result['success']:
                images = result['images']
                print(f"[@controller:VerificationController:get_text_references] Found {len(images)} text references from database")
                
                return {
                    'success': True,
                    'images': images,
                    'count': len(images),
                    'device_model': device_model
                }
            else:
                print(f"[@controller:VerificationController:get_text_references] Database query failed: {result.get('error')}")
                return {
                    'success': False,
                    'error': result.get('error', 'Database query failed'),
                    'images': [],
                    'count': 0,
                    'device_model': device_model
                }
                
        except Exception as e:
            print(f"[@controller:VerificationController:get_text_references] Error: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'images': [],
                'count': 0
            }
    
    def validate_reference_exists(self, reference_name: str, reference_type: str = 'reference_image', team_id: str = None) -> Dict[str, Any]:
        """
        Validate that a reference exists in the database for the host device model.
        
        Args:
            reference_name: Name of the reference to validate
            reference_type: Type of reference ('reference_image' or 'reference_text')
            team_id: Team ID (optional, will use default if not provided)
            
        Returns:
            {
                'success': bool,
                'exists': bool,
                'reference': Dict (if exists),
                'error': str (if failed)
            }
        """
        try:
            print(f"[@controller:VerificationController:validate_reference_exists] Validating reference: {reference_name} ({reference_type})")
            
            if not self.host_device:
                return {
                    'success': False,
                    'exists': False,
                    'error': 'Host device information required'
                }
            
            # Get device model
            device_model = self.host_device.get('device_model', 'default')
            
            # Get team_id with fallback
            if not team_id:
                from src.utils.app_utils import DEFAULT_TEAM_ID
                team_id = DEFAULT_TEAM_ID
            
            # Get references from database
            from src.lib.supabase.images_db import get_images
            
            result = get_images(
                team_id=team_id,
                device_model=device_model,
                image_type=reference_type,
                name=reference_name
            )
            
            if result['success']:
                images = result['images']
                
                # Look for exact match
                matching_reference = None
                for image in images:
                    if image.get('name') == reference_name:
                        matching_reference = image
                        break
                
                if matching_reference:
                    print(f"[@controller:VerificationController:validate_reference_exists] Reference found: {reference_name}")
                    return {
                        'success': True,
                        'exists': True,
                        'reference': matching_reference
                    }
                else:
                    print(f"[@controller:VerificationController:validate_reference_exists] Reference not found: {reference_name}")
                    return {
                        'success': True,
                        'exists': False,
                        'error': f'Reference "{reference_name}" not found for device model "{device_model}"'
                    }
            else:
                print(f"[@controller:VerificationController:validate_reference_exists] Database query failed: {result.get('error')}")
                return {
                    'success': False,
                    'exists': False,
                    'error': result.get('error', 'Database query failed')
                }
                
        except Exception as e:
            print(f"[@controller:VerificationController:validate_reference_exists] Error: {str(e)}")
            return {
                'success': False,
                'exists': False,
                'error': str(e)
            }


# Global instance for easy access
_global_verification_controller = None

def get_verification_controller(host_device: Dict[str, Any] = None) -> VerificationController:
    """
    Get global verification controller instance.
    
    Args:
        host_device: Optional host device to set/update
        
    Returns:
        VerificationController instance
    """
    global _global_verification_controller
    
    if _global_verification_controller is None:
        _global_verification_controller = VerificationController(host_device)
    elif host_device:
        _global_verification_controller.set_host_device(host_device)
    
    return _global_verification_controller


# Convenience functions for direct use
def execute_verifications(verifications: List[Dict[str, Any]], 
                         host_device: Dict[str, Any] = None,
                         source_filename: str = None) -> Dict[str, Any]:
    """
    Convenience function to execute multiple verifications.
    
    Usage:
        from src.controllers.verification_controller import execute_verifications
        
        result = execute_verifications([
            {
                'verification_type': 'image',
                'params': {
                    'image_path': 'reference.jpg',
                    'threshold': 0.8
                }
            }
        ])
    """
    controller = get_verification_controller(host_device)
    return controller.execute_verifications(verifications, source_filename)


def execute_verification(verification_config: Dict[str, Any],
                        host_device: Dict[str, Any] = None,
                        source_path: str = None) -> Dict[str, Any]:
    """
    Convenience function to execute single verification.
    
    Usage:
        from src.controllers.verification_controller import execute_verification
        
        result = execute_verification({
            'verification_type': 'text',
            'params': {
                'text': 'Hello World',
                'area': {'x': 100, 'y': 100, 'width': 200, 'height': 200}
            }
        })
    """
    controller = get_verification_controller(host_device)
    return controller.execute_verification_autonomous(verification_config, source_path)


# =====================================================
# REFERENCE MANAGEMENT CONVENIENCE FUNCTIONS
# =====================================================

def get_all_references(host_device: Dict[str, Any], team_id: str = None) -> Dict[str, Any]:
    """
    Convenience function to get all references for a host device.
    
    Usage:
        from src.controllers.verification_controller import get_all_references
        
        result = get_all_references(host_object)
        if result['success']:
            print(f"Found {result['count']} references")
            for image in result['images']:
                print(f"  - {image['name']} ({image['type']})")
    """
    controller = get_verification_controller(host_device)
    return controller.get_all_references(team_id)


def get_image_references(host_device: Dict[str, Any], team_id: str = None) -> Dict[str, Any]:
    """
    Convenience function to get image references for a host device.
    
    Usage:
        from src.controllers.verification_controller import get_image_references
        
        result = get_image_references(host_object)
        if result['success']:
            print(f"Found {result['count']} image references")
    """
    controller = get_verification_controller(host_device)
    return controller.get_image_references(team_id)


def get_text_references(host_device: Dict[str, Any], team_id: str = None) -> Dict[str, Any]:
    """
    Convenience function to get text references for a host device.
    
    Usage:
        from src.controllers.verification_controller import get_text_references
        
        result = get_text_references(host_object)
        if result['success']:
            print(f"Found {result['count']} text references")
    """
    controller = get_verification_controller(host_device)
    return controller.get_text_references(team_id)


def validate_reference_exists(reference_name: str, host_device: Dict[str, Any], 
                             reference_type: str = 'reference_image', 
                             team_id: str = None) -> Dict[str, Any]:
    """
    Convenience function to validate that a reference exists.
    
    Usage:
        from src.controllers.verification_controller import validate_reference_exists
        
        result = validate_reference_exists('default_capture.png', host_object)
        if result['success'] and result['exists']:
            print(f"Reference found: {result['reference']['name']}")
        else:
            print(f"Reference not found: {result['error']}")
    """
    controller = get_verification_controller(host_device)
    return controller.validate_reference_exists(reference_name, reference_type, team_id) 