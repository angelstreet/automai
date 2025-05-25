import json
import os
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path

logger = logging.getLogger(__name__)

class CookieManager:
    """
    Generic cookie manager that loads cookie configurations from JSON files
    and injects them into browser contexts.
    """
    
    def __init__(self, cookies_dir: str = None):
        """
        Initialize the cookie manager.
        
        Args:
            cookies_dir: Directory containing cookie JSON files. 
                        Defaults to 'cookies' subdirectory of current script.
        """
        if cookies_dir is None:
            # Default to cookies directory relative to this script
            script_dir = Path(__file__).parent
            cookies_dir = script_dir / "cookies"
        
        self.cookies_dir = Path(cookies_dir)
        self.loaded_configs = {}
        
        # Load all available cookie configurations
        self._load_all_configs()
    
    def _load_all_configs(self):
        """Load all JSON cookie configuration files from the cookies directory."""
        if not self.cookies_dir.exists():
            logger.warning(f"Cookies directory does not exist: {self.cookies_dir}")
            return
        
        for json_file in self.cookies_dir.glob("*.json"):
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                
                # Use filename (without extension) as the key
                config_name = json_file.stem.lower()
                self.loaded_configs[config_name] = config
                logger.info(f"Loaded cookie config: {config_name} ({config.get('name', 'Unknown')})")
                
            except Exception as e:
                logger.error(f"Error loading cookie config from {json_file}: {str(e)}")
    
    def get_available_configs(self) -> List[str]:
        """Get list of available cookie configuration names."""
        return list(self.loaded_configs.keys())
    
    def get_config_info(self, config_name: str) -> Optional[Dict[str, Any]]:
        """
        Get information about a specific cookie configuration.
        
        Args:
            config_name: Name of the configuration (e.g., 'youtube', 'google')
            
        Returns:
            Dictionary with config info or None if not found
        """
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
        """
        Convert cookie configuration to Playwright-compatible format.
        
        Args:
            config: Cookie configuration dictionary
            
        Returns:
            List of cookies in Playwright format
        """
        playwright_cookies = []
        
        for cookie in config.get('cookies', []):
            # Convert to Playwright format
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
    
    async def inject_cookies(self, browser_context, config_names: List[str]):
        """
        Inject cookies from specified configurations into a browser context.
        
        Args:
            browser_context: Playwright BrowserContext or browser-use BrowserContext
            config_names: List of configuration names to inject (e.g., ['youtube', 'google'])
        """
        if not config_names:
            logger.warning("No cookie configurations specified for injection")
            return
        
        try:
            # Determine the correct context to use
            playwright_context = await self._get_playwright_context(browser_context)
            
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
                    logger.info(f"Injected {len(cookies)} cookies for {config.get('name', config_name)}")
            
            if total_cookies > 0:
                logger.info(f"Successfully injected {total_cookies} cookies from {len(injected_configs)} configurations: {', '.join(injected_configs)}")
            else:
                logger.warning("No cookies were injected")
                
        except Exception as e:
            logger.error(f"Error injecting cookies: {str(e)}")
            raise
    
    async def _get_playwright_context(self, browser_context):
        """
        Extract the Playwright context from either a browser-use BrowserContext 
        or a direct Playwright BrowserContext.
        """
        # Check if this is a browser-use BrowserContext
        if hasattr(browser_context, 'get_session'):
            session = await browser_context.get_session()
            return session.context
        # Check if this is a direct Playwright BrowserContext
        elif hasattr(browser_context, 'add_cookies'):
            return browser_context
        # Fallback: try to access the context attribute
        elif hasattr(browser_context, 'context'):
            return browser_context.context
        else:
            raise ValueError("Unable to determine context type for cookie injection")
    
    async def inject_cookies_for_site(self, browser_context, site_name: str):
        """
        Convenience method to inject cookies for a specific site.
        
        Args:
            browser_context: Browser context
            site_name: Name of the site (e.g., 'youtube', 'google', 'facebook')
        """
        await self.inject_cookies(browser_context, [site_name])
    
    def add_custom_config(self, config_name: str, config: Dict[str, Any]):
        """
        Add a custom cookie configuration at runtime.
        
        Args:
            config_name: Name for the configuration
            config: Cookie configuration dictionary
        """
        self.loaded_configs[config_name.lower()] = config
        logger.info(f"Added custom cookie configuration: {config_name}")


# Convenience functions for backward compatibility
async def inject_youtube_cookies(browser_context):
    """Legacy function for YouTube cookie injection."""
    manager = CookieManager()
    await manager.inject_cookies_for_site(browser_context, 'youtube')

async def inject_google_cookies(browser_context):
    """Inject Google cookies."""
    manager = CookieManager()
    await manager.inject_cookies_for_site(browser_context, 'google')

async def inject_facebook_cookies(browser_context):
    """Inject Facebook cookies."""
    manager = CookieManager()
    await manager.inject_cookies_for_site(browser_context, 'facebook')

async def inject_multiple_site_cookies(browser_context, sites: List[str]):
    """
    Inject cookies for multiple sites.
    
    Args:
        browser_context: Browser context
        sites: List of site names (e.g., ['youtube', 'google'])
    """
    manager = CookieManager()
    await manager.inject_cookies(browser_context, sites)


# Example usage
if __name__ == "__main__":
    import asyncio
    
    async def demo():
        # Create cookie manager
        manager = CookieManager()
        
        # Show available configurations
        print("Available cookie configurations:")
        for config_name in manager.get_available_configs():
            info = manager.get_config_info(config_name)
            print(f"  - {config_name}: {info['name']} ({info['cookie_count']} cookies)")
            print(f"    Description: {info['description']}")
            print(f"    Domains: {', '.join(info['domains'])}")
            print()
    
    asyncio.run(demo()) 