"""
Standardized Verification Executor

This module provides a standardized way to execute verifications that can be used by:
- Python code directly (navigation execution, scripts, etc.)
- API endpoints (maintaining consistency)
- Frontend hooks (via API calls)

The core logic is the same as /server/verification/executeBatch but available as a reusable class.
"""

import time
from typing import Dict, List, Optional, Any
from src.web.utils.routeUtils import proxy_to_host_direct


class VerificationExecutor:
    """
    Standardized verification executor that provides consistent verification execution
    across Python code and API endpoints.
    """
    
    def __init__(self, host: Dict[str, Any], device_id: Optional[str] = None, tree_id: str = None, node_id: str = None, team_id: str = None):
        """
        Initialize VerificationExecutor
        
        Args:
            host: Host configuration dict with host_name, devices, etc.
            device_id: Optional device ID for multi-device hosts
            tree_id: Tree ID for navigation context
            node_id: Node ID for navigation context
            team_id: Team ID for database context
        """
        self.host = host
        self.device_id = device_id
        self.tree_id = tree_id
        self.node_id = node_id
        
        # team_id is required
        self.team_id = team_id
        
        # Validate host configuration
        if not host or not host.get('host_name'):
            raise ValueError("Host configuration with host_name is required")
    
    def execute_verifications(self, 
                            verifications: List[Dict[str, Any]], 
                            image_source_url: Optional[str] = None,
                            model: Optional[str] = None) -> Dict[str, Any]:
        """
        Execute batch of verifications
        
        Args:
            verifications: List of verification dictionaries
            image_source_url: Optional source image URL for image/text verifications
            model: Optional device model for verification context

            
        Returns:
            Dict with success status, results, and execution statistics
        """
        print(f"[@lib:verification_executor:execute_verifications] Starting batch verification execution")
        print(f"[@lib:verification_executor:execute_verifications] Processing {len(verifications)} verifications")
        print(f"[@lib:verification_executor:execute_verifications] Host: {self.host.get('host_name')}")
        print(f"[@lib:verification_executor:execute_verifications] Source: {image_source_url}")
        

        
        # Validate inputs
        if not verifications:
            return {
                'success': True,
                'message': 'No verifications to execute',
                'results': [],
                'passed_count': 0,
                'total_count': 0
            }
        
        # Filter valid verifications
        valid_verifications = self._filter_valid_verifications(verifications)
        
        if not valid_verifications:
            return {
                'success': False,
                'error': 'All verifications were invalid and filtered out',
                'results': [],
                'passed_count': 0,
                'total_count': 0
            }
        
        results = []
        passed_count = 0
        
        # Execute each verification
        for i, verification in enumerate(valid_verifications):
            verification_type = verification.get('verification_type', 'text')
            
            print(f"[@lib:verification_executor:execute_verifications] Processing verification {i+1}/{len(valid_verifications)}: {verification_type}")
            
            start_time = time.time()
            result = self._execute_single_verification(verification, image_source_url, model)
            execution_time = int((time.time() - start_time) * 1000)
            
                        # Add execution time to result
            result['execution_time_ms'] = execution_time
            results.append(result)
            
            # Count successful verifications
            if result.get('success'):
                passed_count += 1
            
            # Record execution directly to database
            self._record_verification_to_database(
                success=result.get('success', False),
                execution_time_ms=execution_time,
                message=result.get('message', ''),
                error_details={'error': result.get('error')} if result.get('error') else None
            )
        

        
        # Calculate overall success
        overall_success = passed_count == len(valid_verifications)
        
        print(f"[@lib:verification_executor:execute_verifications] Batch completed: {passed_count}/{len(valid_verifications)} passed")
        
        return {
            'success': overall_success,
            'total_count': len(valid_verifications),
            'passed_count': passed_count,
            'failed_count': len(valid_verifications) - passed_count,
            'results': results,
            'message': f'Batch verification completed: {passed_count}/{len(valid_verifications)} passed'
        }
    
    def _filter_valid_verifications(self, verifications: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Filter out invalid verifications"""
        valid_verifications = []
        
        for i, verification in enumerate(verifications):
            verification_type = verification.get('verification_type', 'text')
            
            if not verification.get('command') or verification.get('command', '').strip() == '':
                print(f"[@lib:verification_executor:_filter_valid_verifications] Removing verification {i}: No command specified")
                continue
            
            # Type-specific validation
            if verification_type == 'image':
                if not verification.get('params', {}).get('image_path'):
                    print(f"[@lib:verification_executor:_filter_valid_verifications] Removing verification {i}: No image reference specified")
                    continue
            elif verification_type == 'text':
                if not verification.get('params', {}).get('text'):
                    print(f"[@lib:verification_executor:_filter_valid_verifications] Removing verification {i}: No text specified")
                    continue
            elif verification_type == 'adb':
                if not verification.get('params', {}).get('search_term'):
                    print(f"[@lib:verification_executor:_filter_valid_verifications] Removing verification {i}: No search term specified")
                    continue
            
            valid_verifications.append(verification)
        
        return valid_verifications
    
    def _execute_single_verification(self, verification: Dict[str, Any], image_source_url: Optional[str], model: Optional[str]) -> Dict[str, Any]:
        """Execute a single verification and return standardized result"""
        try:
            verification_type = verification.get('verification_type', 'text')
            
            # Prepare individual request data
            individual_request = {
                'verification': verification,
                'image_source_url': image_source_url,
                'model': model
            }
            
            # Dispatch to appropriate host endpoint based on verification type using direct host info (no Flask context needed)
            if verification_type == 'image':
                result, status = proxy_to_host_direct(self.host, '/host/verification/image/execute', 'POST', individual_request, timeout=60)
            elif verification_type == 'text':
                result, status = proxy_to_host_direct(self.host, '/host/verification/text/execute', 'POST', individual_request, timeout=60)
            elif verification_type == 'adb':
                result, status = proxy_to_host_direct(self.host, '/host/verification/adb/execute', 'POST', individual_request, timeout=60)
            elif verification_type == 'appium':
                result, status = proxy_to_host_direct(self.host, '/host/verification/appium/execute', 'POST', individual_request, timeout=60)
            elif verification_type == 'audio':
                result, status = proxy_to_host_direct(self.host, '/host/verification/audio/execute', 'POST', individual_request, timeout=60)
            elif verification_type == 'video':
                result, status = proxy_to_host_direct(self.host, '/host/verification/video/execute', 'POST', individual_request, timeout=60)
            else:
                return {
                    'success': False,
                    'error': f'Unknown verification type: {verification_type}',
                    'verification_type': verification_type,
                    'resultType': 'FAIL'
                }
            
            # Handle proxy errors and flatten verification results
            if status != 200:
                return {
                    'success': False,
                    'error': f'Host request failed with status {status}',
                    'verification_type': verification_type,
                    'resultType': 'FAIL'
                }
            
            # Flatten the result (same logic as API)
            verification_result = result
            
            flattened_result = {
                'success': verification_result.get('success', False),
                'message': verification_result.get('message'),
                'error': verification_result.get('error'),
                'threshold': verification_result.get('threshold') or verification_result.get('confidence') or verification_result.get('userThreshold', 0.8),
                'resultType': 'PASS' if verification_result.get('success', False) else 'FAIL',
                'sourceImageUrl': verification_result.get('sourceUrl'),
                'referenceImageUrl': verification_result.get('referenceUrl'),
                'resultOverlayUrl': verification_result.get('overlayUrl'),
                'extractedText': verification_result.get('extractedText', ''),
                'searchedText': verification_result.get('searchedText', ''),
                'imageFilter': verification_result.get('imageFilter', 'none'),
                'detectedLanguage': verification_result.get('detected_language'),
                'languageConfidence': verification_result.get('language_confidence'),
                # ADB-specific fields
                'search_term': verification_result.get('search_term'),
                'wait_time': verification_result.get('wait_time'),
                'total_matches': verification_result.get('total_matches'),
                'matches': verification_result.get('matches'),
                # Appium-specific fields
                'platform': verification_result.get('platform'),
                # Audio/Video-specific fields  
                'motion_threshold': verification_result.get('motion_threshold'),
                'duration': verification_result.get('duration'),
                'frequency': verification_result.get('frequency'),
                'audio_level': verification_result.get('audio_level'),
                # General fields
                'verification_type': verification_result.get('verification_type', verification_type),
                'execution_time_ms': verification_result.get('execution_time_ms'),
                'details': verification_result.get('details', {})
            }
            
            print(f"[@lib:verification_executor:_execute_single_verification] Verification result: success={flattened_result['success']}, type={flattened_result['verification_type']}")
            
            return flattened_result
            
        except Exception as e:
            print(f"[@lib:verification_executor:_execute_single_verification] Verification error: {str(e)}")
            
            return {
                'success': False,
                'message': f"Verification execution failed",
                'error': str(e),
                'verification_type': verification.get('verification_type', 'unknown'),
                'resultType': 'FAIL'
            }
    
    def _record_verification_to_database(self, success: bool, execution_time_ms: int, message: str, error_details: Optional[Dict] = None):
        """Record single verification directly to database"""
        try:
            from src.lib.supabase.execution_results_db import record_node_execution
            
            record_node_execution(
                team_id=self.team_id,
                tree_id=self.tree_id,
                node_id=self.node_id,
                host_name=self.host.get('host_name'),
                device_model=self.host.get('device_model'),
                success=success,
                execution_time_ms=execution_time_ms,
                message=message,
                error_details=error_details,
                script_result_id=getattr(self, 'script_result_id', None),
                script_context=getattr(self, 'script_context', 'direct')
            )
            
        except Exception as e:
            print(f"[@lib:verification_executor:_record_verification_to_database] Database recording error: {e}") 