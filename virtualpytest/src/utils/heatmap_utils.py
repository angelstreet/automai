"""
Heatmap Utilities

This module provides server-side image processing functionality for creating
heatmap mosaics from host device captures with CPU limiting and R2 storage.
"""

import os
import json
import time
import uuid
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageDraw, ImageFont
import requests
import io

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
        
    def to_dict(self):
        return {
            'job_id': self.job_id,
            'status': self.status,
            'progress': self.progress,
            'mosaic_urls': self.mosaic_urls,
            'error': self.error,
            'created_at': self.created_at.isoformat()
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

def add_border_to_image(image: Image.Image, border_color: str, border_width: int = 5) -> Image.Image:
    """Add colored border to image based on incident status"""
    # Create new image with border
    new_width = image.width + 2 * border_width
    new_height = image.height + 2 * border_width
    
    bordered_image = Image.new('RGB', (new_width, new_height), border_color)
    bordered_image.paste(image, (border_width, border_width))
    
    return bordered_image

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
            audio_data = audio_analysis.get('audio_analysis', {})
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

def calculate_grid_layout(num_devices: int) -> Tuple[int, int]:
    """Calculate optimal grid layout for mosaic"""
    if num_devices <= 1:
        return (1, 1)
    elif num_devices <= 4:
        return (2, 2)
    elif num_devices <= 9:
        return (3, 3)
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
    Always shows images - never empty placeholders. Uses previous JSON analysis if current missing.
    """
    if not images_data:
        # Create empty mosaic
        return Image.new('RGB', target_size, (0, 0, 0))
    
    num_devices = len(images_data)
    cols, rows = calculate_grid_layout(num_devices)
    
    # Calculate cell size
    cell_width = target_size[0] // cols
    cell_height = target_size[1] // rows
    border_width = 8  # Thicker border for better visibility
    
    print(f"[@heatmap_utils:create_mosaic_image] Creating {cols}x{rows} grid for {num_devices} images")
    print(f"[@heatmap_utils:create_mosaic_image] Cell size: {cell_width}x{cell_height}")
    
    # Create mosaic canvas
    mosaic = Image.new('RGB', target_size, (0, 0, 0))
    
    for i, image_data in enumerate(images_data):
        if i >= cols * rows:
            break  # Don't exceed grid capacity
            
        # Calculate position
        col = i % cols
        row = i // cols
        x = col * cell_width
        y = row * cell_height
        
        try:
            # Fetch and process image
            image_url = image_data.get('image_url')
            device_image = None
            
            if image_url:
                device_image = fetch_image_from_url(image_url, timeout=5)  # Fast timeout
            
            if device_image:
                # Resize image to fit cell with border and label space
                available_width = cell_width - (border_width * 2)
                available_height = cell_height - (border_width * 2) - 25  # Space for label
                
                device_image.thumbnail((available_width, available_height), Image.Resampling.LANCZOS)
                
                # Add border based on incident status (with fallback strategy)
                border_color = determine_border_color(image_data)
                bordered_image = add_border_to_image(device_image, border_color, border_width)
                
                # Center image in cell (account for label space)
                paste_x = x + (cell_width - bordered_image.width) // 2
                paste_y = y + 25 + (cell_height - 25 - bordered_image.height) // 2
                
                mosaic.paste(bordered_image, (paste_x, paste_y))
                
            else:
                # Always show placeholder instead of empty - never leave empty
                draw = ImageDraw.Draw(mosaic)
                
                # Create placeholder with red border (indicates missing image)
                placeholder_rect = [x + border_width, y + 25 + border_width, 
                                  x + cell_width - border_width, y + cell_height - border_width]
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
                text_y = y + 25 + (cell_height - 25 - text_height) // 2
                draw.text((text_x, text_y), error_text, fill='white', font=font)
            
            # Always add host/device label at top of cell
            draw = ImageDraw.Draw(mosaic)
            try:
                font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 12)
            except:
                font = ImageFont.load_default()
            
            label = f"{image_data.get('host_name', 'Unknown')}-{image_data.get('device_id', 'device1')}"
            # Center the label
            text_bbox = draw.textbbox((0, 0), label, font=font)
            text_width = text_bbox[2] - text_bbox[0]
            label_x = x + (cell_width - text_width) // 2
            draw.text((label_x, y + 5), label, fill='white', font=font)
                
        except Exception as e:
            print(f"[@heatmap_utils:create_mosaic_image] Error processing image for {image_data.get('host_name')}: {e}")
            # Draw error placeholder with red border
            draw = ImageDraw.Draw(mosaic)
            error_rect = [x + border_width, y + 25 + border_width, 
                         x + cell_width - border_width, y + cell_height - border_width]
            draw.rectangle(error_rect, fill='#660000', outline='#FF0000', width=border_width)
            
            # Add error label
            try:
                font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 12)
            except:
                font = ImageFont.load_default()
            
            label = f"{image_data.get('host_name', 'Unknown')}-ERROR"
            text_bbox = draw.textbbox((0, 0), label, font=font)
            text_width = text_bbox[2] - text_bbox[0]
            label_x = x + (cell_width - text_width) // 2
            draw.text((label_x, y + 5), label, fill='white', font=font)
            device_label = f"{image_data.get('host_name', '')}-{image_data.get('device_id', '')}"
            
            # Try to use a font, fallback to default
            try:
                font = ImageFont.truetype("arial.ttf", 12)
            except:
                font = ImageFont.load_default()
                
            draw.text((x + 5, y + 5), device_label, fill=(255, 255, 255), font=font)
        except Exception as e:
            print(f"[@heatmap_utils] Failed to add device label: {e}")
    
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

def process_heatmap_generation(job_id: str, images_by_timestamp: Dict[str, List[Dict]], incidents: List[Dict]):
    """Process heatmap generation with image downloading and JSON analysis"""
    set_low_priority()
    
    with job_lock:
        job = active_jobs.get(job_id)
        if not job:
            return
        job.status = 'processing'
    
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
                try:
                    # Download image
                    image_response = requests.get(image_info['image_url'], timeout=5)
                    if image_response.status_code == 200:
                        image_data = image_response.content
                        
                        # Download JSON analysis files if available
                        frame_analysis = None
                        audio_analysis = None
                        
                        if image_info.get('frame_json_url'):
                            try:
                                frame_response = requests.get(image_info['frame_json_url'], timeout=3)
                                if frame_response.status_code == 200:
                                    frame_analysis = frame_response.json()
                            except Exception as e:
                                print(f"[@heatmap_utils] Failed to download frame JSON for {image_info['host_name']}: {e}")
                        
                        if image_info.get('audio_json_url'):
                            try:
                                audio_response = requests.get(image_info['audio_json_url'], timeout=3)
                                if audio_response.status_code == 200:
                                    audio_analysis = audio_response.json()
                            except Exception as e:
                                print(f"[@heatmap_utils] Failed to download audio JSON for {image_info['host_name']}: {e}")
                        
                        processed_images.append({
                            'host_name': image_info['host_name'],
                            'device_id': image_info['device_id'],
                            'image_data': image_data,
                            'frame_analysis': frame_analysis,
                            'audio_analysis': audio_analysis,
                            'has_analysis': frame_analysis is not None or audio_analysis is not None,
                            'original_timestamp': image_info.get('original_timestamp', timestamp)
                        })
                        
                    else:
                        print(f"[@heatmap_utils] Failed to download image for {image_info['host_name']}: HTTP {image_response.status_code}")
                        # Add placeholder for missing image
                        processed_images.append({
                            'host_name': image_info['host_name'],
                            'device_id': image_info['device_id'],
                            'image_data': None,
                            'error': f'HTTP {image_response.status_code}'
                        })
                        
                except Exception as e:
                    print(f"[@heatmap_utils] Error downloading data for {image_info['host_name']}: {e}")
                    # Add placeholder for error
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
            
            # Upload to R2 (following existing cloudflare_utils pattern)
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
                
                # Always add to generated_images (like script-reports pattern)
                # Use R2 URLs if upload succeeded, fallback URLs if failed
                if mosaic_upload['success'] and metadata_upload['success']:
                    generated_images.append({
                        'timestamp': timestamp,
                        'mosaic_url': mosaic_upload['url'],
                        'metadata_url': metadata_upload['url'],
                        'r2_paths': {
                            'mosaic': mosaic_r2_path,
                            'metadata': metadata_r2_path
                        },
                        'upload_success': True
                    })
                    print(f"[@heatmap_utils] Successfully uploaded heatmap for timestamp {timestamp}")
                else:
                    # Follow script-reports pattern: continue even if R2 upload fails
                    # Save files locally and provide fallback URLs
                    local_mosaic_path = f"/var/www/html/heatmaps/{timestamp}/mosaic.jpg"
                    local_metadata_path = f"/var/www/html/heatmaps/{timestamp}/metadata.json"
                    
                    # Ensure directory exists
                    import os
                    os.makedirs(os.path.dirname(local_mosaic_path), exist_ok=True)
                    
                    # Copy temp files to local serving directory
                    import shutil
                    shutil.copy2(temp_path, local_mosaic_path)
                    shutil.copy2(temp_json_path, local_metadata_path)
                    
                    # Generate fallback URLs using host serving pattern
                    fallback_mosaic_url = f"/host/heatmaps/{timestamp}/mosaic.jpg"
                    fallback_metadata_url = f"/host/heatmaps/{timestamp}/metadata.json"
                    
                    generated_images.append({
                        'timestamp': timestamp,
                        'mosaic_url': fallback_mosaic_url,
                        'metadata_url': fallback_metadata_url,
                        'local_paths': {
                            'mosaic': local_mosaic_path,
                            'metadata': local_metadata_path
                        },
                        'upload_success': False,
                        'upload_error': {
                            'mosaic': mosaic_upload.get('error', 'Upload failed'),
                            'metadata': metadata_upload.get('error', 'Upload failed')
                        }
                    })
                    print(f"[@heatmap_utils] R2 upload failed, using local fallback for timestamp {timestamp}")
                    print(f"[@heatmap_utils] Mosaic upload: {mosaic_upload}")
                    print(f"[@heatmap_utils] Metadata upload: {metadata_upload}")
                
                # Cleanup temp files
                for temp_file in [temp_path, temp_json_path]:
                    if os.path.exists(temp_file):
                        os.remove(temp_file)
                
            except Exception as upload_error:
                print(f"[@heatmap_utils] Upload error for timestamp {timestamp}: {upload_error}")
                import traceback
                print(f"[@heatmap_utils] Upload traceback: {traceback.format_exc()}")
                
                # Even on exception, try to provide local fallback
                try:
                    local_mosaic_path = f"/var/www/html/heatmaps/{timestamp}/mosaic.jpg"
                    local_metadata_path = f"/var/www/html/heatmaps/{timestamp}/metadata.json"
                    
                    import os
                    os.makedirs(os.path.dirname(local_mosaic_path), exist_ok=True)
                    
                    import shutil
                    if os.path.exists(temp_path):
                        shutil.copy2(temp_path, local_mosaic_path)
                    if os.path.exists(temp_json_path):
                        shutil.copy2(temp_json_path, local_metadata_path)
                    
                    generated_images.append({
                        'timestamp': timestamp,
                        'mosaic_url': f"/host/heatmaps/{timestamp}/mosaic.jpg",
                        'metadata_url': f"/host/heatmaps/{timestamp}/metadata.json",
                        'local_paths': {
                            'mosaic': local_mosaic_path,
                            'metadata': local_metadata_path
                        },
                        'upload_success': False,
                        'upload_error': str(upload_error)
                    })
                    print(f"[@heatmap_utils] Exception fallback: saved locally for timestamp {timestamp}")
                except Exception as fallback_error:
                    print(f"[@heatmap_utils] Fallback also failed for timestamp {timestamp}: {fallback_error}")
                
                # Cleanup temp files
                for temp_file in [temp_path, temp_json_path]:
                    if os.path.exists(temp_file):
                        try:
                            os.remove(temp_file)
                        except:
                            pass
            
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

# Thread pool for background processing
executor = ThreadPoolExecutor(max_workers=MAX_WORKER_THREADS)

def start_heatmap_generation(job_id: str, images_by_timestamp: Dict[str, List[Dict]], incidents: List[Dict]):
    """Start heatmap generation in background"""
    future = executor.submit(process_heatmap_generation, job_id, images_by_timestamp, incidents)
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