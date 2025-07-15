"""
Frontend control routes for MCP server integration
Handles page navigation and frontend state management
"""

from flask import Blueprint, request, jsonify
import logging

# Create blueprint for frontend routes
server_frontend_bp = Blueprint('server_frontend', __name__)

# Set up logging
logger = logging.getLogger(__name__)

@server_frontend_bp.route('/navigate', methods=['POST'])
def navigate_to_page():
    """
    Navigate to a specific page
    
    Expected JSON payload:
    {
        "page": "dashboard" | "rec" | "userinterface" | "runTests"
    }
    
    Returns:
    {
        "success": true,
        "redirect_url": "/dashboard",
        "message": "Navigate to dashboard page"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                "success": False,
                "error": "No JSON data provided"
            }), 400
        
        page = data.get('page')
        
        if not page:
            return jsonify({
                "success": False,
                "error": "Page parameter is required"
            }), 400
        
        # Define valid pages
        valid_pages = ["dashboard", "rec", "userinterface", "runTests"]
        
        if page not in valid_pages:
            return jsonify({
                "success": False,
                "error": f"Invalid page '{page}'. Valid pages: {valid_pages}"
            }), 400
        
        # Generate redirect URL
        redirect_url = f"/{page}"
        
        logger.info(f"[@server_frontend_routes:navigate_to_page] Navigating to page: {page}")
        
        return jsonify({
            "success": True,
            "redirect_url": redirect_url,
            "page": page,
            "message": f"Navigate to {page} page"
        })
        
    except Exception as e:
        logger.error(f"[@server_frontend_routes:navigate_to_page] Error: {e}")
        return jsonify({
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }), 500

@server_frontend_bp.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint for frontend routes
    """
    return jsonify({
        "success": True,
        "service": "frontend_routes",
        "message": "Frontend routes are healthy"
    }) 