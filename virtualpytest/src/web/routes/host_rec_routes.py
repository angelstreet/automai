"""
Host Rec Routes

Host-side rec endpoints that list recent images for restart player functionality.
Used by server to gather restart timeline data from specific hosts.
"""

from flask import Blueprint, request, jsonify
from src.utils.host_utils import get_controller, get_device_by_id
from src.utils.build_url_utils import buildCaptureUrlFromPath, buildClientImageUrl
from src.controllers.controller_manager import get_host
import os
import time

# Create blueprint
host_rec_bp = Blueprint('host_rec', __name__, url_prefix='/host/rec')

@host_rec_bp.route('/listRestartImages', methods=['POST'])
def list_restart_images():
    """List recent images for restart player from last N minutes - progressive loading"""
    try:
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        timeframe_minutes = data.get('timeframe_minutes', 5)
        max_frames = data.get('max_frames', None)  # Optional frame limit
        
        # Progressive loading parameters
        start_index = data.get('start_index', 0)  # Starting index for batch
        batch_size = data.get('batch_size', 20)   # How many to load
        metadata_only = data.get('metadata_only', False)  # Just get frame list without URLs
        
        print(f"[@route:host_rec:list_restart_images] Device: {device_id}, Timeframe: {timeframe_minutes}min, MaxFrames: {max_frames}, Start: {start_index}, Batch: {batch_size}, MetadataOnly: {metadata_only}")
        
        # Get image controller for the specified device
        image_controller = get_controller(device_id, 'verification_image')
        
        if not image_controller:
            device = get_device_by_id(device_id)
            if not device:
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} not found'
                }), 404
            
            return jsonify({
                'success': False,
                'error': f'No image controller found for device {device_id}',
                'available_capabilities': device.get_capabilities()
            }), 404
        
        # Get capture folder from image controller
        capture_folder = image_controller.captures_path
        
        if not os.path.exists(capture_folder):
            return jsonify({
                'success': False,
                'error': f'Capture folder not found: {capture_folder}'
            }), 404
        
        # Calculate time cutoff
        cutoff_time = time.time() - (timeframe_minutes * 60)

        # ALWAYS collect ALL frame metadata first (this is fast)
        all_frames_metadata = []

        # Get all capture files (just metadata - no URL building)
        for filename in os.listdir(capture_folder):
            if (filename.startswith('capture_') and 
                filename.endswith('.jpg') and 
                not filename.endswith('_thumbnail.jpg')):
                
                filepath = os.path.join(capture_folder, filename)
                
                # Simple file time check
                if os.path.getmtime(filepath) >= cutoff_time:
                    # Extract timestamp from filename (capture_YYYYMMDDHHMMSS.jpg)
                    timestamp_str = filename.replace('capture_', '').replace('.jpg', '')
                    
                    # Just collect basic metadata
                    all_frames_metadata.append({
                        'filename': filename,
                        'timestamp': timestamp_str,  # YYYYMMDDHHMMSS format
                        'file_mtime': int(os.path.getmtime(filepath) * 1000)
                    })
        
        # Sort by timestamp (oldest first)
        all_frames_metadata.sort(key=lambda x: x['timestamp'], reverse=False)
        
        # Apply max_frames limit if specified
        if max_frames is not None and max_frames > 0:
            all_frames_metadata = all_frames_metadata[:max_frames]
            print(f"[@route:host_rec:list_restart_images] Limited to {max_frames} frames, got {len(all_frames_metadata)}")
        
        # If metadata_only, return just the frame list
        if metadata_only:
            return jsonify({
                'success': True,
                'frames': all_frames_metadata,  # All metadata, no URLs
                'total_available': len(all_frames_metadata),
                'device_id': device_id,
                'host_name': 'unknown',  # Skip host lookup for metadata-only
                'timeframe_minutes': timeframe_minutes,
                'max_frames': max_frames,
                'metadata_only': True
            })
        
        # For full requests, build URLs for requested batch
        end_index = min(start_index + batch_size, len(all_frames_metadata))
        batch_frames = all_frames_metadata[start_index:end_index]
        
        # Build URLs only for the batch frames
        try:
            host = get_host()
            host_dict = host.to_dict()
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Failed to get host info: {str(e)}'
            }), 500

        response_frames = []
        for frame in batch_frames:
            try:
                # Build full filepath for URL generation
                filepath = os.path.join(capture_folder, frame['filename'])
                
                # Build image URL
                image_url = buildCaptureUrlFromPath(host_dict, filepath, device_id)
                client_image_url = buildClientImageUrl(image_url)
                
                response_frames.append({
                    'filename': frame['filename'],
                    'timestamp': frame['timestamp'],
                    'image_url': client_image_url,
                    'file_mtime': frame['file_mtime']
                })
                
            except Exception as url_error:
                print(f"[@route:host_rec:list_restart_images] Failed to build URL for {frame['filename']}: {url_error}")
                # Skip frames that can't have URLs built
                continue
         
        return jsonify({
            'success': True,
            'frames': response_frames,
            'total_returned': len(response_frames),
            'total_available': len(all_frames_metadata),
            'start_index': start_index,
            'end_index': end_index,
            'device_id': device_id,
            'host_name': host_dict.get('host_name', 'unknown'),
            'timeframe_minutes': timeframe_minutes,
            'max_frames': max_frames,
            'has_more': end_index < len(all_frames_metadata)
        })
        
    except Exception as e:
        print(f"[@route:host_rec:list_restart_images] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'List restart images error: {str(e)}'
        }), 500 