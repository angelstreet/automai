"""
Cookie Utils for Auto-Accepting Cookies

Automatically injects consent cookies to bypass cookie banners on popular websites.
Integrates with Playwright for seamless cookie management.
"""

import json
import os
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path

logger = logging.getLogger(__name__)


class CookieManager:
    """
    Cookie manager that automatically injects consent cookies to bypass cookie banners.
    Includes built-in configurations for popular sites like YouTube, Google, etc.
    """
    
    def __init__(self, cookies_dir: str = None):
        """
        Initialize the cookie manager with built-in configurations.
        
        Args:
            cookies_dir: Optional directory containing additional cookie JSON files.
        """
        self.cookies_dir = Path(cookies_dir) if cookies_dir else None
        self.loaded_configs = {}
        
        # Load built-in configurations
        self._load_builtin_configs()
        
        # Load additional configurations from directory if provided
        if self.cookies_dir:
            self._load_external_configs()
    
    def _load_builtin_configs(self):
        """Load built-in cookie configurations for popular sites."""
        
        # YouTube configuration - bypasses consent banners
        youtube_config = {
            "name": "YouTube",
            "description": "Auto-accept YouTube consent and bypass cookie banners",
            "domains": [".youtube.com", ".google.com"],
            "cookies": [
                {
                    "name": "CONSENT",
                    "value": "PENDING+987",
                    "domain": ".youtube.com",
                    "path": "/",
                    "secure": False,
                    "httpOnly": False
                },
                {
                    "name": "CONSENT",
                    "value": "PENDING+987",
                    "domain": ".google.com",
                    "path": "/",
                    "secure": False,
                    "httpOnly": False
                },
                {
                    "name": "SOCS",
                    "value": "CAESHAgEEhJnd3NfMjAyMzEyMTMtMF9SQzIaAmVuIAEaBgiA_LyaBg",
                    "domain": ".youtube.com",
                    "path": "/",
                    "secure": False,
                    "httpOnly": False
                },
                {
                    "name": "SOCS",
                    "value": "CAESHAgEEhJnd3NfMjAyMzEyMTMtMF9SQzIaAmVuIAEaBgiA_LyaBg",
                    "domain": ".google.com",
                    "path": "/",
                    "secure": False,
                    "httpOnly": False
                }
            ]
        }
        
        # Google configuration - bypasses consent banners
        google_config = {
            "name": "Google",
            "description": "Auto-accept Google consent and bypass cookie banners",
            "domains": [".google.com", ".google.co.uk", ".google.fr", ".google.de"],
            "cookies": [
                {
                    "name": "CONSENT",
                    "value": "PENDING+987",
                    "domain": ".google.com",
                    "path": "/",
                    "secure": False,
                    "httpOnly": False
                },
                {
                    "name": "CONSENT",
                    "value": "PENDING+987",
                    "domain": ".google.fr",
                    "path": "/",
                    "secure": False,
                    "httpOnly": False
                },
                {
                    "name": "CONSENT",
                    "value": "PENDING+987",
                    "domain": ".google.co.uk",
                    "path": "/",
                    "secure": False,
                    "httpOnly": False
                },
                {
                    "name": "CONSENT",
                    "value": "PENDING+987",
                    "domain": ".google.de",
                    "path": "/",
                    "secure": False,
                    "httpOnly": False
                },
                {
                    "name": "SOCS",
                    "value": "CAESHAgEEhJnd3NfMjAyMzEyMTMtMF9SQzIaAmVuIAEaBgiA_LyaBg",
                    "domain": ".google.com",
                    "path": "/",
                    "secure": False,
                    "httpOnly": False
                }
            ]
        }
        
        # Facebook configuration
        facebook_config = {
            "name": "Facebook",
            "description": "Auto-accept Facebook consent and bypass cookie banners",
            "domains": [".facebook.com", ".meta.com"],
            "cookies": [
                {
                    "name": "dpr",
                    "value": "1",
                    "domain": ".facebook.com",
                    "path": "/",
                    "secure": True,
                    "httpOnly": False
                },
                {
                    "name": "wd",
                    "value": "1920x1080",
                    "domain": ".facebook.com",
                    "path": "/",
                    "secure": True,
                    "httpOnly": False
                }
            ]
        }
        
        # Common EU GDPR bypass configuration
        gdpr_config = {
            "name": "GDPR Bypass",
            "description": "Generic GDPR consent cookies for EU compliance",
            "domains": [".europa.eu"],
            "cookies": [
                {
                    "name": "euconsent-v2",
                    "value": "CPXxRfAPXxRfAAfKABENA-EgAAAAAAAAAAYgAAAAAAAA",
                    "domain": ".europa.eu",
                    "path": "/",
                    "secure": True,
                    "httpOnly": False
                }
            ]
        }
        
        # Store built-in configurations
        self.loaded_configs = {
            'youtube': youtube_config,
            'google': google_config,
            'facebook': facebook_config,
            'gdpr': gdpr_config
        }
        
        logger.info(f"Loaded {len(self.loaded_configs)} built-in cookie configurations")
    
    def _load_external_configs(self):
        """Load additional cookie configurations from external directory."""
        if not self.cookies_dir.exists():
            logger.warning(f"External cookies directory does not exist: {self.cookies_dir}")
            return
        
        for json_file in self.cookies_dir.glob("*.json"):
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                
                config_name = json_file.stem.lower()
                self.loaded_configs[config_name] = config
                logger.info(f"Loaded external cookie config: {config_name}")
                
            except Exception as e:
                logger.error(f"Error loading external cookie config from {json_file}: {str(e)}")
    
    def get_available_configs(self) -> List[str]:
        """Get list of available cookie configuration names."""
        return list(self.loaded_configs.keys())
    
    def get_config_info(self, config_name: str) -> Optional[Dict[str, Any]]:
        """Get information about a specific cookie configuration."""
        config = self.loaded_configs.get(config_name.lower())
        if config:
            return {
                'name': config.get('name'),
                'description': config.get('description'),
                'domains': config.get('domains', []),
                'cookie_count': len(config.get('cookies', []))
            }
        return None
    
    def _prepare_cookies_for_playwright(self, config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Convert cookie configuration to Playwright-compatible format."""
        playwright_cookies = []
        
        for cookie in config.get('cookies', []):
            playwright_cookie = {
                'name': cookie['name'],
                'value': cookie['value'],
                'domain': cookie['domain'],
                'path': cookie.get('path', '/'),
            }
            
            # Add optional fields if present
            if 'secure' in cookie:
                playwright_cookie['secure'] = cookie['secure']
            if 'httpOnly' in cookie:
                playwright_cookie['httpOnly'] = cookie['httpOnly']
            if 'sameSite' in cookie:
                playwright_cookie['sameSite'] = cookie['sameSite']
            
            playwright_cookies.append(playwright_cookie)
        
        return playwright_cookies
    
    async def inject_cookies(self, playwright_context, config_names: List[str]):
        """
        Inject cookies from specified configurations into a Playwright context.
        
        Args:
            playwright_context: Playwright BrowserContext
            config_names: List of configuration names (e.g., ['youtube', 'google'])
        """
        if not config_names:
            logger.warning("No cookie configurations specified for injection")
            return
        
        try:
            total_cookies = 0
            injected_configs = []
            
            for config_name in config_names:
                config_name = config_name.lower()
                
                if config_name not in self.loaded_configs:
                    logger.warning(f"Cookie configuration '{config_name}' not found. Available: {self.get_available_configs()}")
                    continue
                
                config = self.loaded_configs[config_name]
                cookies = self._prepare_cookies_for_playwright(config)
                
                if cookies:
                    await playwright_context.add_cookies(cookies)
                    total_cookies += len(cookies)
                    injected_configs.append(config.get('name', config_name))
                    print(f"[CookieManager] ✅ Injected {len(cookies)} cookies for {config.get('name', config_name)}")
                    logger.info(f"Injected {len(cookies)} cookies for {config.get('name', config_name)}")
            
            if total_cookies > 0:
                print(f"[CookieManager] 🍪 Successfully injected {total_cookies} cookies from {len(injected_configs)} configurations: {', '.join(injected_configs)}")
                logger.info(f"Successfully injected {total_cookies} cookies from {len(injected_configs)} configurations: {', '.join(injected_configs)}")
            else:
                print(f"[CookieManager] ⚠️ No cookies were injected")
                logger.warning("No cookies were injected")
                
        except Exception as e:
            logger.error(f"Error injecting cookies: {str(e)}")
            raise
    
    async def auto_accept_cookies_for_url(self, playwright_context, url: str):
        """
        Automatically detect the website and inject appropriate consent cookies.
        
        Args:
            playwright_context: Playwright BrowserContext
            url: URL being visited
        """
        url_lower = url.lower()
        configs_to_inject = []
        
        # Auto-detect based on URL
        if 'youtube.com' in url_lower:
            configs_to_inject.append('youtube')
            # Also inject Google cookies for YouTube since it's owned by Google
            configs_to_inject.append('google')
        elif any(domain in url_lower for domain in ['google.com', 'google.fr', 'google.co.uk', 'google.de']):
            configs_to_inject.append('google')
        elif 'facebook.com' in url_lower or 'meta.com' in url_lower:
            configs_to_inject.append('facebook')
        
        # Always add general GDPR bypass for EU domains
        if any(eu_tld in url_lower for eu_tld in ['.eu', '.fr', '.de', '.it', '.es']):
            configs_to_inject.append('gdpr')
        
        if configs_to_inject:
            print(f"[CookieManager] 🎯 Auto-detected cookie configs for {url}: {configs_to_inject}")
            logger.info(f"Auto-detected cookie configs for {url}: {configs_to_inject}")
            await self.inject_cookies(playwright_context, configs_to_inject)
        else:
            print(f"[CookieManager] ℹ️ No automatic cookie configurations found for {url}")
            logger.debug(f"No automatic cookie configurations found for {url}")
    
    async def inject_cookies_for_site(self, playwright_context, site_name: str):
        """Convenience method to inject cookies for a specific site."""
        await self.inject_cookies(playwright_context, [site_name])


# Convenience functions
async def auto_accept_cookies(playwright_context, url: str):
    """Quick function to auto-accept cookies for a URL."""
    manager = CookieManager()
    await manager.auto_accept_cookies_for_url(playwright_context, url)


async def inject_youtube_cookies(playwright_context):
    """Inject YouTube consent cookies."""
    manager = CookieManager()
    await manager.inject_cookies_for_site(playwright_context, 'youtube')


async def inject_google_cookies(playwright_context):
    """Inject Google consent cookies."""
    manager = CookieManager()
    await manager.inject_cookies_for_site(playwright_context, 'google')


async def inject_multiple_site_cookies(playwright_context, sites: List[str]):
    """Inject cookies for multiple sites."""
    manager = CookieManager()
    await manager.inject_cookies(playwright_context, sites) 