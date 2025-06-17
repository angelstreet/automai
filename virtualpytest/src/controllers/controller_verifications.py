"""
Controller Verifications - Simplified verification definitions for verification controllers

This file contains all verification definitions in simplified format,
keeping only essential parameters needed for execution.
"""

# Video Verification Actions
VIDEO_VERIFICATIONS = {
    'wait_for_video_appear': {'timeout': 10.0, 'threshold': 0.1, 'area': None},
    'wait_for_video_disappear': {'timeout': 10.0, 'threshold': 0.1, 'area': None}
}

# Image Verification Actions  
IMAGE_VERIFICATIONS = {
    'wait_for_image_appear': {'timeout': 10.0, 'confidence': 0.8, 'area': None},
    'wait_for_image_disappear': {'timeout': 10.0, 'confidence': 0.8, 'area': None}
}

# Text Verification Actions (OCR-based)
TEXT_VERIFICATIONS = {
    'wait_for_text_appear': {'timeout': 10.0, 'case_sensitive': False, 'area': None},
    'wait_for_text_disappear': {'timeout': 10.0, 'case_sensitive': False, 'area': None},
    'extract_text_from_area': {'area': None}
}

# Audio Verification Actions
AUDIO_VERIFICATIONS = {
    'wait_for_audio_appear': {'timeout': 10.0, 'min_level': 10.0},
    'wait_for_silence': {'timeout': 10.0, 'max_level': 5.0},
    'verify_audio_level': {'expected_level': 50.0, 'tolerance': 10.0}
}

# ADB Verification Actions (Android UI elements)
ADB_VERIFICATIONS = {
    'wait_for_element_appear': {'element_selector': '', 'timeout': 10.0},
    'wait_for_element_disappear': {'element_selector': '', 'timeout': 10.0},
    'wait_for_activity': {'activity_name': '', 'timeout': 10.0},
    'verify_app_running': {'package_name': ''}
} 