#!/usr/bin/env python3
"""
Test script to verify browser context creation with existing Playwright browser
"""

import asyncio
import sys
import os
from playwright.async_api import async_playwright

# Add the parent directory to the path to import browser_use
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from browser_use import Browser, BrowserConfig, BrowserContextConfig
from browser_use.browser.context import BrowserContext, BrowserSession
from langchain_openai import ChatOpenAI

async def test_browser_context_creation():
    """Test creating a browser context from existing Playwright browser"""
    
    print("🧪 Testing browser context creation...")
    
    try:
        async with async_playwright() as playwright:
            # Connect to existing Chrome instance on port 9222
            print("📡 Connecting to Chrome on port 9222...")
            playwright_browser = await playwright.chromium.connect_over_cdp('http://localhost:9222')
            print("✅ Connected to Chrome successfully")
            
            # Get the existing context and page
            playwright_context = playwright_browser.contexts[0]
            page = playwright_context.pages[0] if playwright_context.pages else await playwright_context.new_page()
            
            print(f"📄 Current page URL: {page.url}")
            
            # Create browser-use Browser wrapper
            print("🔧 Creating browser-use Browser wrapper...")
            browser_config = BrowserConfig(
                cdp_url='http://localhost:9222',
                headless=False
            )
            browser_use_browser = Browser(config=browser_config)
            
            # Set the playwright browser directly to avoid reconnection
            browser_use_browser._playwright_browser = playwright_browser
            print("✅ Browser wrapper created")
            
            # Create browser-use BrowserContext
            print("🔧 Creating browser-use BrowserContext...")
            context_config = BrowserContextConfig(
                window_width=1080,
                window_height=720,
                force_new_context=False
            )
            
            browser_context = BrowserContext(
                browser=browser_use_browser, 
                config=context_config
            )
            
            # Set the existing session to avoid creating a new one
            browser_context.session = BrowserSession(
                context=playwright_context,
                cached_state=None
            )
            
            # Set the current pages
            browser_context.agent_current_page = page
            browser_context.human_current_page = page
            print("✅ BrowserContext created successfully")
            
            # Test basic functionality
            print("🧪 Testing basic functionality...")
            current_page = await browser_context.get_agent_current_page()
            print(f"📄 Agent current page URL: {current_page.url}")
            
            # Test getting state (this is what the Agent will do)
            print("🧪 Testing state retrieval...")
            state = await browser_context.get_state(cache_clickable_elements_hashes=False)
            print(f"✅ State retrieved successfully - URL: {state.url}, Title: {state.title}")
            print(f"📊 Found {len(state.selector_map)} clickable elements")
            
            print("🎉 All tests passed! Browser context is working correctly.")
            return True
            
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🚀 Starting browser context test...")
    print("⚠️  Make sure Chrome is running with remote debugging on port 9222")
    print("   You can start it with: chrome --remote-debugging-port=9222")
    print()
    
    success = asyncio.run(test_browser_context_creation())
    
    if success:
        print("\n✅ Test completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Test failed!")
        sys.exit(1) 