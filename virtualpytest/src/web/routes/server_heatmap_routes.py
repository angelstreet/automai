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
    """Query single host for recent analysis data"""
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
                    return {
                        'host_name': host_name,
                        'device_id': device_id,
                        'success': True,
                        'analysis_data': result.get('analysis_data', []),
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
                        
                        host_url = host_data.get('host_url', '').rstrip('/')
                        image_url = f"{host_url}/host/stream/capture{device_id[-1]}/captures/{filename}"
                        
                        device_data = {
                            'host_name': result['host_name'],
                            'device_id': result['device_id'],
                            'filename': filename,
                            'image_url': image_url,
                            'timestamp': timestamp,
                            'analysis_json': item.get('analysis_json')  # Direct pass-through
                        }
                        
                        device_latest_by_bucket[bucket_key][device_key] = device_data
                        
                except Exception:
                    continue
    
    for bucket_key, devices in device_latest_by_bucket.items():
        images_by_timestamp[bucket_key] = list(devices.values())
    
    return images_by_timestamp

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
        hosts_devices = get_hosts_devices()
        images_by_timestamp = {}
        
        if hosts_devices:
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
            
            images_by_timestamp = process_host_results(host_results)
        
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
            
            images_by_timestamp = process_host_results(host_results)
        
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
            heatmap_data.get('images_by_timestamp', {}),
            heatmap_data.get('incidents', []),
            heatmap_data,
            team_id  # Pass team_id to background thread
        )
        
        return jsonify({
            'success': True,
            'job_id': job_id,
            'message': 'Heatmap generation started',
            'heatmap_data': heatmap_data
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