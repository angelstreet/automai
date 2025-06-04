"""
Validation Routes for Navigation Trees

This module contains the API endpoints for:
- Validation preview (what will be tested)
- Running comprehensive validation
- Exporting validation reports
"""

from flask import Blueprint, request, jsonify
import sys
import os

# Add parent directory to path for imports
src_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, src_dir)

# Import from web utils directory
web_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
web_utils_path = os.path.join(web_dir, 'utils')
sys.path.insert(0, web_utils_path)

from .utils import check_supabase, get_team_id

# Import validation services
try:
    services_path = os.path.join(web_dir, 'services')
    sys.path.insert(0, services_path)
    from validation_service import validation_service
    VALIDATION_SERVICE_AVAILABLE = True
except ImportError as e:
    print(f"[@validation_routes] Warning: Validation service not available: {e}")
    VALIDATION_SERVICE_AVAILABLE = False

# Create blueprint
validation_bp = Blueprint('validation', __name__, url_prefix='/api/validation')

# =====================================================
# VALIDATION PREVIEW ROUTES
# =====================================================

@validation_bp.route('/preview/<tree_id>', methods=['GET'])
def get_validation_preview(tree_id):
    """API endpoint for validation preview"""
    if not VALIDATION_SERVICE_AVAILABLE:
        return jsonify({
            'success': False,
            'error': 'Validation service not available',
            'error_code': 'SERVICE_UNAVAILABLE'
        }), 503
        
    try:
        print(f"[@api:validation:preview] Request for validation preview for tree {tree_id}")
        
        team_id = get_team_id()
        
        preview = validation_service.get_validation_preview(tree_id, team_id)
        
        return jsonify({
            'success': True,
            'preview': preview
        })
        
    except Exception as e:
        print(f"[@api:validation:preview] Error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'error_code': 'API_ERROR'
        }), 500

# =====================================================
# VALIDATION EXECUTION ROUTES
# =====================================================

@validation_bp.route('/run/<tree_id>', methods=['POST'])
def run_validation(tree_id):
    """API endpoint for running comprehensive validation"""
    if not VALIDATION_SERVICE_AVAILABLE:
        return jsonify({
            'success': False,
            'error': 'Validation service not available',
            'error_code': 'SERVICE_UNAVAILABLE'
        }), 503
        
    try:
        print(f"[@api:validation:run] Request to run validation for tree {tree_id}")
        
        team_id = get_team_id()
        data = request.get_json() or {}
        
        results = validation_service.run_comprehensive_validation(tree_id, team_id)
        
        return jsonify({
            'success': True,
            'results': results
        })
        
    except Exception as e:
        print(f"[@api:validation:run] Error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'error_code': 'API_ERROR'
        }), 500

# =====================================================
# VALIDATION EXPORT ROUTES
# =====================================================

@validation_bp.route('/export/<tree_id>', methods=['GET'])
def export_validation_report(tree_id):
    """API endpoint for exporting validation reports"""
    if not VALIDATION_SERVICE_AVAILABLE:
        return jsonify({
            'success': False,
            'error': 'Validation service not available',
            'error_code': 'SERVICE_UNAVAILABLE'
        }), 503
        
    try:
        print(f"[@api:validation:export] Request to export validation report for tree {tree_id}")
        
        team_id = get_team_id()
        format_type = request.args.get('format', 'json')
        
        report_data = validation_service.export_validation_report(tree_id, team_id, format_type)
        
        # Set appropriate content type based on format
        if format_type == 'csv':
            content_type = 'text/csv'
            filename = f'validation-{tree_id}.csv'
        else:
            content_type = 'application/json'
            filename = f'validation-{tree_id}.json'
        
        return jsonify({
            'success': True,
            'report': report_data,
            'filename': filename,
            'content_type': content_type
        })
        
    except Exception as e:
        print(f"[@api:validation:export] Error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'error_code': 'API_ERROR'
        }), 500 