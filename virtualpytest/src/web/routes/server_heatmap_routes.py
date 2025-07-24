"""
Heatmap Management Routes

This module contains the heatmap management API endpoints for:
- Heatmap data retrieval (images, incidents, hosts)
- Heatmap generation (async job-based)
- Job status monitoring
"""

from flask import Blueprint, request, jsonify
import asyncio
import aiohttp
from datetime import datetime, timedelta
import time
import os

# Import database functions and utilities
from src.lib.supabase.heatmap_db import (
    get_heatmap_incidents
)
from src.utils.heatmap_utils import (
    create_heatmap_job,
    get_job_status,
    cancel_job,
    start_heatmap_generation
)

from src.utils.app_utils import check_supabase, get_team_id

# Create blueprint
server_heatmap_bp = Blueprint('server_heatmap', __name__, url_prefix='/server/heatmap')

# =====================================================
# HOST DATA FETCHING
# =====================================================

def get_hosts_devices():
    """Get hosts and devices from host manager"""
    from src.utils.host_utils import get_host_manager
    host_manager = get_host_manager()
    
    hosts_devices = []
    all_hosts = host_manager.get_all_hosts()
    
    for host_data in all_hosts:
        host_name = host_data.get('host_name', host_data.get('name', 'unknown'))
        devices = host_data.get('devices', [])
        if isinstance(devices, list) and devices:
            for device in devices:
                capabilities = device.get('device_capabilities', {})
                av_capability = capabilities.get('av')
                
                if (isinstance(capabilities, dict) and 'av' in capabilities and av_capability and 
                    av_capability != 'vnc_stream'):
                    hosts_devices.append({
                        'host_name': host_name,
                        'device_id': device.get('device_id', 'device1'),
                        'host_data': host_data
                    })
        else:
            host_capabilities = host_data.get('capabilities', {})
            av_capability = host_capabilities.get('av')
            
            if (isinstance(host_capabilities, dict) and 'av' in host_capabilities and av_capability and
                av_capability != 'vnc_stream'):
                hosts_devices.append({
                    'host_name': host_name,
                    'device_id': 'device1',
                    'host_data': host_data
                })
    
    return hosts_devices

async def query_host_analysis(session, host_device, timeframe_minutes):
    """Query single host for recent analysis data and download images"""
    try:
        host_data = host_device['host_data']
        device_id = host_device['device_id']
        host_name = host_device['host_name']
        
        from src.utils.build_url_utils import buildHostUrl
        host_url = buildHostUrl(host_data, '/host/heatmap/listRecentAnalysis')
        
        async with session.post(
            host_url,
            json={
                'device_id': device_id,
                'timeframe_minutes': timeframe_minutes
            },
            timeout=aiohttp.ClientTimeout(total=30),
            ssl=False
        ) as response:
            if response.status == 200:
                result = await response.json()
                if result.get('success'):
                    analysis_data = result.get('analysis_data', [])
                    
                    # Download images for each analysis item
                    for item in analysis_data:
                        filename = item['filename']
                        
                        # Extract just the filename if it's a full path
                        if '/' in filename:
                            filename = os.path.basename(filename)
                        
                        host_url_base = host_data.get('host_url', '').rstrip('/')
                        image_url = f"{host_url_base}/host/stream/capture{device_id[-1]}/captures/{filename}"
                        
                        try:
                            async with session.get(image_url, timeout=aiohttp.ClientTimeout(total=10)) as img_response:
                                if img_response.status == 200:
                                    item['image_data'] = await img_response.read()
                                    item['image_url'] = image_url  # Keep URL for reference
                                else:
                                    print(f"[@query_host_analysis] Failed to download image {filename} from {host_name}: HTTP {img_response.status}")
                                    item['image_data'] = None
                                    item['image_url'] = image_url
                        except Exception as img_error:
                            print(f"[@query_host_analysis] Error downloading image {filename} from {host_name}: {img_error}")
                            item['image_data'] = None
                            item['image_url'] = image_url
                    
                    return {
                        'host_name': host_name,
                        'device_id': device_id,
                        'success': True,
                        'analysis_data': analysis_data,
                        'host_data': host_data
                    }
            
            return {
                'host_name': host_name,
                'device_id': device_id,
                'success': False,
                'error': f'HTTP {response.status}'
            }
            
    except Exception as e:
        return {
            'host_name': host_name,
            'device_id': device_id,
            'success': False,
            'error': str(e)
        }

def process_host_results(host_results):
    """Process host results and group by timestamp"""
    images_by_timestamp = {}
    images_with_data_by_timestamp = {}  # For background processing with image data
    device_latest_by_bucket = {}
    
    for result in host_results:
        if isinstance(result, Exception) or not result.get('success'):
            continue
        
        analysis_data = result.get('analysis_data', [])
        for item in analysis_data:
            timestamp = item.get('timestamp', '')
            
            if timestamp:
                try:
                    dt = datetime.strptime(timestamp, '%Y%m%d%H%M%S')
                    seconds = (dt.second // 10) * 10
                    bucket_dt = dt.replace(second=seconds, microsecond=0)
                    bucket_key = bucket_dt.strftime('%Y%m%d%H%M%S')
                    
                    device_key = f"{result['host_name']}_{result['device_id']}"
                    
                    if bucket_key not in device_latest_by_bucket:
                        device_latest_by_bucket[bucket_key] = {}
                    
                    if (device_key not in device_latest_by_bucket[bucket_key] or 
                        timestamp > device_latest_by_bucket[bucket_key][device_key]['timestamp']):
                        
                        # Build image URL
                        host_data = result.get('host_data', {})
                        device_id = result['device_id']
                        filename = item['filename']
                        
                        # Extract just the filename if it's a full path
                        if '/' in filename:
                            filename = os.path.basename(filename)
                        
                        host_url = host_data.get('host_url', '').rstrip('/')
                        image_url = f"{host_url}/host/stream/capture{device_id[-1]}/captures/{filename}"
                        
                        # Frontend data (without image bytes)
                        frontend_device_data = {
                            'host_name': result['host_name'],
                            'device_id': result['device_id'],
                            'filename': filename,
                            'image_url': image_url,
                            'timestamp': timestamp,
                            'analysis_json': item.get('analysis_json')  # Direct pass-through
                        }
                        
                        # Background processing data (with image bytes)
                        background_device_data = {
                            'host_name': result['host_name'],
                            'device_id': result['device_id'],
                            'filename': filename,
                            'image_url': image_url,
                            'timestamp': timestamp,
                            'analysis_json': item.get('analysis_json'),  # Direct pass-through
                            'image_data': item.get('image_data')  # Image bytes for background processing
                        }
                        
                        device_latest_by_bucket[bucket_key][device_key] = {
                            'frontend': frontend_device_data,
                            'background': background_device_data
                        }
                        
                except Exception:
                    continue
    
    # Separate frontend and background data
    for bucket_key, devices in device_latest_by_bucket.items():
        images_by_timestamp[bucket_key] = [device_data['frontend'] for device_data in devices.values()]
        images_with_data_by_timestamp[bucket_key] = [device_data['background'] for device_data in devices.values()]
    
    return images_by_timestamp, images_with_data_by_timestamp

# =====================================================
# HEATMAP ENDPOINTS
# =====================================================

@server_heatmap_bp.route('/getData', methods=['GET'])
def get_data():
    """Get heatmap data (hosts, recent images, incidents) for the team"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        # Fetch analysis data from hosts
        hosts_devices = get_hosts_devices()
        images_by_timestamp = {}
        
        if hosts_devices:
            # Add small delay to allow analysis processing to complete
            time.sleep(2)
            
            async def query_all_hosts():
                async with aiohttp.ClientSession() as session:
                    tasks = [query_host_analysis(session, hd, 1) for hd in hosts_devices]
                    results = await asyncio.gather(*tasks, return_exceptions=True)
                    return results
            
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                host_results = loop.run_until_complete(query_all_hosts())
                loop.close()
            except Exception:
                host_results = []
            
            images_by_timestamp, images_with_data_by_timestamp = process_host_results(host_results)
        
        incidents = get_heatmap_incidents(team_id, 1)
        timeline_timestamps = sorted(images_by_timestamp.keys())
        
        frontend_hosts_devices = [
            {
                'host_name': hd['host_name'],
                'device_id': hd['device_id']
            }
            for hd in hosts_devices
        ]
        
        heatmap_data = {
            'hosts_devices': frontend_hosts_devices,
            'images_by_timestamp': images_by_timestamp,
            'incidents': incidents,
            'timeline_timestamps': timeline_timestamps
        }
        
        return jsonify(heatmap_data)
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@server_heatmap_bp.route('/generate', methods=['POST'])
def generate():
    """Start heatmap generation job"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        data = request.get_json() or {}
        timeframe_minutes = data.get('timeframe_minutes', 1)
        
        job_id = create_heatmap_job(timeframe_minutes)
        
        hosts_devices = get_hosts_devices()
        images_by_timestamp = {}
        
        if hosts_devices:
            # Add small delay to allow analysis processing to complete
            time.sleep(2)
            async def query_all_hosts():
                async with aiohttp.ClientSession() as session:
                    tasks = [query_host_analysis(session, hd, timeframe_minutes) for hd in hosts_devices]
                    results = await asyncio.gather(*tasks, return_exceptions=True)
                    return results
            
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                host_results = loop.run_until_complete(query_all_hosts())
                loop.close()
            except Exception:
                host_results = []
            
            images_by_timestamp, images_with_data_by_timestamp = process_host_results(host_results)
        
        incidents = get_heatmap_incidents(team_id, timeframe_minutes)
        timeline_timestamps = sorted(images_by_timestamp.keys())
        
        frontend_hosts_devices = [
            {
                'host_name': hd['host_name'],
                'device_id': hd['device_id']
            }
            for hd in hosts_devices
        ]
        
        heatmap_data = {
            'hosts_devices': frontend_hosts_devices,
            'images_by_timestamp': images_by_timestamp,
            'incidents': incidents,
            'timeline_timestamps': timeline_timestamps
        }
        
        start_heatmap_generation(
            job_id, 
            images_with_data_by_timestamp,  # Use background data with image bytes
            heatmap_data.get('incidents', []),
            heatmap_data,
            team_id  # Pass team_id to background thread
        )
        
        return jsonify({
            'success': True,
            'job_id': job_id,
            'message': 'Heatmap generation started'
            # No heatmap_data here - only send when complete
        })
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@server_heatmap_bp.route('/status/<job_id>', methods=['GET'])
def get_status(job_id):
    """Get heatmap generation job status"""
    try:
        status = get_job_status(job_id)
        
        if status:
            return jsonify(status)
        else:
            return jsonify({'error': 'Job not found'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@server_heatmap_bp.route('/cancel/<job_id>', methods=['POST'])
def cancel(job_id):
    """Cancel heatmap generation job"""
    try:
        success = cancel_job(job_id)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Job cancelled successfully'
            })
        else:
            return jsonify({'error': 'Job not found or cannot be cancelled'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@server_heatmap_bp.route('/history', methods=['GET'])
def get_history():
    """Get recent heatmap reports history"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        limit = request.args.get('limit', 10, type=int)
        
        from src.lib.supabase.heatmap_db import get_recent_heatmaps
        heatmaps = get_recent_heatmaps(team_id, limit)
        
        # Transform data to match frontend expectations
        reports = []
        for heatmap in heatmaps:
            # Format timestamp for display
            timestamp = heatmap.get('timestamp', '')
            if timestamp:
                try:
                    # Parse timestamp and format for display
                    dt = datetime.strptime(timestamp, '%Y%m%d%H%M%S')
                    formatted_timestamp = dt.strftime('%Y-%m-%d %H:%M:%S')
                except:
                    formatted_timestamp = timestamp
            else:
                formatted_timestamp = 'Unknown'
            
            # Generate report name from timestamp
            report_name = f"Heatmap Report {formatted_timestamp}"
            
            # Format processing time for display
            processing_time = heatmap.get('processing_time')
            if processing_time is not None:
                # Round to 2 decimal places for display
                processing_time = round(float(processing_time), 2)
            
            reports.append({
                'id': heatmap.get('id'),
                'timestamp': formatted_timestamp,
                'name': report_name,
                'html_url': heatmap.get('html_r2_url'),
                'devices_count': heatmap.get('hosts_included', 0),
                'incidents_count': heatmap.get('incidents_count', 0),
                'processing_time': processing_time,
                'created_at': heatmap.get('generated_at')
            })
        
        return jsonify({
            'success': True,
            'reports': reports
        })
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500 