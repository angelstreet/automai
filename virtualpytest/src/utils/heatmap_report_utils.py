"""
Heatmap Report Utilities

Minimal HTML generation for heatmap display.
"""

from datetime import datetime
from typing import Dict, List
from .heatmap_template_utils import create_heatmap_html_template

def generate_heatmap_html(heatmap_data: Dict) -> str:
    """Generate minimal heatmap HTML report."""
    try:
        template = create_heatmap_html_template()
        
        # Extract data
        timestamp = heatmap_data.get('timestamp', '')
        mosaic_url = heatmap_data.get('mosaic_url', '')
        analysis_data = heatmap_data.get('analysis_data', [])
        incidents = heatmap_data.get('incidents', [])
        generated_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # Generate analysis items
        analysis_items = []
        for item in analysis_data:
            host_name = item.get('host_name', 'Unknown')
            device_id = item.get('device_id', 'Unknown')
            analysis_json = item.get('analysis_json', {})
            has_error = not item.get('has_image', True) or item.get('error')
            
            # Format analysis data
            freeze_status = "FREEZE" if analysis_json.get('freeze', False) else "Normal"
            blackscreen_status = "BLACK" if analysis_json.get('blackscreen', False) else "Normal"
            audio_status = "No Audio" if not analysis_json.get('audio', True) else "Audio OK"
            
            error_class = "error" if has_error else ""
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
        
        # Generate incidents section
        incidents_section = ""
        if incidents:
            incident_items = []
            for incident in incidents:
                incident_items.append(f"""
                <div class="incident">
                    <strong>{incident.get('incident_type', 'Unknown')}</strong> - 
                    {incident.get('host_name', 'Unknown')} {incident.get('device_id', '')} 
                    at {incident.get('start_time', '')}
                </div>
                """)
            
            incidents_section = f"""
            <div class="incidents-section">
                <h2 style="margin-bottom: 15px;">Incidents ({len(incidents)})</h2>
                {''.join(incident_items)}
            </div>
            """
        
        # Fill template
        html_content = template.format(
            timestamp=timestamp,
            generated_at=generated_at,
            mosaic_url=mosaic_url,
            analysis_items=''.join(analysis_items),
            incidents_section=incidents_section
        )
        
        return html_content
        
    except Exception as e:
        return f"<html><body><h1>Error generating heatmap HTML</h1><p>{str(e)}</p></body></html>" 