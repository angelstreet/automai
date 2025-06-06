"""
Verification Host Routes

This module contains the host-side verification API endpoints that:
- Handle actual image cropping using existing utilities
- Process images with autocrop and background removal
- Serve cropped images from local storage
"""

from flask import Blueprint, request, jsonify
import os

# Create blueprint
verification_host_bp = Blueprint('verification_host', __name__)

# =====================================================
# HOST-SIDE CROPPING ENDPOINTS
# =====================================================

@verification_host_bp.route('/stream/crop-area', methods=['POST'])
def host_crop_area():
    """Host-side endpoint to crop images locally using existing utilities."""
    try:
        data = request.get_json()
        source_filename = data.get('source_filename')
        area = data.get('area')
        reference_name = data.get('reference_name', 'cropped')
        
        print(f"[@route:host_crop_area] Host cropping request: {source_filename} with area: {area}")
        
        # Validate required parameters
        if not source_filename or not area:
            return jsonify({
                'success': False,
                'error': 'source_filename and area are required'
            }), 400
        
        # Build source path - assume images are in /var/www/html/stream/captures/
        source_path = f'/var/www/html/stream/captures/{source_filename}'
        
        # Build target path for cropped image
        target_path = f'/var/www/html/stream/captures/cropped_{reference_name}_{source_filename}'
        
        print(f"[@route:host_crop_area] Cropping from {source_path} to {target_path}")
        
        # Check if source file exists
        if not os.path.exists(source_path):
            print(f"[@route:host_crop_area] Source file not found: {source_path}")
            return jsonify({
                'success': False,
                'error': f'Source file not found: {source_filename}'
            }), 404
        
        # Import and use existing cropping function
        try:
            from controllers.verification.image import crop_reference_image
            
            # Crop the image
            success = crop_reference_image(source_path, target_path, area)
            
            if success:
                # Return URL path for the cropped image
                cropped_url = f'/stream/captures/cropped_{reference_name}_{source_filename}'
                print(f"[@route:host_crop_area] Cropping successful: {cropped_url}")
                
                return jsonify({
                    'success': True,
                    'cropped_path': cropped_url,
                    'message': f'Image cropped successfully: {reference_name}'
                })
            else:
                print(f"[@route:host_crop_area] Cropping failed")
                return jsonify({
                    'success': False,
                    'error': 'Failed to crop image'
                }), 500
                
        except ImportError as e:
            print(f"[@route:host_crop_area] Import error: {e}")
            return jsonify({
                'success': False,
                'error': 'Cropping utilities not available'
            }), 500
            
    except Exception as e:
        print(f"[@route:host_crop_area] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Host cropping error: {str(e)}'
        }), 500

@verification_host_bp.route('/stream/process-area', methods=['POST'])
def host_process_area():
    """Host-side endpoint to process images with autocrop and background removal."""
    try:
        data = request.get_json()
        source_filename = data.get('source_filename')
        area = data.get('area')
        reference_name = data.get('reference_name', 'processed')
        autocrop = data.get('autocrop', False)
        remove_background = data.get('remove_background', False)
        
        print(f"[@route:host_process_area] Host processing request: {source_filename} with area: {area}")
        print(f"[@route:host_process_area] Processing options: autocrop={autocrop}, remove_background={remove_background}")
        
        # Validate required parameters
        if not source_filename or not area:
            return jsonify({
                'success': False,
                'error': 'source_filename and area are required'
            }), 400
        
        # Build source path - assume images are in /var/www/html/stream/captures/
        source_path = f'/var/www/html/stream/captures/{source_filename}'
        
        # Build target path for processed image
        target_path = f'/var/www/html/stream/captures/processed_{reference_name}_{source_filename}'
        
        print(f"[@route:host_process_area] Processing from {source_path} to {target_path}")
        
        # Check if source file exists
        if not os.path.exists(source_path):
            print(f"[@route:host_process_area] Source file not found: {source_path}")
            return jsonify({
                'success': False,
                'error': f'Source file not found: {source_filename}'
            }), 404
        
        # Import and use existing processing functions
        try:
            from controllers.verification.image import crop_reference_image, process_reference_image
            
            # First crop the image
            success = crop_reference_image(source_path, target_path, area)
            
            if not success:
                print(f"[@route:host_process_area] Initial cropping failed")
                return jsonify({
                    'success': False,
                    'error': 'Failed to crop image'
                }), 500
            
            # Then apply processing if requested
            processed_area = area  # Default to original area
            
            if autocrop or remove_background:
                processed_area = process_reference_image(target_path, autocrop, remove_background)
                if not processed_area:
                    print(f"[@route:host_process_area] Processing failed, using original area")
                    processed_area = area
            
            # Return URL path for the processed image
            processed_url = f'/stream/captures/processed_{reference_name}_{source_filename}'
            print(f"[@route:host_process_area] Processing successful: {processed_url}")
            
            return jsonify({
                'success': True,
                'cropped_path': processed_url,
                'processed_area': processed_area,
                'message': f'Image processed successfully: {reference_name}'
            })
            
        except ImportError as e:
            print(f"[@route:host_process_area] Import error: {e}")
            return jsonify({
                'success': False,
                'error': 'Processing utilities not available'
            }), 500
        
    except Exception as e:
        print(f"[@route:host_process_area] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Host processing error: {str(e)}'
        }), 500 