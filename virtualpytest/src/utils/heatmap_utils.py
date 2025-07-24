"""
Heatmap Utilities

This module provides server-side image processing functionality for creating
heatmap mosaics from host device captures with CPU limiting and R2 storage.
"""

import tempfile
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
from threading import Lock
from typing import Dict, List, Optional, Tuple
import io
import json
import uuid
import os
from PIL import Image, ImageDraw, ImageFont
import threading

# Global state for job management
active_jobs = {}
job_lock = threading.Lock()

# CPU limiting configuration
MAX_WORKER_THREADS = 2  # Limit to 2 threads to keep CPU usage low
PROCESS_PRIORITY_LOW = True  # Set low process priority

class HeatmapJob:
    def __init__(self, job_id: str, timeframe_minutes: int = 1):
        self.job_id = job_id
        self.status = 'pending'  # pending, processing, completed, failed
        self.progress = 0  # 0-100
        self.timeframe_minutes = timeframe_minutes
        self.mosaic_urls = []
        self.error = None
        self.created_at = datetime.now()
        self.start_time = None  # When processing actually started
        self.end_time = None    # When processing completed
        self.heatmap_data = None  # Store the original heatmap data
        
    def to_dict(self):
        processing_time = None
        if self.start_time:
            end_time = self.end_time or datetime.now()
            processing_time = (end_time - self.start_time).total_seconds()
            
        return {
            'job_id': self.job_id,
            'status': self.status,
            'progress': self.progress,
            'mosaic_urls': self.mosaic_urls,
            'error': self.error,
            'created_at': self.created_at.isoformat(),
            'processing_time': processing_time,
            'heatmap_data': self.heatmap_data
        }

def set_low_priority():
    """Set low process priority to limit CPU usage"""
    try:
        if PROCESS_PRIORITY_LOW:
            import psutil
            p = psutil.Process(os.getpid())
            if os.name == 'nt':  # Windows
                p.nice(psutil.BELOW_NORMAL_PRIORITY_CLASS)
            else:  # Unix/Linux
                p.nice(10)  # Lower priority (higher nice value)
    except ImportError:
        print("[@heatmap_utils] psutil not available, cannot set process priority")
    except Exception as e:
        print(f"[@heatmap_utils] Failed to set process priority: {e}")

def create_heatmap_job(timeframe_minutes: int = 1) -> str:
    """Create a new heatmap generation job"""
    job_id = str(uuid.uuid4())
    
    with job_lock:
        active_jobs[job_id] = HeatmapJob(job_id, timeframe_minutes)
    
    print(f"[@heatmap_utils] Created heatmap job: {job_id}")
    return job_id

def get_job_status(job_id: str) -> Optional[Dict]:
    """Get the status of a heatmap job"""
    with job_lock:
        job = active_jobs.get(job_id)
        if job:
            return job.to_dict()
    return None

def cancel_job(job_id: str) -> bool:
    """Cancel a heatmap generation job"""
    with job_lock:
        job = active_jobs.get(job_id)
        if job and job.status in ['pending', 'processing']:
            job.status = 'failed'
            job.error = 'Cancelled by user'
            job.end_time = datetime.now()  # Record when processing was cancelled
            print(f"[@heatmap_utils] Cancelled job: {job_id}")
            return True
    return False

def fetch_image_from_url(url: str, timeout: int = 10) -> Optional[Image.Image]:
    """Fetch image from URL with timeout"""
    try:
        response = requests.get(url, timeout=timeout)
        if response.status_code == 200:
            image = Image.open(io.BytesIO(response.content))
            return image
    except Exception as e:
        print(f"[@heatmap_utils] Failed to fetch image from {url}: {e}")
    return None



def determine_border_color(image_data: Dict) -> str:
    """Determine border color based on analysis and incidents with fallback strategy"""
    host_name = image_data.get('host_name', 'unknown')
    device_id = image_data.get('device_id', 'device1')
    
    # Check current analysis first
    current_analysis = get_current_analysis_status(image_data)
    if current_analysis is not None:
        # Cache this analysis for future use
        cache_analysis_for_host(host_name, device_id, current_analysis)
        return '#FF0000' if current_analysis else '#00FF00'  # Red for errors, Green for OK
    
    # Fallback to previous cached analysis
    previous_analysis = get_cached_analysis_for_host(host_name, device_id)
    if previous_analysis is not None:
        print(f"[@heatmap_utils] Using cached analysis for {host_name}-{device_id}: {'error' if previous_analysis else 'ok'}")
        return '#FF0000' if previous_analysis else '#00FF00'
    
    # Ultimate fallback - assume OK but with different color to indicate uncertainty
    print(f"[@heatmap_utils] No analysis available for {host_name}-{device_id}, assuming OK")
    return '#FFFF00'  # Yellow border indicates "no analysis available"

def get_current_analysis_status(image_data: Dict) -> Optional[bool]:
    """
    Extract current analysis status from image data.
    Returns True if errors detected, False if all OK, None if no analysis.
    """
    try:
        frame_analysis = image_data.get('frame_analysis')
        audio_analysis = image_data.get('audio_analysis')
        
        has_errors = False
        
        # Check frame analysis
        if frame_analysis and isinstance(frame_analysis, dict):
            analysis = frame_analysis.get('analysis', {})
            if analysis.get('blackscreen') or analysis.get('freeze') or analysis.get('errors'):
                has_errors = True
        
        # Check audio analysis  
        if audio_analysis and isinstance(audio_analysis, dict):
            audio_data = audio_analysis.get('analysis', audio_analysis)
            if not audio_data.get('has_audio', True):  # No audio is considered an error
                has_errors = True
        
        # If we have any analysis, return the status
        if frame_analysis or audio_analysis:
            return has_errors
        
        # No analysis available
        return None
        
    except Exception as e:
        print(f"[@heatmap_utils:get_current_analysis_status] Error parsing analysis: {e}")
        return None

# Simple in-memory cache for previous analysis (could be enhanced with Redis/database)
_analysis_cache = {}

def cache_analysis_for_host(host_name: str, device_id: str, has_errors: bool):
    """Cache analysis result for host/device combination."""
    key = f"{host_name}-{device_id}"
    _analysis_cache[key] = {
        'has_errors': has_errors,
        'timestamp': time.time()
    }

def get_cached_analysis_for_host(host_name: str, device_id: str) -> Optional[bool]:
    """Get cached analysis result for host/device combination."""
    key = f"{host_name}-{device_id}"
    cached = _analysis_cache.get(key)
    
    if cached:
        # Use cached data if it's less than 5 minutes old
        if time.time() - cached['timestamp'] < 300:  # 5 minutes
            return cached['has_errors']
    
    return None

def determine_border_color_from_analysis(image_data: Dict) -> str:
    """Determine border color based on pre-calculated has_incidents from host."""
    try:
        analysis_json = image_data.get('analysis_json')
        if not analysis_json:
            print(f"[@heatmap_utils:determine_border_color_from_analysis] No analysis data, treating as no incidents (green border)")
            return "#00FF00"  # Green for missing analysis (assume no incidents)
            
        # Use pre-calculated has_incidents from host
        has_incidents = analysis_json.get('has_incidents', False)
        
        if has_incidents:
            return '#FF0000'  # Red for incidents
        else:
            return '#00FF00'  # Green for no incidents
            
    except Exception as e:
        print(f"[@heatmap_utils:determine_border_color_from_analysis] Error: {e}")
        return "#00FF00"  # Green for error (assume no incidents)

def calculate_grid_layout(num_devices: int) -> Tuple[int, int]:
    """Calculate optimal grid layout for mosaic"""
    if num_devices <= 1:
        return (1, 1)
    elif num_devices == 2:
        return (2, 1)  # 2 devices side by side, no wasted vertical space
    elif num_devices == 3:
        return (2, 2)  # 3 devices in 2x2 grid (one cell empty, but better aspect ratio)
    elif num_devices == 4:
        return (2, 2)  # Perfect 2x2 grid
    elif num_devices <= 6:
        return (3, 2)  # 3x2 grid for 5-6 devices
    elif num_devices <= 9:
        return (3, 3)
    elif num_devices <= 12:
        return (4, 3)  # 4x3 grid for 10-12 devices
    elif num_devices <= 16:
        return (4, 4)
    elif num_devices <= 25:
        return (5, 5)
    else:
        # For larger numbers, try to keep aspect ratio reasonable
        import math
        cols = math.ceil(math.sqrt(num_devices))
        rows = math.ceil(num_devices / cols)
        return (cols, rows)

def create_mosaic_image(images_data: List[Dict], target_size: Tuple[int, int] = (1920, 1080)) -> Image.Image:
    """
    Create a mosaic image from multiple device images.
    Optimized for maximum space usage with border-to-border layout and overlay labels.
    """
    if not images_data:
        # Create empty mosaic
        return Image.new('RGB', target_size, (0, 0, 0))
    
    num_devices = len(images_data)
    cols, rows = calculate_grid_layout(num_devices)
    
    # Calculate cell size - no space reserved for labels (they'll be overlays)
    cell_width = target_size[0] // cols
    cell_height = target_size[1] // rows
    
    # Calculate actual mosaic size based on grid (eliminate unused space)
    actual_width = cell_width * cols
    actual_height = cell_height * rows
    
    border_width = 4  # Thinner border for more image space
    
    print(f"[@heatmap_utils:create_mosaic_image] Creating {cols}x{rows} grid for {num_devices} images")
    print(f"[@heatmap_utils:create_mosaic_image] Cell size: {cell_width}x{cell_height}")
    print(f"[@heatmap_utils:create_mosaic_image] Actual mosaic size: {actual_width}x{actual_height} (no wasted space)")
    
    # Create mosaic canvas with actual needed size
    mosaic = Image.new('RGB', (actual_width, actual_height), (0, 0, 0))
    
    for i, image_data in enumerate(images_data):
        if i >= cols * rows:
            break  # Don't exceed grid capacity
            
        # Calculate position - border to border
        col = i % cols
        row = i // cols
        x = col * cell_width
        y = row * cell_height
        
        try:
            # Use already downloaded image data instead of fetching from URL
            device_image = None
            
            if image_data.get('image_data'):
                # Convert bytes to PIL Image
                try:
                    device_image = Image.open(io.BytesIO(image_data['image_data']))
                except Exception as e:
                    print(f"[@heatmap_utils:create_mosaic_image] Failed to open image data: {e}")
                    device_image = None
            
            if device_image:
                # Calculate available space within the cell (accounting for borders)
                available_width = cell_width - (border_width * 2)
                available_height = cell_height - (border_width * 2)
                
                # Preserve aspect ratio using 'contain' approach (like CSS object-fit: contain)
                original_width, original_height = device_image.size
                original_aspect = original_width / original_height
                available_aspect = available_width / available_height
                
                if original_aspect > available_aspect:
                    # Image is wider than available space - limit by width
                    new_width = available_width
                    new_height = int(available_width / original_aspect)
                else:
                    # Image is taller than available space - limit by height
                    new_height = available_height
                    new_width = int(available_height * original_aspect)
                
                # Resize image while preserving aspect ratio
                device_image = device_image.resize((new_width, new_height), Image.Resampling.LANCZOS)
                
                # Create a cell-sized background with the border color
                border_color = determine_border_color_from_analysis(image_data)
                print(f"[@heatmap_utils:create_mosaic_image] {image_data.get('host_name')} {image_data.get('device_id')}: analysis_json={image_data.get('analysis_json')}, border_color={border_color}")
                
                # Create cell background with border
                cell_background = Image.new('RGB', (cell_width, cell_height), border_color)
                
                # Create inner area for the image (black background)
                inner_area = Image.new('RGB', (available_width, available_height), (0, 0, 0))
                
                # Center the resized image within the inner area
                center_x = (available_width - new_width) // 2
                center_y = (available_height - new_height) // 2
                inner_area.paste(device_image, (center_x, center_y))
                
                # Paste the inner area onto the cell background (with border)
                cell_background.paste(inner_area, (border_width, border_width))
                
                # Paste the complete cell onto the mosaic
                paste_x = x
                paste_y = y
                
                mosaic.paste(cell_background, (paste_x, paste_y))
                
                # Don't add the small black label in the corner - the main host name is already in the image
                
            else:
                # Always show placeholder instead of empty - never leave empty
                draw = ImageDraw.Draw(mosaic)
                
                # Create placeholder to fill entire cell with red border
                placeholder_rect = [x, y, x + cell_width, y + cell_height]
                draw.rectangle(placeholder_rect, fill='#333333', outline='#FF0000', width=border_width)
                
                # Add "No Image" text
                try:
                    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
                except:
                    font = ImageFont.load_default()
                
                error_text = "No Image"
                text_bbox = draw.textbbox((0, 0), error_text, font=font)
                text_width = text_bbox[2] - text_bbox[0]
                text_height = text_bbox[3] - text_bbox[1]
                text_x = x + (cell_width - text_width) // 2
                text_y = y + (cell_height - text_height) // 2
                draw.text((text_x, text_y), error_text, fill='white', font=font)
                
                # Don't add the small black label in the corner for placeholders either
                
        except Exception as e:
            print(f"[@heatmap_utils:create_mosaic_image] Error processing image for {image_data.get('host_name')}: {e}")
            # Draw error placeholder to fill entire cell with red border
            draw = ImageDraw.Draw(mosaic)
            error_rect = [x, y, x + cell_width, y + cell_height]
            draw.rectangle(error_rect, fill='#660000', outline='#FF0000', width=border_width)
            
            # Add error message to the center of the cell
            try:
                label_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 14)
            except:
                label_font = ImageFont.load_default()
            
            error_text = "ERROR"
            text_bbox = draw.textbbox((0, 0), error_text, font=label_font)
            text_width = text_bbox[2] - text_bbox[0]
            text_height = text_bbox[3] - text_bbox[1]
            text_x = x + (cell_width - text_width) // 2
            text_y = y + (cell_height - text_height) // 2
            draw.text((text_x, text_y), error_text, fill='white', font=label_font)
    
    return mosaic

def upload_to_r2(image: Image.Image, filename: str) -> Optional[str]:
    """Upload image to R2 storage and return public URL"""
    try:
        # Convert image to bytes
        img_bytes = io.BytesIO()
        image.save(img_bytes, format='JPEG', quality=85)
        img_bytes.seek(0)
        
        # TODO: Implement actual R2 upload
        # For now, save locally and return mock URL
        local_path = f"/tmp/heatmap/{filename}"
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        
        with open(local_path, 'wb') as f:
            f.write(img_bytes.getvalue())
        
        # Return mock URL (replace with actual R2 URL)
        public_url = f"https://your-r2-domain.com/heatmap/{filename}"
        print(f"[@heatmap_utils] Uploaded mosaic to: {public_url}")
        
        return public_url
        
    except Exception as e:
        print(f"[@heatmap_utils] Failed to upload to R2: {e}")
        return None

def process_heatmap_generation(job_id: str, images_by_timestamp: Dict[str, List[Dict]], incidents: List[Dict], team_id: str):
    """Process heatmap generation with image downloading and JSON analysis"""
    import os
    set_low_priority()
    
    with job_lock:
        job = active_jobs.get(job_id)
        if not job:
            return
        job.status = 'processing'
        job.start_time = datetime.now()  # Record when processing actually started
    
    try:
        timestamps = sorted(images_by_timestamp.keys())
        total_timestamps = len(timestamps)
        
        if total_timestamps == 0:
            raise Exception("No timestamps to process")
        
        generated_images = []
        
        for i, timestamp in enumerate(timestamps):
            # Check if job was cancelled
            with job_lock:
                if active_jobs[job_id].status == 'failed':
                    return
            
            images_data = images_by_timestamp[timestamp]
            print(f"[@heatmap_utils] Processing timestamp bucket: {timestamp} with {len(images_data)} images")
            
            # Download images and JSON analysis for this timestamp
            processed_images = []
            
            for image_info in images_data:
                print(f"[@heatmap_utils:process_heatmap_generation] Processing {image_info['host_name']} {image_info['device_id']}: analysis_json={image_info.get('analysis_json')}")
                try:
                    # Use pre-downloaded image data (no more HTTP requests to hosts)
                    image_data = image_info.get('image_data')
                    
                    if image_data:
                        # Use pre-parsed analysis data from initial host query
                        analysis_json = image_info.get('analysis_json', {
                            'blackscreen': False,
                            'freeze': False,
                            'audio_loss': False
                        })
                        
                        processed_images.append({
                            'host_name': image_info['host_name'],
                            'device_id': image_info['device_id'],
                            'image_data': image_data,
                            'analysis_json': analysis_json,
                            'original_timestamp': image_info.get('original_timestamp', timestamp)
                        })
                        
                    else:
                        print(f"[@heatmap_utils] No image data for {image_info['host_name']}: using placeholder")
                        # Add placeholder for missing image to keep grid layout
                        processed_images.append({
                            'host_name': image_info['host_name'],
                            'device_id': image_info['device_id'],
                            'image_data': None,
                            'error': 'No image data available'
                        })
                        
                except Exception as e:
                    print(f"[@heatmap_utils] Error processing data for {image_info['host_name']}: {e}")
                    # Add placeholder for error to keep grid layout
                    processed_images.append({
                        'host_name': image_info['host_name'],
                        'device_id': image_info['device_id'],
                        'image_data': None,
                        'error': str(e)
                    })
            
            if not processed_images:
                print(f"[@heatmap_utils] No images processed for timestamp {timestamp}, skipping")
                continue
            
            # Create mosaic for this timestamp
            mosaic_image = create_mosaic_image(processed_images)
            
            # Create metadata (exclude binary data to avoid JSON serialization errors)
            serializable_analysis = []
            for img in processed_images:
                serializable_analysis.append({
                    'host_name': img.get('host_name'),
                    'device_id': img.get('device_id'),
                    'has_image': img.get('image_data') is not None,
                    'analysis_json': img.get('analysis_json', {}),
                    'error': img.get('error')
                })
            
            metadata = {
                'timestamp': timestamp,
                'hosts_included': len([img for img in processed_images if img.get('image_data')]),
                'hosts_total': len(processed_images),
                'analysis_data': serializable_analysis,  # Only serializable data
                'incidents': [inc for inc in incidents if timestamp in inc.get('start_time', '')],
                'generated_at': datetime.now().isoformat()
            }
            
            # Upload to R2 - no fallbacks
            try:
                from src.utils.cloudflare_utils import get_cloudflare_utils
                uploader = get_cloudflare_utils()
                
                # Save mosaic to temp file
                temp_path = f"/tmp/heatmap_{timestamp}_{job_id}.jpg"
                mosaic_image.save(temp_path, 'JPEG', quality=85)
                
                # Save metadata to temp file
                temp_json_path = f"/tmp/heatmap_{timestamp}_{job_id}.json"
                with open(temp_json_path, 'w') as f:
                    json.dump(metadata, f, indent=2)
                
                # Upload mosaic image
                mosaic_r2_path = f"heatmaps/{timestamp}/mosaic.jpg"
                mosaic_upload = uploader.upload_file(temp_path, mosaic_r2_path)
                
                # Upload metadata JSON
                metadata_r2_path = f"heatmaps/{timestamp}/metadata.json"
                metadata_upload = uploader.upload_file(temp_json_path, metadata_r2_path)
                
                # Generate and upload HTML report
                from src.utils.heatmap_report_utils import generate_heatmap_html
                from src.utils.cloudflare_utils import upload_heatmap_html
                
                html_content = generate_heatmap_html({
                    'timestamp': timestamp,
                    'mosaic_url': mosaic_upload['url'] if mosaic_upload['success'] else '',
                    'analysis_data': serializable_analysis,
                    'incidents': [inc for inc in incidents if timestamp in inc.get('start_time', '')]
                })
                
                html_upload = upload_heatmap_html(html_content, timestamp)
                
                # Only proceed if all uploads succeed
                if mosaic_upload['success'] and metadata_upload['success'] and html_upload['success']:
                    # Save to database using passed team_id
                    from src.lib.supabase.heatmap_db import save_heatmap_to_db
                    
                    hosts_included = len([img for img in processed_images if img.get('image_data')])
                    hosts_total = len(processed_images)
                    incidents_count = len([inc for inc in incidents if timestamp in inc.get('start_time', '')])
                    
                    heatmap_id = save_heatmap_to_db(
                        team_id=team_id,
                        timestamp=timestamp,
                        job_id=job_id,
                        mosaic_r2_path=mosaic_r2_path,
                        mosaic_r2_url=mosaic_upload['url'],
                        metadata_r2_path=metadata_r2_path,
                        metadata_r2_url=metadata_upload['url'],
                        html_r2_path=html_upload['html_path'],
                        html_r2_url=html_upload['html_url'],
                        hosts_included=hosts_included,
                        hosts_total=hosts_total,
                        incidents_count=incidents_count
                    )
                    
                    generated_images.append({
                        'timestamp': timestamp,
                        'mosaic_url': mosaic_upload['url'],
                        'metadata_url': metadata_upload['url'],
                        'html_url': html_upload['html_url'],
                        'heatmap_id': heatmap_id,
                        'r2_paths': {
                            'mosaic': mosaic_r2_path,
                            'metadata': metadata_r2_path,
                            'html': html_upload['html_path']
                        }
                    })
                    print(f"[@heatmap_utils] Successfully uploaded heatmap with HTML for timestamp {timestamp}")
                else:
                    # Upload failed - raise exception to fail the job
                    errors = []
                    if not mosaic_upload['success']:
                        errors.append(f"Mosaic: {mosaic_upload.get('error', 'Unknown')}")
                    if not metadata_upload['success']:
                        errors.append(f"Metadata: {metadata_upload.get('error', 'Unknown')}")
                    if not html_upload['success']:
                        errors.append(f"HTML: {html_upload.get('error', 'Unknown')}")
                    
                    error_msg = f"R2 upload failed - {', '.join(errors)}"
                    print(f"[@heatmap_utils] {error_msg}")
                    raise Exception(error_msg)
                
                # Cleanup temp files
                for temp_file in [temp_path, temp_json_path]:
                    if os.path.exists(temp_file):
                        os.remove(temp_file)
                
            except Exception as upload_error:
                print(f"[@heatmap_utils] Upload error for timestamp {timestamp}: {upload_error}")
                # Cleanup temp files
                for temp_file in [temp_path, temp_json_path]:
                    if os.path.exists(temp_file):
                        try:
                            os.remove(temp_file)
                        except:
                            pass
                # Re-raise to fail the job
                raise upload_error
            
            # Update progress
            progress = int((i + 1) / total_timestamps * 100)
            with job_lock:
                active_jobs[job_id].progress = progress
            
            print(f"[@heatmap_utils] Job {job_id}: {progress}% complete")
            
            # Small delay to prevent CPU overload
            time.sleep(0.1)
        
        # Mark job as completed
        with job_lock:
            job = active_jobs[job_id]
            job.status = 'completed'
            job.progress = 100
            job.end_time = datetime.now()  # Record when processing completed
            # Set mosaic_urls for frontend consumption
            job.mosaic_urls = [img['mosaic_url'] for img in generated_images]
            job.result = {
                'generated_images': generated_images,
                'total_timestamps': total_timestamps,
                'successful_timestamps': len(generated_images)
            }
        
        print(f"[@heatmap_utils] Job {job_id} completed successfully")
        print(f"[@heatmap_utils] Generated {len(generated_images)} heatmaps from {total_timestamps} timestamp buckets")
        
    except Exception as e:
        print(f"[@heatmap_utils] Job {job_id} failed: {e}")
        with job_lock:
            job = active_jobs[job_id]
            job.status = 'failed'
            job.error = str(e)
            job.end_time = datetime.now()  # Record when processing failed

# Thread pool for background processing
executor = ThreadPoolExecutor(max_workers=MAX_WORKER_THREADS)

def start_heatmap_generation(job_id: str, images_by_timestamp: Dict[str, List[Dict]], incidents: List[Dict], heatmap_data: Dict = None, team_id: str = None):
    """Start heatmap generation in background"""
    # Store the original heatmap data in the job
    with job_lock:
        job = active_jobs.get(job_id)
        if job and heatmap_data:
            job.heatmap_data = heatmap_data
    
    future = executor.submit(process_heatmap_generation, job_id, images_by_timestamp, incidents, team_id)
    print(f"[@heatmap_utils] Started background processing for job: {job_id}")
    return future

def cleanup_old_jobs(max_age_hours: int = 24):
    """Clean up old completed/failed jobs"""
    cutoff_time = datetime.now() - timedelta(hours=max_age_hours)
    
    with job_lock:
        jobs_to_remove = [
            job_id for job_id, job in active_jobs.items()
            if job.created_at < cutoff_time and job.status in ['completed', 'failed']
        ]
        
        for job_id in jobs_to_remove:
            del active_jobs[job_id]
            print(f"[@heatmap_utils] Cleaned up old job: {job_id}")

# Auto-cleanup on module load
cleanup_old_jobs() 