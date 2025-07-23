"""
Host Heatmap Routes

Minimalist host-side heatmap endpoint that returns raw file data.
No controller initialization, no URL building, no complex processing.
"""

from flask import Blueprint, request, jsonify
import os
import time

# Create blueprint
host_heatmap_bp = Blueprint('host_heatmap', __name__, url_prefix='/host/heatmap')

@host_heatmap_bp.route('/listRecentAnalysis', methods=['POST'])
def list_recent_analysis():
    """List recent capture files - minimalist implementation"""
    try:
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        timeframe_minutes = data.get('timeframe_minutes', 1)
        
        # Direct path calculation - no controller needed
        capture_folder = f"/var/www/html/stream/capture{device_id[-1]}/captures"
        
        if not os.path.exists(capture_folder):
            return jsonify({
                'success': False, 
                'error': f'Capture folder not found: {capture_folder}'
            }), 404
        
        # Simple file scan
        cutoff_time = time.time() - (timeframe_minutes * 60)
        files = []
        
        for filename in os.listdir(capture_folder):
            if (filename.startswith('capture_') and filename.endswith('.jpg') and 
                not filename.endswith('_thumbnail.jpg')):
                filepath = os.path.join(capture_folder, filename)
                if os.path.getmtime(filepath) >= cutoff_time:
                    # Extract timestamp from filename
                    timestamp = filename.replace('capture_', '').replace('.jpg', '')
                    
                    # Check for analysis files
                    base_name = filename.replace('.jpg', '')
                    frame_json_exists = os.path.exists(os.path.join(capture_folder, f"{base_name}.json"))
                    audio_json_exists = os.path.exists(os.path.join(capture_folder, f"{base_name}_audio.json"))
                    
                    files.append({
                        'filename': filename,
                        'timestamp': timestamp,
                        'has_frame_analysis': frame_json_exists,
                        'has_audio_analysis': audio_json_exists,
                        'file_mtime': int(os.path.getmtime(filepath) * 1000)
                    })
        
        # Sort by timestamp (newest first)
        files.sort(key=lambda x: x['timestamp'], reverse=True)
        
        return jsonify({
            'success': True,
            'analysis_data': files,
            'total': len(files),
            'device_id': device_id
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 