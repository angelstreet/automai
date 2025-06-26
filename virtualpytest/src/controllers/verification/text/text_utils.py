"""
Text Verification Utilities Mixin

Provides shared utilities for path handling, URL building, and common operations.
"""

import os
from typing import Dict, Any


class TextUtilsMixin:
    """Mixin providing utility functions for text verification operations."""
    
    def _get_captures_path(self, host_info: Dict[str, Any], device_id: str) -> str:
        """Get the captures directory path for a host and device."""
        return os.path.join(
            os.getcwd(),
            "virtualpytest", 
            "captures",
            host_info.get('friendly_name', 'unknown_host'),
            device_id or 'unknown_device'
        )
    
    def _build_cropped_preview_url(self, host_info: Dict[str, Any], filename: str, device_id: str) -> str:
        """Build URL for accessing cropped preview images."""
        host_instance = f"{host_info.get('host', 'localhost')}:{host_info.get('port', 8000)}"
        return f"http://{host_instance}/captures/{device_id}/{filename}"
    
    def _build_image_url(self, local_path: str) -> str:
        """
        Build URL for accessing images from local path.
        
        Args:
            local_path: Local file path to the image
            
        Returns:
            str: URL for accessing the image
        """
        try:
            # Convert absolute path to relative URL path
            if '/var/www/html/stream/' in local_path:
                # Extract the part after /var/www/html/stream/
                url_path = local_path.split('/var/www/html/stream/')[-1]
                
                # Get host instance
                host_instance = self._get_host_instance()
                
                return f"http://{host_instance}/stream/{url_path}"
            else:
                # For other paths, use the filename with captures
                filename = os.path.basename(local_path)
                host_instance = self._get_host_instance()
                return f"http://{host_instance}/captures/{filename}"
                
        except Exception as e:
            print(f"[@text_utils] Error building image URL: {e}")
            return local_path  # Fallback to local path
    
    def _get_host_instance(self) -> str:
        """Get host instance for URL building."""
        # This would be injected from request context in real implementation
        return "localhost:8000"
    
    def _get_language_name(self, language_code: str) -> str:
        """Convert language code to readable name."""
        language_map = {
            'en': 'English',
            'es': 'Spanish', 
            'fr': 'French',
            'de': 'German',
            'it': 'Italian',
            'pt': 'Portuguese',
            'ru': 'Russian',
            'ja': 'Japanese',
            'ko': 'Korean',
            'zh': 'Chinese',
            'ar': 'Arabic',
            'hi': 'Hindi'
        }
        return language_map.get(language_code, language_code.upper())
    
    def _convert_to_tesseract_lang(self, lang_code: str) -> str:
        """
        Convert detected language codes to Tesseract language codes.
        
        Args:
            lang_code: Language code from detection
            
        Returns:
            str: Tesseract-compatible language code
        """
        # Map common language codes to Tesseract codes
        tesseract_map = {
            'en': 'eng',
            'es': 'spa', 
            'fr': 'fra',
            'de': 'deu',
            'it': 'ita',
            'pt': 'por',
            'ru': 'rus',
            'ja': 'jpn',
            'ko': 'kor',
            'zh': 'chi_sim',  # Simplified Chinese
            'zh-cn': 'chi_sim',
            'zh-tw': 'chi_tra',  # Traditional Chinese
            'ar': 'ara',
            'hi': 'hin',
            'nl': 'nld',  # Dutch
            'sv': 'swe',  # Swedish
            'no': 'nor',  # Norwegian
            'da': 'dan',  # Danish
            'fi': 'fin',  # Finnish
            'pl': 'pol',  # Polish
            'cs': 'ces',  # Czech
            'hu': 'hun',  # Hungarian
            'ro': 'ron',  # Romanian
            'bg': 'bul',  # Bulgarian
            'hr': 'hrv',  # Croatian
            'sr': 'srp',  # Serbian
            'sk': 'slk',  # Slovak
            'sl': 'slv',  # Slovenian
            'et': 'est',  # Estonian
            'lv': 'lav',  # Latvian
            'lt': 'lit',  # Lithuanian
            'uk': 'ukr',  # Ukrainian
            'be': 'bel',  # Belarusian
            'mk': 'mkd',  # Macedonian
            'sq': 'sqi',  # Albanian
            'mt': 'mlt',  # Maltese
            'ga': 'gle',  # Irish
            'cy': 'cym',  # Welsh
            'is': 'isl',  # Icelandic
            'fo': 'fao',  # Faroese
            'gl': 'glg',  # Galician
            'eu': 'eus',  # Basque
            'ca': 'cat',  # Catalan
        }
        
        # First try exact match
        if lang_code in tesseract_map:
            return tesseract_map[lang_code]
        
        # Try without country code (e.g., 'en-US' -> 'en')
        base_lang = lang_code.split('-')[0].lower()
        if base_lang in tesseract_map:
            return tesseract_map[base_lang]
        
        # Default to English if no match found
        print(f"[@text_utils] Unknown language code '{lang_code}', defaulting to English")
        return 'eng' 