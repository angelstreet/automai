"""
Heatmap Database Operations

This module provides functions for fetching heatmap data from the database.
Retrieves recent images with analysis, incidents, and host/device information.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional

from src.utils.supabase_utils import get_supabase_client

def get_supabase():
    """Get the Supabase client instance."""
    return get_supabase_client()

def get_heatmap_data(
    team_id: str,
    timeframe_minutes: int = 1
) -> Dict:
    """Get heatmap data by querying all hosts for recent analysis data."""
    try:
        print(f"[@db:heatmap:get_heatmap_data] Getting heatmap data:")
        print(f"  - team_id: {team_id}")
        print(f"  - timeframe_minutes: {timeframe_minutes}")
        
        supabase = get_supabase()
        
        # Get hosts and devices from host manager (not database)
        from src.utils.host_utils import get_host_manager
        host_manager = get_host_manager()
        
        hosts_devices = []
        all_hosts = host_manager.get_all_hosts()  # Returns List[Dict]
        
        for host_data in all_hosts:  # Iterate over list of host dictionaries
            host_name = host_data.get('host_name', host_data.get('name', 'unknown'))
            devices = host_data.get('devices', [])
            if isinstance(devices, list) and devices:
                for device in devices:
                    # Check if device has 'av' capability (capabilities is stored in device_capabilities)
                    capabilities = device.get('device_capabilities', {})
                    av_capability = capabilities.get('av')
                    
                    # Exclude host devices (VNC-based) - only include physical devices
                    if (isinstance(capabilities, dict) and 'av' in capabilities and av_capability and 
                        av_capability != 'vnc_stream'):
                        hosts_devices.append({
                            'host_name': host_name,
                            'device_id': device.get('device_id', 'device1'),
                            'host_data': host_data
                        })
            else:
                # Fallback for hosts without device config - check if host has av capability
                host_capabilities = host_data.get('capabilities', {})
                av_capability = host_capabilities.get('av')
                
                # Exclude host devices (VNC-based) - only include physical devices  
                if (isinstance(host_capabilities, dict) and 'av' in host_capabilities and av_capability and
                    av_capability != 'vnc_stream'):
                    hosts_devices.append({
                        'host_name': host_name,
                        'device_id': 'device1',
                        'host_data': host_data
                    })
        
        print(f"[@db:heatmap:get_heatmap_data] Found {len(hosts_devices)} host/device combinations")
        
        # Query all hosts for recent analysis data
        images_by_timestamp = {}
        
        if hosts_devices:
            # Import here to avoid circular imports
            import requests
            import asyncio
            import aiohttp
            # Remove duplicate datetime import to avoid variable shadowing
            
            async def query_host_analysis(session, host_device):
                """Query single host for recent analysis data"""
                try:
                    host_data = host_device['host_data']
                    device_id = host_device['device_id']
                    host_name = host_device['host_name']
                    
                    # Build host URL
                    from src.utils.build_url_utils import buildHostUrl
                    host_url = buildHostUrl(host_data, '/host/heatmap/listRecentAnalysis')
                    
                    print(f"[@db:heatmap:get_heatmap_data] Querying {host_name} {device_id}: {host_url}")
                    
                    async with session.post(
                        host_url,
                        json={
                            'device_id': device_id,
                            'timeframe_minutes': timeframe_minutes
                        },
                        timeout=aiohttp.ClientTimeout(total=30),  # Increased timeout to 30 seconds for 5-minute timeframes
                        ssl=False  # Skip SSL verification for internal hosts
                    ) as response:
                        if response.status == 200:
                            result = await response.json()
                            if result.get('success'):
                                analysis_count = len(result.get('analysis_data', []))
                                print(f"[@db:heatmap:get_heatmap_data] {host_name} {device_id}: SUCCESS - {analysis_count} analysis records")
                                return {
                                    'host_name': host_name,
                                    'device_id': device_id,
                                    'success': True,
                                    'analysis_data': result.get('analysis_data', [])
                                }
                            else:
                                print(f"[@db:heatmap:get_heatmap_data] {host_name} {device_id}: FAILED - success=false in response")
                        
                        print(f"[@db:heatmap:get_heatmap_data] {host_name} {device_id}: FAILED - HTTP {response.status}")
                        return {
                            'host_name': host_name,
                            'device_id': device_id,
                            'success': False,
                            'error': f'HTTP {response.status}'
                        }
                        
                except asyncio.TimeoutError:
                    print(f"[@db:heatmap:get_heatmap_data] {host_name} {device_id}: TIMEOUT after 30 seconds")
                    return {
                        'host_name': host_name,
                        'device_id': device_id,
                        'success': False,
                        'error': 'timeout'
                    }
                except Exception as e:
                    print(f"[@db:heatmap:get_heatmap_data] {host_name} {device_id}: EXCEPTION - {str(e)}")
                    return {
                        'host_name': host_name,
                        'device_id': device_id,
                        'success': False,
                        'error': str(e)
                    }
            
            async def query_all_hosts():
                """Query all hosts in parallel"""
                async with aiohttp.ClientSession() as session:
                    tasks = [query_host_analysis(session, hd) for hd in hosts_devices]
                    results = await asyncio.gather(*tasks, return_exceptions=True)
                    return results
            
            # Run async queries
            try:
                import asyncio
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                host_results = loop.run_until_complete(query_all_hosts())
                loop.close()
            except Exception as e:
                print(f"[@db:heatmap:get_heatmap_data] Async query failed: {e}")
                host_results = []
            
            # Process results and group by timestamp
            device_latest_by_bucket = {}  # Track latest image per device per bucket
            
            print(f"[@db:heatmap:get_heatmap_data] Processing {len(host_results)} host query results")
            
            for result in host_results:
                if isinstance(result, Exception):
                    print(f"[@db:heatmap:get_heatmap_data] Host query exception: {result}")
                    continue
                    
                if not result.get('success'):
                    print(f"[@db:heatmap:get_heatmap_data] Host {result['host_name']} {result['device_id']} failed: {result.get('error')}")
                    continue
                
                # Group analysis data by timestamp buckets (10-second windows)
                analysis_data = result.get('analysis_data', [])
                for item in analysis_data:
                    timestamp = item.get('timestamp', '')  # YYYYMMDDHHMMSS format
                    
                    if timestamp:
                        # Convert to 10-second bucket
                        try:
                            dt = datetime.strptime(timestamp, '%Y%m%d%H%M%S')
                            # Round down to nearest 10-second window
                            seconds = (dt.second // 10) * 10
                            bucket_dt = dt.replace(second=seconds, microsecond=0)
                            bucket_key = bucket_dt.strftime('%Y%m%d%H%M%S')
                            
                            # Create device key for deduplication
                            device_key = f"{result['host_name']}_{result['device_id']}"
                            
                            # Track the latest image per device per bucket
                            if bucket_key not in device_latest_by_bucket:
                                device_latest_by_bucket[bucket_key] = {}
                            
                            # Only keep the most recent image for this device in this bucket
                            if (device_key not in device_latest_by_bucket[bucket_key] or 
                                timestamp > device_latest_by_bucket[bucket_key][device_key]['timestamp']):
                                
                                # Download and parse JSON analysis data
                                analysis_json = {
                                    'has_audio': False,
                                    'has_video': False,
                                    'blackscreen': False,
                                    'freeze': False,
                                    'audio_loss': False
                                }
                                
                                # Parse frame analysis if available
                                frame_json_url = item.get('frame_json_url')
                                if frame_json_url:
                                    try:
                                        import requests
                                        response = requests.get(frame_json_url, timeout=3)
                                        if response.status_code == 200:
                                            frame_data = response.json()
                                            analysis_json['has_video'] = True
                                            
                                            # Use correct field structure from actual JSON
                                            analysis = frame_data.get('analysis', {})
                                            analysis_json['blackscreen'] = analysis.get('blackscreen', False)
                                            analysis_json['freeze'] = analysis.get('freeze', False)
                                    except Exception as e:
                                        print(f"[@db:heatmap:get_heatmap_data] Failed to parse frame JSON: {e}")
                                
                                # Parse audio analysis if available  
                                audio_json_url = item.get('audio_json_url')
                                if audio_json_url:
                                    try:
                                        import requests
                                        response = requests.get(audio_json_url, timeout=3)
                                        if response.status_code == 200:
                                            audio_data = response.json()
                                            analysis_json['has_audio'] = True
                                            analysis_json['audio_loss'] = audio_data.get('audio_loss_detected', False)
                                    except Exception as e:
                                        print(f"[@db:heatmap:get_heatmap_data] Failed to parse audio JSON: {e}")
                                
                                # Store the latest data for this device in this bucket
                                device_latest_by_bucket[bucket_key][device_key] = {
                                    'host_name': result['host_name'],
                                    'device_id': result['device_id'],
                                    'filename': item.get('filename'),
                                    'image_url': item.get('image_url'),
                                    'timestamp': timestamp,  # Original timestamp for comparison
                                    'bucket_timestamp': bucket_key,  # Bucket timestamp for consistency
                                    'original_timestamp': item.get('timestamp', timestamp),
                                    'analysis_json': analysis_json,
                                    'has_frame_analysis': item.get('has_frame_analysis', False),
                                    'has_audio_analysis': item.get('has_audio_analysis', False)
                                }
                                
                        except Exception as e:
                            print(f"[@db:heatmap:get_heatmap_data] Error processing timestamp {timestamp}: {e}")
            
            # Convert deduplicated data to the expected format
            images_by_timestamp = {}
            for bucket_key, devices in device_latest_by_bucket.items():
                images_by_timestamp[bucket_key] = list(devices.values())
                print(f"[@db:heatmap:get_heatmap_data] Bucket {bucket_key}: {len(devices)} unique devices")
        
        # Get recent incidents
        incidents = []
        try:
            # Calculate time range for incidents
            end_time = datetime.now()
            start_time = end_time - timedelta(minutes=timeframe_minutes)
            
            # Query alerts without team_id since alerts table doesn't have that column
            incidents_result = supabase.table('alerts').select('*').gte('start_time', start_time.isoformat()).execute()
            
            for incident in incidents_result.data:
                incidents.append({
                    'id': incident.get('id', ''),
                    'host_name': incident.get('host_name', ''),
                    'device_id': incident.get('device_id', ''),
                    'incident_type': incident.get('incident_type', ''),
                    'start_time': incident.get('start_time', ''),
                    'end_time': incident.get('end_time'),
                    'status': incident.get('status', 'active')
                })
                
        except Exception as e:
            print(f"[@db:heatmap:get_heatmap_data] Warning: Could not fetch incidents: {e}")
            incidents = []
        
        # Create sorted timeline from available timestamps
        timeline_timestamps = sorted(images_by_timestamp.keys())
        
        heatmap_data = {
            'hosts_devices': hosts_devices,
            'images_by_timestamp': images_by_timestamp,
            'incidents': incidents,
            'timeline_timestamps': timeline_timestamps
        }
        
        print(f"[@db:heatmap:get_heatmap_data] Success:")
        print(f"  - hosts_devices: {len(hosts_devices)}")
        print(f"  - timeline_timestamps: {len(timeline_timestamps)}")
        print(f"  - incidents: {len(incidents)}")
        
        return {
            'success': True,
            'data': heatmap_data
        }
        
    except Exception as e:
        print(f"[@db:heatmap:get_heatmap_data] Error: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'data': {
                'hosts_devices': [],
                'images_by_timestamp': {},
                'incidents': [],
                'timeline_timestamps': []
            }
        } 