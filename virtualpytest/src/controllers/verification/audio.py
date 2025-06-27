"""
Audio Verification Controller Implementation

This controller provides audio analysis and verification functionality.
It can work with various audio sources including HDMI stream controllers,
audio files, or direct audio capture devices.
"""

import subprocess
import threading
import time
import os
import wave
import numpy as np
from typing import Dict, Any, Optional, Union, List
from pathlib import Path
from ..base_controller import VerificationControllerInterface


class AudioVerificationController(VerificationControllerInterface):
    """Audio verification controller that analyzes audio from various sources."""
    
    def __init__(self, av_controller, **kwargs):
        """
        Initialize the Audio Verification controller.
        
        Args:
            av_controller: AV controller for capturing audio (dependency injection)
        """
        super().__init__("Audio Verification", "audio")
        
        # Dependency injection
        self.av_controller = av_controller
        
        # Validate required dependency
        if not self.av_controller:
            raise ValueError("av_controller is required for AudioVerificationController")
            
        # Audio analysis settings
        self.analysis_duration = 2.0  # Default analysis duration
        self.silence_threshold = 5.0  # Default silence threshold percentage
        
        # Temporary files for analysis
        self.temp_audio_path = Path("/tmp/audio_verification")
        self.temp_audio_path.mkdir(exist_ok=True)
        
        print(f"[@controller:AudioVerification] Initialized with AV controller")

    def connect(self) -> bool:
        """Connect to the audio verification system."""
        try:
            print(f"AudioVerify[{self.device_name}]: Connecting to audio verification system")
            
            # Check if AV controller is connected
            if not hasattr(self.av_controller, 'is_connected') or not self.av_controller.is_connected:
                print(f"AudioVerify[{self.device_name}]: ERROR - AV controller not connected")
                print(f"AudioVerify[{self.device_name}]: Please connect {self.av_controller.device_name} first")
                return False
            else:
                print(f"AudioVerify[{self.device_name}]: Using AV controller: {self.av_controller.device_name}")
            
            # Require AV controller to have video device for audio capture
            if not hasattr(self.av_controller, 'video_device'):
                print(f"AudioVerify[{self.device_name}]: ERROR - AV controller has no video_device")
                print(f"AudioVerify[{self.device_name}]: Audio verification requires AV controller with video_device")
                return False
                
            print(f"AudioVerify[{self.device_name}]: Will capture audio from video device: {self.av_controller.video_device}")
            
            # Test FFmpeg availability for audio processing
            try:
                result = subprocess.run(['/usr/bin/ffmpeg', '-version'], 
                                      capture_output=True, text=True, timeout=5)
                if result.returncode != 0:
                    print(f"AudioVerify[{self.device_name}]: ERROR - FFmpeg not available")
                    return False
            except (subprocess.TimeoutExpired, FileNotFoundError):
                print(f"AudioVerify[{self.device_name}]: ERROR - FFmpeg not found")
                return False
            
            self.is_connected = True
            self.verification_session_id = f"audio_verify_{int(time.time())}"
            print(f"AudioVerify[{self.device_name}]: Connected - Session: {self.verification_session_id}")
            return True
            
        except Exception as e:
            print(f"AudioVerify[{self.device_name}]: Connection failed: {e}")
            return False

    def disconnect(self) -> bool:
        """Disconnect from the audio verification system."""
        print(f"AudioVerify[{self.device_name}]: Disconnecting")
        self.is_connected = False
        self.verification_session_id = None
        
        # Clean up temporary files
        try:
            for temp_file in self.temp_audio_path.glob("*.wav"):
                temp_file.unlink()
        except Exception as e:
            print(f"AudioVerify[{self.device_name}]: Warning - cleanup failed: {e}")
            
        print(f"AudioVerify[{self.device_name}]: Disconnected")
        return True

    def capture_audio_sample(self, duration: float = None, source: str = "av_controller") -> str:
        """
        Capture an audio sample for analysis using the AV controller.
        
        Args:
            duration: Duration in seconds (default: self.analysis_duration)
            source: Audio source ("av_controller" or file path)
            
        Returns:
            Path to the captured audio file
        """
        if not self.is_connected:
            print(f"AudioVerify[{self.device_name}]: ERROR - Not connected")
            return None
            
        duration = duration or self.analysis_duration
        timestamp = int(time.time())
        audio_file = self.temp_audio_path / f"audio_sample_{timestamp}.wav"
        
        try:
            if source == "av_controller":
                # Capture from AV controller (e.g., HDMI stream)
                print(f"AudioVerify[{self.device_name}]: Capturing audio from {self.av_controller.device_name}")
                # Use FFmpeg to capture audio from video device
                cmd = [
                    '/usr/bin/ffmpeg',
                    '-f', 'v4l2',
                    '-i', self.av_controller.video_device,
                    '-vn',  # No video
                    '-acodec', 'pcm_s16le',
                    '-ar', '44100',
                    '-ac', '2',
                    '-t', str(duration),
                    '-y',
                    str(audio_file)
                ]
                
            elif os.path.exists(source):
                # Use existing audio file
                print(f"AudioVerify[{self.device_name}]: Using existing audio file: {source}")
                return source
                
            else:
                print(f"AudioVerify[{self.device_name}]: ERROR - Unknown audio source: {source}")
                return None
            
            print(f"AudioVerify[{self.device_name}]: Capturing audio sample ({duration}s)")
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=duration + 10)
            
            if result.returncode == 0 and audio_file.exists():
                print(f"AudioVerify[{self.device_name}]: Audio sample captured: {audio_file}")
                return str(audio_file)
            else:
                print(f"AudioVerify[{self.device_name}]: Audio capture failed: {result.stderr}")
                return None
                
        except Exception as e:
            print(f"AudioVerify[{self.device_name}]: Audio capture error: {e}")
            return None

    def analyze_audio_level(self, audio_file: str = None, duration: float = None) -> float:
        """
        Analyze audio level from a file or live capture.
        
        Args:
            audio_file: Path to audio file (if None, captures new sample)
            duration: Duration for live capture
            
        Returns:
            Audio level as percentage (0-100)
        """
        if not self.is_connected:
            print(f"AudioVerify[{self.device_name}]: ERROR - Not connected")
            return 0.0
            
        # Capture audio if no file provided
        if not audio_file:
            audio_file = self.capture_audio_sample(duration)
            if not audio_file:
                return 0.0
        
        try:
            print(f"AudioVerify[{self.device_name}]: Analyzing audio level from: {audio_file}")
            
            # Use FFmpeg to analyze audio level
            cmd = [
                '/usr/bin/ffmpeg',
                '-i', audio_file,
                '-af', 'volumedetect',
                '-vn',
                '-sn',
                '-dn',
                '-f', 'null',
                '/dev/null'
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            # Parse FFmpeg output for volume information
            max_volume = -100.0  # Default very low volume
            mean_volume = -100.0
            
            for line in result.stderr.split('\n'):
                if 'max_volume:' in line:
                    try:
                        max_volume = float(line.split('max_volume:')[1].split('dB')[0].strip())
                    except:
                        pass
                elif 'mean_volume:' in line:
                    try:
                        mean_volume = float(line.split('mean_volume:')[1].split('dB')[0].strip())
                    except:
                        pass
            
            # Convert dB to percentage (rough approximation)
            # -60dB = 0%, 0dB = 100%
            level_percentage = max(0, min(100, (mean_volume + 60) * 100 / 60))
            
            print(f"AudioVerify[{self.device_name}]: Audio level: {level_percentage:.1f}% (mean: {mean_volume:.1f}dB, max: {max_volume:.1f}dB)")
            return level_percentage
            
        except Exception as e:
            print(f"AudioVerify[{self.device_name}]: Audio level analysis error: {e}")
            return 0.0

    def detect_silence(self, threshold: float = None, duration: float = None, audio_file: str = None) -> bool:
        """
        Detect if audio is silent.
        
        Args:
            threshold: Silence threshold as percentage (default: self.silence_threshold)
            duration: Duration to analyze (default: self.analysis_duration)
            audio_file: Path to audio file (if None, captures new sample)
            
        Returns:
            True if audio is silent, False otherwise
        """
        if not self.is_connected:
            print(f"AudioVerify[{self.device_name}]: ERROR - Not connected")
            return False
            
        threshold = threshold or self.silence_threshold
        duration = duration or self.analysis_duration
        
        print(f"AudioVerify[{self.device_name}]: Detecting silence (threshold: {threshold}%, duration: {duration}s)")
        
        audio_level = self.analyze_audio_level(audio_file, duration)
        is_silent = audio_level < threshold
        
        result_text = "detected" if is_silent else "not detected"
        print(f"AudioVerify[{self.device_name}]: Silence {result_text} (level: {audio_level:.1f}%)")
        
        self._log_verification("silence_detection", f"threshold_{threshold}", is_silent, {
            "threshold": threshold,
            "duration": duration,
            "audio_level": audio_level
        })
        
        return is_silent

    def verify_audio_playing(self, min_level: float = 10.0, duration: float = 2.0) -> bool:
        """
        Verify that audio is playing above a minimum level.
        
        Args:
            min_level: Minimum audio level to consider as "playing" (percentage)
            duration: Duration to check audio in seconds
        """
        if not self.is_connected:
            print(f"AudioVerify[{self.device_name}]: ERROR - Not connected")
            return False
            
        print(f"AudioVerify[{self.device_name}]: Verifying audio playback (min level: {min_level}%, duration: {duration}s)")
        
        audio_level = self.analyze_audio_level(duration=duration)
        audio_playing = audio_level >= min_level
        
        if audio_playing:
            print(f"AudioVerify[{self.device_name}]: Audio playing detected at {audio_level:.1f}% level")
        else:
            print(f"AudioVerify[{self.device_name}]: No audio detected above {min_level}% threshold (current: {audio_level:.1f}%)")
            
        self._log_verification("audio_playing", f"min_level_{min_level}", audio_playing, {
            "min_level": min_level,
            "duration": duration,
            "detected_level": audio_level
        })
        
        return audio_playing

    def analyze_audio_frequency(self, audio_file: str = None, duration: float = None) -> Dict[str, Any]:
        """
        Analyze audio frequency content.
        
        Args:
            audio_file: Path to audio file (if None, captures new sample)
            duration: Duration for live capture
            
        Returns:
            Dictionary with frequency analysis results
        """
        if not self.is_connected:
            print(f"AudioVerify[{self.device_name}]: ERROR - Not connected")
            return {}
            
        # Capture audio if no file provided
        if not audio_file:
            audio_file = self.capture_audio_sample(duration)
            if not audio_file:
                return {}
        
        try:
            print(f"AudioVerify[{self.device_name}]: Analyzing audio frequency content")
            
            # Use FFmpeg to extract frequency information
            cmd = [
                '/usr/bin/ffmpeg',
                '-i', audio_file,
                '-af', 'showfreqs=mode=line:fscale=log',
                '-f', 'null',
                '/dev/null'
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            # Basic frequency analysis (simplified)
            analysis_result = {
                "has_low_freq": "low frequency" in result.stderr.lower(),
                "has_mid_freq": "mid frequency" in result.stderr.lower(),
                "has_high_freq": "high frequency" in result.stderr.lower(),
                "analysis_file": audio_file,
                "timestamp": time.time()
            }
            
            print(f"AudioVerify[{self.device_name}]: Frequency analysis completed")
            return analysis_result
            
        except Exception as e:
            print(f"AudioVerify[{self.device_name}]: Frequency analysis error: {e}")
            return {"error": str(e)}

    def verify_audio_contains_frequency(self, target_freq: float, tolerance: float = 50.0, 
                                      duration: float = None) -> bool:
        """
        Verify that audio contains a specific frequency.
        
        Args:
            target_freq: Target frequency in Hz
            tolerance: Frequency tolerance in Hz
            duration: Duration to analyze
            
        Returns:
            True if frequency is detected, False otherwise
        """
        if not self.is_connected:
            print(f"AudioVerify[{self.device_name}]: ERROR - Not connected")
            return False
            
        print(f"AudioVerify[{self.device_name}]: Checking for frequency {target_freq}Hz (±{tolerance}Hz)")
        
        # Simplified frequency detection (in a real implementation, this would use FFT analysis)
        audio_file = self.capture_audio_sample(duration)
        if not audio_file:
            return False
            
        # For now, return a basic analysis result
        # In a real implementation, this would perform FFT analysis
        freq_analysis = self.analyze_audio_frequency(audio_file)
        
        # Simplified logic based on frequency ranges
        if target_freq < 250:  # Low frequency
            freq_detected = freq_analysis.get("has_low_freq", False)
        elif target_freq < 4000:  # Mid frequency
            freq_detected = freq_analysis.get("has_mid_freq", False)
        else:  # High frequency
            freq_detected = freq_analysis.get("has_high_freq", False)
        
        result_text = "detected" if freq_detected else "not detected"
        print(f"AudioVerify[{self.device_name}]: Frequency {target_freq}Hz {result_text}")
        
        self._log_verification("frequency_detection", f"freq_{target_freq}", freq_detected, {
            "target_frequency": target_freq,
            "tolerance": tolerance,
            "duration": duration or self.analysis_duration
        })
        
        return freq_detected

    # Implementation of required abstract methods from VerificationControllerInterface
    
    def verify_image_appears(self, image_name: str, timeout: float = 10.0, confidence: float = 0.8) -> bool:
        """Not applicable for audio verification."""
        print(f"AudioVerify[{self.device_name}]: Image verification not supported by audio controller")
        return False
        
    def verify_text_appears(self, text: str, timeout: float = 10.0, case_sensitive: bool = False) -> bool:
        """Not applicable for audio verification."""
        print(f"AudioVerify[{self.device_name}]: Text verification not supported by audio controller")
        return False
        
    def verify_element_exists(self, element_id: str, element_type: str = "any") -> bool:
        """Not applicable for audio verification."""
        print(f"AudioVerify[{self.device_name}]: Element verification not supported by audio controller")
        return False
        
    def verify_video_playing(self, motion_threshold: float = 5.0, duration: float = 3.0) -> bool:
        """Not applicable for audio verification."""
        print(f"AudioVerify[{self.device_name}]: Video verification not supported by audio controller")
        return False
        
    def verify_color_present(self, color: str, tolerance: float = 10.0) -> bool:
        """Not applicable for audio verification."""
        print(f"AudioVerify[{self.device_name}]: Color verification not supported by audio controller")
        return False
        
    def verify_screen_state(self, expected_state: str, timeout: float = 5.0) -> bool:
        """Not applicable for audio verification."""
        print(f"AudioVerify[{self.device_name}]: Screen state verification not supported by audio controller")
        return False
        
    def verify_performance_metric(self, metric_name: str, expected_value: float, tolerance: float = 10.0) -> bool:
        """Verify audio-related performance metrics."""
        if metric_name.lower() in ['audio_level', 'volume', 'loudness']:
            current_level = self.analyze_audio_level()
            tolerance_range = expected_value * (tolerance / 100)
            within_tolerance = abs(current_level - expected_value) <= tolerance_range
            
            print(f"AudioVerify[{self.device_name}]: {metric_name} = {current_level:.2f}% (expected: {expected_value}% ±{tolerance}%)")
            
            self._log_verification("performance_metric", metric_name, within_tolerance, {
                "expected": expected_value,
                "measured": current_level,
                "tolerance": tolerance
            })
            
            return within_tolerance
        else:
            print(f"AudioVerify[{self.device_name}]: Unknown audio metric: {metric_name}")
            return False
        
    def wait_and_verify(self, verification_type: str, target: str, timeout: float = 10.0, **kwargs) -> bool:
        """Generic wait and verify method for audio verification."""
        if verification_type == "audio_playing":
            min_level = kwargs.get("min_level", 10.0)
            return self.verify_audio_playing(min_level, timeout)
        elif verification_type == "silence":
            threshold = kwargs.get("threshold", self.silence_threshold)
            return self.detect_silence(threshold, timeout)
        elif verification_type == "frequency":
            target_freq = float(target)
            tolerance = kwargs.get("tolerance", 50.0)
            return self.verify_audio_contains_frequency(target_freq, tolerance, timeout)
        else:
            print(f"AudioVerify[{self.device_name}]: Unknown audio verification type: {verification_type}")
            return False
            
    def get_status(self) -> Dict[str, Any]:
        """Get controller status information."""
        return {
            'controller_type': self.controller_type,
            'device_name': self.device_name,
            'connected': self.is_connected,
            'session_id': self.verification_session_id,
            'verification_count': len(self.verification_results),
            'acquisition_source': self.av_controller.device_name if self.av_controller else None,
            'sample_rate': self.sample_rate,
            'channels': self.channels,
            'capabilities': [
                'audio_level_detection', 'silence_detection', 'frequency_analysis',
                'audio_playback_verification', 'performance_metrics'
            ]
        }
    
    def get_available_verifications(self) -> List[Dict[str, Any]]:
        """Get available verifications for audio controller."""
        return [
            {
                'command': 'DetectSilence',
                'params': {
                    'threshold': 10.0,      # Default threshold percentage
                    'duration': 2.0,        # Default duration in seconds
                    'audio_file': ''        # Optional audio file path
                },
                'verification_type': 'audio'
            },
            {
                'command': 'WaitForAudioToAppear',
                'params': {
                    'min_level': 10.0,      # Default minimum level
                    'duration': 2.0         # Default duration
                },
                'verification_type': 'audio'
            },
            {
                'command': 'VerifyAudioContainsFrequency',
                'params': {
                    'target_freq': 0.0,     # Empty value for user input
                    'tolerance': 50.0,      # Default tolerance
                    'duration': 2.0         # Default duration
                },
                'verification_type': 'audio'
            }
        ]

    def execute_verification(self, verification_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Unified verification execution interface for centralized controller.
        
        Args:
            verification_config: {
                'verification_type': 'audio',
                'command': 'verify_audio_playing',
                'params': {
                    'min_level': 10.0,
                    'duration': 2.0
                }
            }
            
        Returns:
            {
                'success': bool,
                'message': str,
                'confidence': float,
                'details': dict
            }
        """
        try:
            # Extract parameters
            params = verification_config.get('params', {})
            command = verification_config.get('command', 'WaitForAudioToAppear')
            
            print(f"[@controller:AudioVerification] Executing {command}")
            print(f"[@controller:AudioVerification] Parameters: {params}")
            
            # Execute verification based on command
            if command == 'DetectSilence':
                threshold = params.get('threshold', self.silence_threshold)
                duration = params.get('duration', self.analysis_duration)
                audio_file = params.get('audio_file')
                
                success = self.detect_silence(threshold, duration, audio_file)
                message = f"Silence {'detected' if success else 'not detected'}"
                details = {
                    'threshold': threshold,
                    'duration': duration,
                    'audio_file': audio_file
                }
                
            elif command == 'WaitForAudioToAppear':
                min_level = params.get('min_level', 10.0)
                duration = params.get('duration', 2.0)
                
                success = self.verify_audio_playing(min_level, duration)
                message = f"Audio {'playing' if success else 'not playing'} above {min_level}% level"
                details = {
                    'min_level': min_level,
                    'duration': duration
                }
                
            elif command == 'VerifyAudioContainsFrequency':
                target_freq = params.get('target_freq')
                if not target_freq:
                    return {
                        'success': False,
                        'message': 'No target frequency specified for audio frequency verification',
                        'confidence': 0.0,
                        'details': {'error': 'Missing target_freq parameter'}
                    }
                
                tolerance = params.get('tolerance', 50.0)
                duration = params.get('duration', self.analysis_duration)
                
                success = self.verify_audio_contains_frequency(target_freq, tolerance, duration)
                message = f"Frequency {target_freq}Hz {'detected' if success else 'not detected'}"
                details = {
                    'target_frequency': target_freq,
                    'tolerance': tolerance,
                    'duration': duration
                }
                
            else:
                return {
                    'success': False,
                    'message': f'Unknown audio verification command: {command}',
                    'confidence': 0.0,
                    'details': {'error': f'Unsupported command: {command}'}
                }
            
            # Return unified format
            return {
                'success': success,
                'message': message,
                'confidence': 1.0 if success else 0.0,
                'details': details
            }
            
        except Exception as e:
            print(f"[@controller:AudioVerification] Execution error: {e}")
            return {
                'success': False,
                'message': f'Audio verification execution error: {str(e)}',
                'confidence': 0.0,
                'details': {'error': str(e)}
            }
