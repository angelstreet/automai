"""
Heatmap Report Utilities

Comprehensive HTML generation for heatmap display with timeline navigation.
"""

import json
from datetime import datetime
from typing import Dict, List
from .heatmap_template_utils import create_heatmap_html_template

def generate_comprehensive_heatmap_html(all_heatmap_data: List[Dict]) -> str:
    """Generate ONE comprehensive heatmap HTML report with all mosaics and timeline navigation."""
    try:
        template = create_heatmap_html_template()
        
        if not all_heatmap_data:
            return "<html><body><h1>No heatmap data available</h1></body></html>"
        
        # Calculate summary stats with null checks
        total_timestamps = len(all_heatmap_data)
        
        # Safe access to analysis_data with null checks
        first_data = all_heatmap_data[0] if all_heatmap_data else {}
        analysis_data = first_data.get('analysis_data', []) if first_data else []
        total_devices = len(analysis_data) if analysis_data else 0
        
        # Count incidents with null checks
        incidents_count = 0
        for data in all_heatmap_data:
            if data and isinstance(data, dict):
                incidents = data.get('incidents', [])
                if incidents:
                    incidents_count += len(incidents)
        
        generated_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # Prepare data for JavaScript
        mosaic_data_for_js = []
        timeline_ticks = []
        
        for i, heatmap_data in enumerate(all_heatmap_data):
            # Skip if heatmap_data is None or not a dict
            if not heatmap_data or not isinstance(heatmap_data, dict):
                continue
                
            # Generate analysis HTML for this timestamp
            analysis_items = []
            analysis_data = heatmap_data.get('analysis_data', [])
            has_incidents = False
            
            # Safe iteration over analysis_data
            if analysis_data and isinstance(analysis_data, list):
                for item in analysis_data:
                    if not item or not isinstance(item, dict):
                        continue
                        
                    host_name = item.get('host_name', 'Unknown')
                    device_id = item.get('device_id', 'Unknown')
                    analysis_json = item.get('analysis_json', {})
                    
                    # Safe access to analysis_json
                    if not analysis_json or not isinstance(analysis_json, dict):
                        analysis_json = {}
                    
                    has_error = not item.get('has_image', True) or item.get('error')
                    
                    # Check if this device has incidents
                    device_has_incidents = (
                        analysis_json.get('freeze', False) or
                        analysis_json.get('blackscreen', False) or
                        not analysis_json.get('audio', True)
                    )
                    
                    if device_has_incidents:
                        has_incidents = True
                    
                    # Format analysis data
                    freeze_status = "FREEZE" if analysis_json.get('freeze', False) else "Normal"
                    blackscreen_status = "BLACK" if analysis_json.get('blackscreen', False) else "Normal"
                    audio_status = "No Audio" if not analysis_json.get('audio', True) else "Audio OK"
                    
                    error_class = "error" if has_error or device_has_incidents else ""
                    error_info = f"<div style='color: #dc3545; font-size: 0.8em;'>Error: {item.get('error', 'No image')}</div>" if has_error else ""
                    
                    analysis_items.append(f"""
                    <div class="analysis-item {error_class}">
                        <h3>{host_name} - {device_id}</h3>
                        <div class="analysis-data">
                            <div>Freeze: <strong>{freeze_status}</strong></div>
                            <div>Screen: <strong>{blackscreen_status}</strong></div>
                            <div>Audio: <strong>{audio_status}</strong></div>
                            {error_info}
                        </div>
                    </div>
                    """)
            
            # Add to JavaScript data
            mosaic_data_for_js.append({
                'mosaic_url': heatmap_data.get('mosaic_url', ''),
                'analysis_html': ''.join(analysis_items),
                'timestamp': heatmap_data.get('timestamp', ''),
                'has_incidents': has_incidents
            })
            
            # Create timeline tick
            tick_position = (i / max(1, total_timestamps - 1)) * 100
            tick_class = "incident" if has_incidents else "normal"
            timeline_ticks.append(f"""
            <div class="timeline-tick {tick_class}" style="left: {tick_position}%" title="{heatmap_data.get('timestamp', '')}"></div>
            """)
        
        # Get first frame data safely
        first_data = all_heatmap_data[0] if all_heatmap_data else {}
        first_mosaic_url = first_data.get('mosaic_url', '') if first_data else ''
        first_analysis_items = mosaic_data_for_js[0]['analysis_html'] if mosaic_data_for_js else ''
        
        # Create timeframe string
        if total_timestamps > 1 and all_heatmap_data:
            first_timestamp = all_heatmap_data[0].get('timestamp', '') if all_heatmap_data[0] else ''
            last_timestamp = all_heatmap_data[-1].get('timestamp', '') if all_heatmap_data[-1] else ''
            timeframe = f"{first_timestamp} - {last_timestamp}"
        else:
            timeframe = first_data.get('timestamp', '') if first_data else ''
        
        # Fill template
        html_content = template.format(
            timeframe=timeframe,
            generated_at=generated_at,
            total_devices=total_devices,
            total_timestamps=total_timestamps,
            incidents_count=incidents_count,
            first_mosaic_url=first_mosaic_url,
            max_frame=max(0, total_timestamps - 1),
            timeline_ticks=''.join(timeline_ticks),
            first_analysis_items=first_analysis_items,
            mosaic_data_json=json.dumps(mosaic_data_for_js)
        )
        
        return html_content
        
    except Exception as e:
        print(f"[@heatmap_report_utils] Error details: {str(e)}")
        return f"<html><body><h1>Error generating comprehensive heatmap HTML</h1><p>{str(e)}</p></body></html>" 