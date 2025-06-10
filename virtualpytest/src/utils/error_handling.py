# Error Handling Utilities
# 
# This module provides standardized error responses and codes for the VirtualPyTest API
# without modifying any existing business logic.

from flask import jsonify
from typing import Dict, Any, Optional
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Error Code Definitions
class ErrorCodes:
    """Standardized error codes for consistent API responses"""
    
    # 400 - Bad Request
    MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD"
    INVALID_PARAMETER_VALUE = "INVALID_PARAMETER_VALUE"
    INVALID_DEVICE_MODEL = "INVALID_DEVICE_MODEL"
    INVALID_COORDINATES = "INVALID_COORDINATES"
    MALFORMED_REQUEST = "MALFORMED_REQUEST"
    
    # 404 - Not Found
    DEVICE_NOT_FOUND = "DEVICE_NOT_FOUND"
    HOST_NOT_FOUND = "HOST_NOT_FOUND"
    REFERENCE_NOT_FOUND = "REFERENCE_NOT_FOUND"
    ENDPOINT_NOT_FOUND = "ENDPOINT_NOT_FOUND"
    
    # 409 - Conflict
    DEVICE_ALREADY_LOCKED = "DEVICE_ALREADY_LOCKED"
    SESSION_CONFLICT = "SESSION_CONFLICT"
    RESOURCE_LOCKED = "RESOURCE_LOCKED"
    
    # 422 - Unprocessable Entity
    DEVICE_NOT_READY = "DEVICE_NOT_READY"
    HOST_NOT_INITIALIZED = "HOST_NOT_INITIALIZED"
    CONTROLLER_NOT_AVAILABLE = "CONTROLLER_NOT_AVAILABLE"
    SERVICE_NOT_RUNNING = "SERVICE_NOT_RUNNING"
    
    # 500 - Internal Server Error
    CONTROLLER_ERROR = "CONTROLLER_ERROR"
    NETWORK_ERROR = "NETWORK_ERROR"
    INFRASTRUCTURE_ERROR = "INFRASTRUCTURE_ERROR"
    VERIFICATION_ERROR = "VERIFICATION_ERROR"
    
    # 503 - Service Unavailable
    HOST_UNREACHABLE = "HOST_UNREACHABLE"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    SYSTEM_OVERLOADED = "SYSTEM_OVERLOADED"

class ErrorTypes:
    """Error type categories for grouping related errors"""
    
    CLIENT_ERROR = "client_error"
    DEVICE_STATE = "device_state"
    INFRASTRUCTURE = "infrastructure"
    NETWORK = "network"
    RESOURCE_CONFLICT = "resource_conflict"
    SYSTEM = "system"
    VALIDATION = "validation"

def create_error_response(
    error_code: str,
    message: str,
    error_type: str = ErrorTypes.SYSTEM,
    details: Optional[Dict[str, Any]] = None,
    status_code: int = 500
) -> tuple:
    """
    Create a standardized error response.
    
    Args:
        error_code: Specific error code from ErrorCodes class
        message: Human-readable error message
        error_type: Error category from ErrorTypes class
        details: Additional context information
        status_code: HTTP status code
        
    Returns:
        Tuple of (response, status_code) for Flask
    """
    response_data = {
        "success": False,
        "error_code": error_code,
        "error_type": error_type,
        "message": message
    }
    
    if details:
        response_data["details"] = details
    
    # Log the error for debugging
    logger.error(f"[{error_code}] {message} - Details: {details}")
    
    return jsonify(response_data), status_code

# Specific error response functions for common scenarios

def missing_required_field(field_name: str) -> tuple:
    """Standard response for missing required fields"""
    return create_error_response(
        error_code=ErrorCodes.MISSING_REQUIRED_FIELD,
        message=f"Required field '{field_name}' is missing",
        error_type=ErrorTypes.CLIENT_ERROR,
        details={"missing_field": field_name},
        status_code=400
    )

def invalid_parameter_value(field_name: str, value: Any, expected: str = None) -> tuple:
    """Standard response for invalid parameter values"""
    details = {"field": field_name, "provided_value": str(value)}
    if expected:
        details["expected"] = expected
        
    return create_error_response(
        error_code=ErrorCodes.INVALID_PARAMETER_VALUE,
        message=f"Invalid value for '{field_name}': {value}",
        error_type=ErrorTypes.CLIENT_ERROR,
        details=details,
        status_code=400
    )

def device_not_found(device_id: str) -> tuple:
    """Standard response for device not found"""
    return create_error_response(
        error_code=ErrorCodes.DEVICE_NOT_FOUND,
        message=f"Device not found: {device_id}",
        error_type=ErrorTypes.DEVICE_STATE,
        details={"device_id": device_id},
        status_code=404
    )

def host_not_initialized(host_ip: str = None) -> tuple:
    """Standard response for host device object not initialized"""
    details = {}
    if host_ip:
        details["host_ip"] = host_ip
        details["suggested_action"] = "restart_host_service"
    
    return create_error_response(
        error_code=ErrorCodes.HOST_NOT_INITIALIZED,
        message="Host device object not initialized. Host may need to re-register.",
        error_type=ErrorTypes.INFRASTRUCTURE,
        details=details,
        status_code=422
    )

def device_not_ready(device_ip: str, device_port: int, reason: str) -> tuple:
    """Standard response for device not ready"""
    return create_error_response(
        error_code=ErrorCodes.DEVICE_NOT_READY,
        message=f"Device not ready: {reason}",
        error_type=ErrorTypes.DEVICE_STATE,
        details={
            "device_ip": device_ip,
            "device_port": device_port,
            "reason": reason,
            "suggested_action": "check_device_connection"
        },
        status_code=422
    )

def service_not_running(service_name: str, service_status: str = None) -> tuple:
    """Standard response for service not running"""
    details = {
        "service_name": service_name,
        "suggested_action": f"restart_{service_name}_service"
    }
    if service_status:
        details["service_status"] = service_status
    
    return create_error_response(
        error_code=ErrorCodes.SERVICE_NOT_RUNNING,
        message=f"Service '{service_name}' is not running",
        error_type=ErrorTypes.INFRASTRUCTURE,
        details=details,
        status_code=422
    )

def device_already_locked(device_id: str, locked_by: str = None) -> tuple:
    """Standard response for device already locked"""
    details = {"device_id": device_id}
    if locked_by:
        details["locked_by"] = locked_by
        details["suggested_action"] = "wait_or_force_release"
    
    return create_error_response(
        error_code=ErrorCodes.DEVICE_ALREADY_LOCKED,
        message=f"Device {device_id} is already locked by another session",
        error_type=ErrorTypes.RESOURCE_CONFLICT,
        details=details,
        status_code=409
    )

def controller_not_available(controller_type: str, available_controllers: list = None) -> tuple:
    """Standard response for controller not available"""
    details = {"controller_type": controller_type}
    if available_controllers:
        details["available_controllers"] = available_controllers
    
    return create_error_response(
        error_code=ErrorCodes.CONTROLLER_NOT_AVAILABLE,
        message=f"Controller '{controller_type}' is not available",
        error_type=ErrorTypes.INFRASTRUCTURE,
        details=details,
        status_code=422
    )

def host_unreachable(host_ip: str, host_port: int = None) -> tuple:
    """Standard response for host unreachable"""
    details = {"host_ip": host_ip}
    if host_port:
        details["host_port"] = host_port
    
    return create_error_response(
        error_code=ErrorCodes.HOST_UNREACHABLE,
        message=f"Cannot reach host at {host_ip}",
        error_type=ErrorTypes.NETWORK,
        details=details,
        status_code=503
    )

def controller_error(controller_type: str, operation: str, error_details: str) -> tuple:
    """Standard response for controller operation errors"""
    return create_error_response(
        error_code=ErrorCodes.CONTROLLER_ERROR,
        message=f"Controller operation failed: {operation}",
        error_type=ErrorTypes.INFRASTRUCTURE,
        details={
            "controller_type": controller_type,
            "operation": operation,
            "error_details": error_details
        },
        status_code=500
    )

def verification_error(verification_type: str, error_details: str) -> tuple:
    """Standard response for verification errors"""
    return create_error_response(
        error_code=ErrorCodes.VERIFICATION_ERROR,
        message=f"Verification failed: {verification_type}",
        error_type=ErrorTypes.VALIDATION,
        details={
            "verification_type": verification_type,
            "error_details": error_details
        },
        status_code=500
    )

def reference_not_found(reference_name: str, reference_type: str = None) -> tuple:
    """Standard response for reference not found"""
    details = {"reference_name": reference_name}
    if reference_type:
        details["reference_type"] = reference_type
    
    return create_error_response(
        error_code=ErrorCodes.REFERENCE_NOT_FOUND,
        message=f"Reference not found: {reference_name}",
        error_type=ErrorTypes.VALIDATION,
        details=details,
        status_code=404
    )

def malformed_request(error_details: str) -> tuple:
    """Standard response for malformed requests"""
    return create_error_response(
        error_code=ErrorCodes.MALFORMED_REQUEST,
        message="Request format is invalid",
        error_type=ErrorTypes.CLIENT_ERROR,
        details={"error_details": error_details},
        status_code=400
    )

# Utility functions for common validation patterns

def validate_required_fields(data: dict, required_fields: list) -> Optional[tuple]:
    """
    Validate that all required fields are present in the request data.
    
    Args:
        data: Request data dictionary
        required_fields: List of required field names
        
    Returns:
        Error response tuple if validation fails, None if validation passes
    """
    for field in required_fields:
        if field not in data or data[field] is None:
            return missing_required_field(field)
    return None

def validate_device_model(device_model: str, valid_models: list) -> Optional[tuple]:
    """
    Validate device model against list of valid models.
    
    Args:
        device_model: Device model to validate
        valid_models: List of valid device models
        
    Returns:
        Error response tuple if validation fails, None if validation passes
    """
    if device_model not in valid_models:
        return create_error_response(
            error_code=ErrorCodes.INVALID_DEVICE_MODEL,
            message=f"Unknown device model: {device_model}",
            error_type=ErrorTypes.CLIENT_ERROR,
            details={
                "provided_model": device_model,
                "valid_models": valid_models
            },
            status_code=400
        )
    return None

def validate_coordinates(area: dict) -> Optional[tuple]:
    """
    Validate coordinate area format.
    
    Args:
        area: Area dictionary with x, y, width, height
        
    Returns:
        Error response tuple if validation fails, None if validation passes
    """
    required_coords = ['x', 'y', 'width', 'height']
    for coord in required_coords:
        if coord not in area:
            return missing_required_field(f"area.{coord}")
        
        try:
            value = float(area[coord])
            if value < 0:
                return invalid_parameter_value(f"area.{coord}", value, "non-negative number")
        except (ValueError, TypeError):
            return invalid_parameter_value(f"area.{coord}", area[coord], "numeric value")
    
    return None

# Decorator for handling common exceptions
def handle_common_exceptions(func):
    """
    Decorator to handle common exceptions and convert them to standardized error responses.
    """
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except KeyError as e:
            return missing_required_field(str(e).strip("'\""))
        except ValueError as e:
            return invalid_parameter_value("request_data", str(e))
        except Exception as e:
            logger.exception(f"Unexpected error in {func.__name__}")
            return create_error_response(
                error_code=ErrorCodes.INFRASTRUCTURE_ERROR,
                message="An unexpected error occurred",
                error_type=ErrorTypes.SYSTEM,
                details={"function": func.__name__, "error": str(e)},
                status_code=500
            )
    return wrapper 