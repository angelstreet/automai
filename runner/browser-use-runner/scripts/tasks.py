import os
import sys
import logging
import asyncio
import argparse
import time
import subprocess
import platform
import socket
from dotenv import load_dotenv
from playwright.async_api import async_playwright

# FastAPI server imports
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from utils import kill_chrome_instances, clean_user_data_dir

from langchain_openai import ChatOpenAI
from browser_use import BrowserConfig, Browser, Agent, BrowserContextConfig
from browser_use.browser.context import BrowserContext
from cookieManager import CookieManager

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.dirname(os.getcwd()))

load_dotenv()

# Force UTF didn o8 encoding for console output on Windows
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        # For older Python versions that don't support reconfigure
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.detach())

# Set up logging with UTF-8 encoding for Windows compatibility
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Ensure UTF-8 encoding for logging output on Windows
if sys.platform == 'win32':
    stream_handler = logging.StreamHandler(stream=sys.stdout)
    stream_handler.setLevel(logging.DEBUG)
    formatter = logging.Formatter('%(levelname)-8s [%(name)s] %(message)s')
    stream_handler.setFormatter(formatter)
    logger.handlers = [stream_handler]

# Set up argument parser
parser = argparse.ArgumentParser(description='Run a browser automation task or start server')
parser.add_argument('--trace_folder', type=str, default='traces', help='The folder to save the trace')
parser.add_argument('--task', type=str, default='', help='The task for the agent to perform')
parser.add_argument('--headless', action='store_true', help='Run browser in headless mode')
parser.add_argument('--debug', action='store_true', help='Enable debug mode')
parser.add_argument('--executable_path', type=str, help='Path to browser executable')
args, _ = parser.parse_known_args()

llm = ChatOpenAI(model='gpt-4o', temperature=0.0)

# Generic function to inject cookies for multiple sites
async def inject_cookies_for_sites(context, sites):
    """Inject cookies for multiple sites using CookieManager"""
    try:
        if not sites:
            print("No cookie sites specified")
            return
            
        cookie_manager = CookieManager()
        await cookie_manager.inject_cookies(context, sites)
        print(f"Injected cookies for sites: {', '.join(sites)}")
    except Exception as e:
        print(f"Error injecting cookies for sites {sites}: {str(e)}")

# Pydantic models for request/response
class TaskRequest(BaseModel):
    task: str

class StatusResponse(BaseModel):
    initialized: bool
    executing: bool
    current_task: str | None
    start_time: str | None
    logs: str

class ExecuteResponse(BaseModel):
    success: bool
    result: str
    status: str
    logs: str

class InitializeResponse(BaseModel):
    success: bool
    message: str
    logs: str

# Global variables for server mode
app = None
server_state = {
    'browser': None,
    'agent': None,
    'context': None,
    'is_initialized': False,
    'is_executing': False,
    'log_buffer': [],
    'start_time': None,
    'current_task': None,
}

def update_log(message: str):
    """Update the log with new content while preserving history"""
    if message and message.strip():
        timestamp = datetime.now().strftime('%H:%M:%S')
        formatted_message = f"[{timestamp}] {message}"
        server_state['log_buffer'].append(formatted_message)
        logger.info(formatted_message)
    return "\n".join(server_state['log_buffer'])


async def execute_task_server(task: str):
    """Execute a task in server mode - runs directly and waits for completion"""
    if not task or task.strip() == "":
        return False, "Please enter a task before executing", ""

    if not server_state['is_initialized']:
        return False, "Browser not initialized. Please initialize first.", ""

    if server_state['is_executing']:
        return False, "Another task is currently executing. Please wait.", ""

    try:
        server_state['is_executing'] = True
        server_state['current_task'] = task
        update_log(f"Executing task: {task}")
        
        # Create agent for this task
        update_log("Creating agent...")
        agent = Agent(
            task=task,
            llm=llm,
            browser_context=server_state['browser_context'],
        )
        
        update_log("Starting agent execution...")
        start_time = time.time()
        await agent.run()
        execution_time = time.time() - start_time
        
        update_log("Task completed successfully")
        update_log(f"Execution time: {execution_time:.2f} seconds")
        
        task_output = f"Task: {task}\n\n{'='*50}\n\n"
        task_output += "Actions performed:\n"
        task_output += f"- Task executed successfully\n"
        task_output += f"- Execution time: {execution_time:.2f} seconds\n"
        
        return True, task_output, "SUCCESS"
        
    except Exception as e:
        error_msg = f"Error executing task: {str(e)}"
        update_log(error_msg)
        task_output = f"Task: {task}\n\n{'='*50}\n\nError:\n{error_msg}"
        return False, task_output, "FAILURE"
    finally:
        server_state['is_executing'] = False
        server_state['current_task'] = None

async def cleanup_browser_server():
    """Cleanup browser resources in server mode"""
    try:
        update_log("Starting cleanup process...")
        
        # Close browser context first
        if server_state.get('browser_context'):
            try:
                await server_state['browser_context'].close()
            except Exception as e:
                update_log(f"Error closing browser context: {str(e)}")
        
        # Close browser-use browser
        if server_state.get('browser'):
            try:
                await server_state['browser'].close()
            except Exception as e:
                update_log(f"Error closing browser: {str(e)}")
        
        # Close playwright instance
        if server_state.get('playwright'):
            try:
                await server_state['playwright'].stop()
            except Exception as e:
                update_log(f"Error stopping playwright: {str(e)}")
        
        # Kill chrome process if it exists
        if server_state.get('chrome_process'):
            try:
                server_state['chrome_process'].terminate()
                server_state['chrome_process'].wait(timeout=5)
            except Exception as e:
                update_log(f"Error terminating chrome process: {str(e)}")
        
        # Clear server state
        server_state['browser'] = None
        server_state['context'] = None
        server_state['browser_context'] = None
        server_state['playwright'] = None
        server_state['chrome_process'] = None
        server_state['is_initialized'] = False
        
        update_log("Browser closed successfully")
        return True, "Browser closed successfully"
        
    except Exception as e:
        error_msg = f"Error during cleanup: {str(e)}"
        update_log(error_msg)
        return False, error_msg

async def initialize_browser_server():
    """Initialize browser for server mode"""
    try:
        if server_state['is_initialized']:
            update_log("Browser already initialized during startup")
            return True, "Browser already initialized and ready"
        
        update_log("Browser not initialized during startup, initializing now...")
        
        # Import playwright and create instance (don't use async context manager)
        from playwright.async_api import async_playwright
        
        # Create playwright instance that stays alive
        playwright = await async_playwright().start()
        server_state['playwright'] = playwright  # Keep reference to prevent cleanup
        
        # Initialize browser with remote debugging
        page, playwright_context, playwright_browser, chrome_process = await init_browser_async(
            playwright, 
            headless=args.headless, 
            debug=args.debug, 
            video_dir='traces', 
            screenshots=True, 
            video=True, 
            source=True, 
            executable_path=args.executable_path
        )
        
        update_log("Browser initialized successfully")
        
        # Create browser-use Browser wrapper with CDP URL
        browser_config = BrowserConfig(
            cdp_url='http://localhost:9222',
            headless=args.headless
        )
        browser_use_browser = Browser(config=browser_config)
        
        # Set the playwright browser directly to avoid reconnection
        browser_use_browser._playwright_browser = playwright_browser
        
        # Create browser-use BrowserContext with proper config
        context_config = BrowserContextConfig(
            window_width=1080,
            window_height=720,
            save_recording_path=None,
            trace_path=None,
            cookies_file=None,
            disable_security=False,
            force_new_context=False  # Use existing context
        )
        
        # Create BrowserContext that wraps the existing browser
        browser_context = BrowserContext(
            browser=browser_use_browser, 
            config=context_config
        )
        
        # Set the existing session to avoid creating a new one
        from browser_use.browser.context import BrowserSession
        browser_context.session = BrowserSession(
            context=playwright_context,
            cached_state=None
        )
        
        # Set the current pages
        browser_context.agent_current_page = page
        browser_context.human_current_page = page
        
        # Store in server state
        server_state['is_initialized'] = True
        server_state['browser'] = browser_use_browser
        server_state['context'] = playwright_context
        server_state['browser_context'] = browser_context
        server_state['chrome_process'] = chrome_process
        
        update_log("Browser context created successfully")
        return True, "Browser initialized successfully"
        
    except Exception as e:
        error_msg = f"Error initializing browser: {str(e)}"
        update_log(error_msg)
        return False, error_msg

def create_fastapi_server():
    """Create and configure FastAPI server"""
    global app
    app = FastAPI(title="Browser Automation Server", version="1.0.0")
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    @app.get("/status", response_model=StatusResponse)
    async def get_status():
        """Get current browser automation status"""
        return StatusResponse(
            initialized=server_state['is_initialized'],
            executing=server_state['is_executing'],
            current_task=server_state['current_task'],
            start_time=server_state['start_time'],
            logs="\n".join(server_state['log_buffer'])
        )

    @app.post("/initialize", response_model=InitializeResponse)
    async def initialize():
        """Initialize browser automation"""
        try:
            success, message = await initialize_browser_server()
            return InitializeResponse(
                success=success,
                message=message,
                logs="\n".join(server_state['log_buffer'])
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

    @app.post("/execute", response_model=ExecuteResponse)
    async def execute_task(task_request: TaskRequest):
        """Execute a browser automation task"""
        try:
            task = task_request.task
            
            # Execute the task directly
            success, result, status = await execute_task_server(task)
            
            return ExecuteResponse(
                success=success,
                result=result,
                status=status,
                logs="\n".join(server_state['log_buffer'])
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

    @app.post("/cleanup")
    async def cleanup():
        """Cleanup browser automation"""
        try:
            success, message = await cleanup_browser_server()
            return {
                "success": success,
                "message": message,
                "logs": "\n".join(server_state['log_buffer'])
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

    @app.get("/logs")
    async def get_logs():
        """Get current logs"""
        return {"logs": "\n".join(server_state['log_buffer'])}
    
    return app

def start_server():
    """Start the FastAPI server with uvicorn"""
    import os
    import uvicorn
    pid = os.getpid()
    
    print("🚀 Starting Browser Automation Server...")
    print(f"📍 Server will be available at: http://localhost:5001")
    print(f"🆔 Process ID: {pid}")
    print("🔄 Press Ctrl+C to stop the server")
    print("-" * 50)
    
    app = create_fastapi_server()
    
    # Add startup event to initialize browser
    @app.on_event("startup")
    async def startup_event():
        """Initialize browser on server startup"""
        try:
            print("Initializing browser during server startup...")
            success = await initialize_browser_on_startup()
            if success:
                print("✅ Browser initialized successfully - server ready!")
            else:
                print("❌ Failed to initialize browser during startup")
        except Exception as e:
            print(f"❌ Error during startup: {str(e)}")
    
    try:
        print(f"✅ FastAPI server starting with PID: {pid}")
        uvicorn.run(app, host="0.0.0.0", port=5001, log_level="info")
    except KeyboardInterrupt:
        print("\n🛑 Stopping server...")
        print("✅ Server stopped successfully")
    except Exception as e:
        print(f"❌ Error starting server: {str(e)}")
        raise

async def initialize_browser_on_startup():
    """Initialize browser during server startup"""
    try:
        trace_folder = args.trace_folder.replace("_", " ")
        task = args.task.replace("_", " ")
        
        # Create trace path
        trace_path = os.path.join(os.getcwd(), trace_folder)
        os.makedirs(trace_path, exist_ok=True)
        
        # Import playwright and create instance (don't use async context manager)
        from playwright.async_api import async_playwright
        
        # Create playwright instance that stays alive
        playwright = await async_playwright().start()
        server_state['playwright'] = playwright  # Keep reference to prevent cleanup
        
        # Initialize browser with remote debugging
        page, playwright_context, playwright_browser, chrome_process = await init_browser_async(
            playwright, 
            headless=args.headless, 
            debug=args.debug, 
            video_dir=trace_folder, 
            screenshots=True, 
            video=True, 
            source=True, 
            executable_path=args.executable_path
        )
        
        # Take a screenshot
        timestamp = time.strftime("%Y%m%d-%H%M%S")
        screenshot_path = os.path.join(trace_path, f"startup_{timestamp}.png")
        await page.screenshot(path=screenshot_path, full_page=True, timeout=20000)
        print(f"Screenshot saved to: {screenshot_path}")
        
        print("Browser initialized successfully")
        
        # Create browser-use Browser wrapper with CDP URL
        browser_config = BrowserConfig(
            cdp_url='http://localhost:9222',
            headless=args.headless
        )
        browser_use_browser = Browser(config=browser_config)
        
        # Set the playwright browser directly to avoid reconnection
        browser_use_browser._playwright_browser = playwright_browser
        
        # Create browser-use BrowserContext with proper config
        context_config = BrowserContextConfig(
            window_width=1080,
            window_height=720,
            save_recording_path=None,
            trace_path=None,
            cookies_file=None,
            disable_security=False,
            force_new_context=False  # Use existing context
        )
        
        # Create BrowserContext that wraps the existing browser
        browser_context = BrowserContext(
            browser=browser_use_browser, 
            config=context_config
        )
        
        # Set the existing session to avoid creating a new one
        from browser_use.browser.context import BrowserSession
        browser_context.session = BrowserSession(
            context=playwright_context,
            cached_state=None
        )
        
        # Set the current pages
        browser_context.agent_current_page = page
        browser_context.human_current_page = page
        
        # Store in server state
        server_state['is_initialized'] = True
        server_state['browser'] = browser_use_browser
        server_state['context'] = playwright_context
        server_state['browser_context'] = browser_context
        server_state['chrome_process'] = chrome_process
        
        print("Browser context created successfully - ready for tasks!")
        
        # Execute initial task if provided
        if task:
            print(f"Executing initial task: {task}")
            await execute_task_server(task)
        
        return True
        
    except Exception as e:
        print(f"Failed to initialize browser during startup: {str(e)}")
        return False

# Async version of init_browser_with_remote_debugging from utils
async def init_browser_async(playwright, headless=False, debug=True, video_dir=None, screenshots=True, video=True, source=True, executable_path=None):
    """Initialize browser with remote debugging enabled on port 9222"""
    
    # Kill any existing Chrome instances and clean up
    kill_chrome_instances()
    clean_user_data_dir()
    
    # Check if port 9222 is in use and kill any process using it
    try:
        if is_port_in_use(9222):
            print('Port 9222 is in use. Killing processes using this port...')
            if platform.system() == 'Windows':
                result = subprocess.run(['netstat', '-aon', '|', 'findstr', ':9222'], shell=True, stdout=subprocess.PIPE)
                if result.stdout:
                    lines = result.stdout.decode().splitlines()
                    for line in lines:
                        if 'LISTENING' in line:
                            pid = line.split()[-1]
                            os.system(f'taskkill /PID {pid} /F')
            else:
                os.system('lsof -ti:9222 | xargs kill -9')
            time.sleep(1)
    except Exception as e:
        print(f'Error checking port usage: {str(e)}')
    
    # Set Chrome path based on OS if not provided
    if not executable_path:
        if platform.system() == 'Windows':
            executable_path = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        elif platform.system() == 'Darwin':  # macOS
            executable_path = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        else:  # Linux
            possible_paths = ['/usr/bin/google-chrome', '/usr/bin/chromium-browser']
            for path in possible_paths:
                if os.path.exists(path):
                    executable_path = path
                    break
            if not executable_path:
                raise ValueError('No Chrome executable found in common Linux paths. Please provide --executable_path.')
    
    print(f'Launching Chrome with remote debugging using: {executable_path}')
    
    # Launch Chrome with remote debugging enabled
    debug_port = 9222
    user_data_dir = f'/tmp/chrome_debug_profile'
    os.makedirs(user_data_dir, exist_ok=True)
    
    chrome_flags = [
        f'--remote-debugging-port={debug_port}',
        f'--user-data-dir={user_data_dir}',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-features=Translate',
        '--disable-extensions',
        '--disable-component-extensions-with-background-pages',
        '--disable-background-networking',
        '--window-position=0,0',
        '--window-size=1080,720',
        '--disable-gpu',
        '--enable-unsafe-swiftshader',
        '--hide-crash-restore-bubble',
        '--disable-webgpu',
        '--use-gl=swiftshader'
    ]
    
    cmd_line = [executable_path] + chrome_flags
    print(f'Launching Chrome with command: {" ".join(cmd_line)}')
    process = subprocess.Popen(cmd_line)
    print(f'Chrome launched with PID: {process.pid}')
    time.sleep(10)
    
    print('Attempting to connect via http://127.0.0.1:9222...')
    browser = await playwright.chromium.connect_over_cdp('http://localhost:9222')
    print('Connected to Chrome instance via CDP on port 9222')
    
    context = browser.contexts[0]
    
    # Inject YouTube cookies to bypass consent banners
    await inject_cookies_for_sites(context, ['youtube'])
    
    page = context.pages[0]
    
    # Start tracing if requested
    if source:
        await context.tracing.start(screenshots=screenshots, snapshots=True, sources=source)
    
    page.set_default_timeout(5000)
    return page, context, browser, process

def is_port_in_use(port):
    """Check if a port is in use"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1)
        try:
            s.bind(('127.0.0.1', port))
            return False
        except socket.error:
            return True

# Function to take screenshots after each step
async def screenshot_callback(step_number, step_description, browser_context, trace_path):
    try:
        if browser_context and hasattr(browser_context, 'agent_current_page') and browser_context.agent_current_page:
            timestamp = time.strftime("%Y%m%d-%H%M%S")
            screenshot_path = os.path.join(trace_path, f"step_{step_number:03d}_{timestamp}.png")
            await browser_context.agent_current_page.screenshot(path=screenshot_path, full_page=True, timeout=20000)
            print(f"Step {step_number} screenshot saved to: {screenshot_path}")
    except Exception as e:
        print(f"Error taking step {step_number} screenshot: {str(e)}")

if __name__ == '__main__':
    start_server()
