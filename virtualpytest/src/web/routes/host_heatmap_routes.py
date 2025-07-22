"""
Host Heatmap Routes

Host-side heatmap endpoints that list recent images with analysis data.
Used by server to gather data from all hosts for heatmap compilation.
"""

from flask import Blueprint, request, jsonify
from src.utils.host_utils import get_controller, get_device_by_id
from src.utils.build_url_utils import buildCaptureUrlFromPath, buildClientImageUrl
from src.controllers.controller_manager import get_host
import os
import time
import glob

# Create blueprint
host_heatmap_bp = Blueprint('host_heatmap', __name__, url_prefix='/host/heatmap')

@host_heatmap_bp.route('/listRecentAnalysis', methods=['POST'])
def list_recent_analysis():
    """List recent images with analysis JSON from last N minutes"""
    try:
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        timeframe_minutes = data.get('timeframe_minutes', 1)
        
        print(f"[@route:host_heatmap:list_recent_analysis] Device: {device_id}, Timeframe: {timeframe_minutes}min")
        
        # Get image controller for the specified device (reuse existing pattern)
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
        
        # Get capture folder from image controller (reuse existing pattern)
        capture_folder = image_controller.captures_path
        
        if not os.path.exists(capture_folder):
            return jsonify({
                'success': False,
                'error': f'Capture folder not found: {capture_folder}'
            }), 404
        
        # Calculate time cutoff
        cutoff_time = time.time() - (timeframe_minutes * 60)
        
        print(f"[@route:host_heatmap:list_recent_analysis] Scanning folder: {capture_folder}")
        print(f"[@route:host_heatmap:list_recent_analysis] Looking for files newer than: {time.ctime(cutoff_time)}")
        
        # Build URLs using existing host URL building pattern
        try:
            host = get_host()
            host_dict = host.to_dict()
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Failed to get host info: {str(e)}'
            }), 500

        # Find recent images with analysis data
        analysis_data = []

        # Get all capture files (not test_capture files or thumbnails)
        for filename in os.listdir(capture_folder):
            if (filename.startswith('capture_') and 
                filename.endswith('.jpg') and 
                not filename.endswith('_thumbnail.jpg')):
                
                filepath = os.path.join(capture_folder, filename)
                
                # Check if file is recent enough
                if os.path.getmtime(filepath) >= cutoff_time:
                    
                    # Extract timestamp from filename (capture_YYYYMMDDHHMMSS.jpg)
                    base_name = filename.replace('.jpg', '')
                    timestamp_str = base_name.replace('capture_', '')
                    
                    # Check for corresponding JSON files
                    frame_json = f"{base_name}.json"
                    audio_json = f"{base_name}_audio.json"
                    
                    frame_json_path = os.path.join(capture_folder, frame_json)
                    audio_json_path = os.path.join(capture_folder, audio_json)
                    
                    has_frame_analysis = os.path.exists(frame_json_path)
                    has_audio_analysis = os.path.exists(audio_json_path)
                    
                    # Debug logging for JSON file detection
                    print(f"[@route:host_heatmap:list_recent_analysis] File: {filename}")
                    print(f"[@route:host_heatmap:list_recent_analysis] Expected frame JSON path: {frame_json_path}")
                    print(f"[@route:host_heatmap:list_recent_analysis] Frame JSON exists (os.path): {has_frame_analysis}")
                    
                    # If local file check fails, try HTTP check as fallback
                    if not has_frame_analysis:
                        try:
                            # Build the HTTP URL that we know works
                            image_url_temp = buildCaptureUrlFromPath(host_dict, filepath, device_id)
                            json_url_temp = image_url_temp.replace('.jpg', '.json')
                            json_url_temp = buildClientImageUrl(json_url_temp)
                            
                            # Quick HTTP check
                            import requests
                            response = requests.head(json_url_temp, timeout=1)
                            has_frame_analysis = response.status_code == 200
                            print(f"[@route:host_heatmap:list_recent_analysis] Frame JSON exists (HTTP): {has_frame_analysis}")
                        except Exception as e:
                            print(f"[@route:host_heatmap:list_recent_analysis] HTTP check failed: {e}")
                    
                    # Include image if it has at least one analysis OR if we're building comprehensive heatmap
                    # (We'll use previous JSON data strategy for missing analysis)
                    analysis_data.append({
                        'filename': filename,
                        'timestamp': timestamp_str,  # YYYYMMDDHHMMSS format
                        'filepath': filepath,
                        'frame_json_path': frame_json_path if has_frame_analysis else None,
                        'audio_json_path': audio_json_path if has_audio_analysis else None,
                        'has_frame_analysis': has_frame_analysis,
                        'has_audio_analysis': has_audio_analysis,
                        'file_mtime': int(os.path.getmtime(filepath) * 1000)  # Milliseconds timestamp
                    })
        
        # Sort by timestamp (newest first)
        analysis_data.sort(key=lambda x: x['timestamp'], reverse=True)
        
        # Build response with URLs for each item
        response_data = []
        for item in analysis_data:
            try:
                # Build image URL using same mechanism as listCaptures
                image_url = buildCaptureUrlFromPath(host_dict, item['filepath'], device_id)
                client_image_url = buildClientImageUrl(image_url)
                
                # Build JSON URLs if files exist
                frame_json_url = None
                audio_json_url = None
                
                if item['frame_json_path']:
                    # Build image URL first, then convert to JSON URL
                    image_url_for_json = buildCaptureUrlFromPath(host_dict, item['filepath'], device_id)
                    frame_json_url = image_url_for_json.replace('.jpg', '.json')
                    frame_json_url = buildClientImageUrl(frame_json_url)
                
                if item['audio_json_path']:
                    # Build image URL first, then convert to audio JSON URL  
                    image_url_for_audio = buildCaptureUrlFromPath(host_dict, item['filepath'], device_id)
                    audio_json_url = image_url_for_audio.replace('.jpg', '_audio.json')
                    audio_json_url = buildClientImageUrl(audio_json_url)
                
                response_data.append({
                    'filename': item['filename'],
                    'timestamp': item['timestamp'],
                    'image_url': client_image_url,
                    'frame_json_url': frame_json_url,
                    'audio_json_url': audio_json_url,
                    'has_frame_analysis': item['has_frame_analysis'],
                    'has_audio_analysis': item['has_audio_analysis'],
                    'file_mtime': item['file_mtime']
                })
                
            except Exception as url_error:
                print(f"[@route:host_heatmap:list_recent_analysis] Failed to build URL for {item['filename']}: {url_error}")
                # Skip items that can't have URLs built
                continue
        
        print(f"[@route:host_heatmap:list_recent_analysis] Found {len(response_data)} images with URLs")
        
        return jsonify({
            'success': True,
            'analysis_data': response_data,
            'total': len(response_data),
            'device_id': device_id,
            'host_name': host_dict.get('host_name', 'unknown'),
            'timeframe_minutes': timeframe_minutes
        })
        
    except Exception as e:
        print(f"[@route:host_heatmap:list_recent_analysis] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'List recent analysis error: {str(e)}'
        }), 500 