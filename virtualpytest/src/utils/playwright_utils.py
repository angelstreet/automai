"""
Playwright Utilities

Chrome process management and async execution utilities for Playwright web automation.
Extracted from PlaywrightWebController to improve maintainability.
"""

import os
import time
import subprocess
import socket
import asyncio
from typing import Dict, Any, Tuple


class ChromeManager:
    """Manages Chrome process lifecycle for remote debugging."""
    
    @staticmethod
    def kill_chrome_instances():
        """Kill any existing Chrome instances (Linux only)."""
        print('[ChromeManager] Killing any existing Chrome instances...')
        os.system('pkill -9 "Google Chrome"')
        os.system('pkill -9 "chrome"')
        os.system('pkill -9 "chromium"')
        time.sleep(2)
    
    @staticmethod
    def is_port_in_use(port: int) -> bool:
        """Check if a port is in use."""
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(1)
            try:
                s.bind(('127.0.0.1', port))
                return False
            except socket.error:
                return True
    
    @staticmethod
    def find_chrome_executable() -> str:
        """Find Chrome executable on Linux system."""
        possible_paths = ['/usr/bin/google-chrome', '/usr/bin/chromium-browser']
        for path in possible_paths:
            if os.path.exists(path):
                return path
        raise ValueError('No Chrome executable found in common Linux paths')
    
    @staticmethod
    def get_chrome_flags(debug_port: int = 9222, user_data_dir: str = "/tmp/chrome_debug_profile") -> list:
        """Get Chrome launch flags for remote debugging."""
        return [
            f'--remote-debugging-port={debug_port}',
            f'--user-data-dir={user_data_dir}',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-features=Translate',
            '--disable-extensions',
            '--window-position=0,0',
            '--window-size=1920,1080',
            '--disable-gpu',
            '--enable-unsafe-swiftshader',
            '--no-sandbox',  # Important for containers
            '--disable-setuid-sandbox'
        ]
    
    @classmethod
    def launch_chrome_with_remote_debugging(cls, debug_port: int = 9222) -> subprocess.Popen:
        """Launch Chrome with remote debugging enabled (Linux only)."""
        # Kill existing Chrome instances
        cls.kill_chrome_instances()
        
        # Kill any process using the debug port
        if cls.is_port_in_use(debug_port):
            print(f'[ChromeManager] Port {debug_port} is in use. Killing processes...')
            os.system(f'lsof -ti:{debug_port} | xargs kill -9')
            time.sleep(1)
        
        # Find Chrome executable
        executable_path = cls.find_chrome_executable()
        print(f'[ChromeManager] Launching Chrome with remote debugging: {executable_path}')
        
        # Prepare Chrome flags and user data directory
        user_data_dir = "/tmp/chrome_debug_profile"
        os.makedirs(user_data_dir, exist_ok=True)
        chrome_flags = cls.get_chrome_flags(debug_port, user_data_dir)
        
        # Launch Chrome with DISPLAY=:1 for VNC visibility
        cmd_line = [executable_path] + chrome_flags
        print(f'[ChromeManager] Chrome command: {" ".join(cmd_line)}')
        
        env = os.environ.copy()
        env["DISPLAY"] = ":1"
        
        process = subprocess.Popen(cmd_line, env=env)
        print(f'[ChromeManager] Chrome launched with PID: {process.pid}')
        
        # Wait for Chrome to be ready
        cls._wait_for_chrome_ready(debug_port)
        
        return process
    
    @staticmethod
    def _wait_for_chrome_ready(debug_port: int, max_wait: int = 30):
        """Wait for Chrome to be ready on the debug port."""
        print(f'[ChromeManager] Waiting up to {max_wait} seconds for Chrome on port {debug_port}...')
        
        start_time = time.time()
        port_open = False
        
        while time.time() - start_time < max_wait:
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(1)
                s.connect(('127.0.0.1', debug_port))
                s.close()
                port_open = True
                elapsed = time.time() - start_time
                print(f'[ChromeManager] Chrome ready! Port {debug_port} open after {elapsed:.2f}s')
                time.sleep(2)  # Ensure Chrome is fully initialized
                break
            except (socket.timeout, socket.error):
                time.sleep(1)
        
        if not port_open:
            print(f'[ChromeManager] WARNING: Timed out waiting for Chrome port {debug_port}')


class AsyncExecutor:
    """Handles async execution in sync contexts for Playwright operations."""
    
    @staticmethod
    def run_async(coro):
        """Run async coroutine in sync context with smart event loop handling."""
        try:
            # Try to get existing event loop
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # If loop is running, create a new thread for this
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(asyncio.run, coro)
                    return future.result()
            else:
                return loop.run_until_complete(coro)
        except RuntimeError:
            # No event loop exists, create one
            return asyncio.run(coro)


class PlaywrightConnection:
    """Manages Playwright connections to Chrome via CDP."""
    
    @staticmethod
    async def connect_to_chrome(cdp_url: str = 'http://localhost:9222') -> Tuple[Any, Any, Any, Any]:
        """Connect to Chrome via CDP and return playwright, browser, context, page."""
        from playwright.async_api import async_playwright
        
        playwright = await async_playwright().start()
        browser = await playwright.chromium.connect_over_cdp(cdp_url)
        
        if len(browser.contexts) == 0:
            context = await browser.new_context()
            page = await context.new_page()
        else:
            context = browser.contexts[0]
            if len(context.pages) == 0:
                page = await context.new_page()
            else:
                page = context.pages[0]
        
        return playwright, browser, context, page
    
    @staticmethod
    async def cleanup_connection(playwright, browser):
        """Clean up Playwright connection."""
        if browser:
            await browser.close()
        if playwright:
            await playwright.stop()


class PlaywrightUtils:
    """Main utility class combining Chrome management and Playwright operations."""
    
    def __init__(self):
        self.chrome_manager = ChromeManager()
        self.async_executor = AsyncExecutor()
        self.connection = PlaywrightConnection()
    
    def launch_chrome(self, debug_port: int = 9222) -> subprocess.Popen:
        """Launch Chrome with remote debugging."""
        return self.chrome_manager.launch_chrome_with_remote_debugging(debug_port)
    
    def kill_chrome(self):
        """Kill Chrome instances."""
        self.chrome_manager.kill_chrome_instances()
    
    def run_async(self, coro):
        """Run async coroutine in sync context."""
        return self.async_executor.run_async(coro)
    
    async def connect_to_chrome(self, cdp_url: str = 'http://localhost:9222'):
        """Connect to Chrome via CDP."""
        return await self.connection.connect_to_chrome(cdp_url)
    
    async def cleanup_connection(self, playwright, browser):
        """Clean up connection."""
        await self.connection.cleanup_connection(playwright, browser)


# Convenience functions for external use
def create_playwright_utils() -> PlaywrightUtils:
    """Create a PlaywrightUtils instance."""
    return PlaywrightUtils()


def launch_chrome_for_debugging(debug_port: int = 9222) -> subprocess.Popen:
    """Quick function to launch Chrome with remote debugging."""
    return ChromeManager.launch_chrome_with_remote_debugging(debug_port)


def run_async_playwright(coro):
    """Quick function to run async Playwright code in sync context."""
    return AsyncExecutor.run_async(coro) 