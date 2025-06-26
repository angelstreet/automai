"""
Text Verification Utilities 

Provides shared utilities for text processing and language operations.
Domain-specific utilities only - no URL building or path resolution.
"""

from typing import Dict, Any


class TextUtils:
    """Providing utility functions for text verification operations."""
    
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