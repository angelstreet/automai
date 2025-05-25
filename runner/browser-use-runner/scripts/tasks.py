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

# Flask server imports
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
from utils import kill_chrome_instances, clean_user_data_dir

from langchain_openai import ChatOpenAI
from browser_use import BrowserConfig, Browser, Agent, BrowserContextConfig
from browseruseUtils import inject_youtube_cookies

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.dirname(os.getcwd()))

load_dotenv()

# Force UTF-8 encoding for console output on Windows
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
parser.add_argument('--task', type=str, default='Go to youtube and launch a video for 10s', help='The task for the agent to perform')
parser.add_argument('--headless', action='store_true', help='Run browser in headless mode')
parser.add_argument('--debug', action='store_true', help='Enable debug mode')
parser.add_argument('--executable_path', type=str, help='Path to browser executable')
parser.add_argument('--server', action='store_true', help='Start server mode instead of running task')
args, _ = parser.parse_known_args()

# Global variables for server mode
app = None
server_state = {
    'browser': None,
    'agent': None,
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

async def initialize_browser_server():
    """Initialize browser"""
    try:
        server_state['is_initialized'] = True
        update_log("Browser initialized successfully ✅")
        return True, "Browser initialized successfully ✅"
        
    except Exception as e:
        error_msg = f"Error initializing browser: {str(e)}"
        update_log(error_msg)
        return False, error_msg

async def execute_task_server(task: str):
    """Execute a task in server mode"""
    if not task or task.strip() == "":
        return False, "Please enter a task before executing", ""

    if not server_state['is_initialized']:
        return False, "Browser not initialized. Please initialize first.", ""

    if server_state['is_executing']:
        return False, "Another task is currently executing. Please wait.", ""

    try:
        server_state['is_executing'] = True
        server_state['current_task'] = task
        update_log(f"Executing new task:\n{task}")
        
        # Initialize the model for this task
        llm = ChatOpenAI(model='gpt-4o', temperature=0.0)
        
        # Create agent for this task
        agent = Agent(
            task=task,
            llm=llm,
            browser=server_state['browser'],
        )
        
        start_time = time.time()
        
        # Run the agent
        await agent.run()
        
        execution_time = time.time() - start_time
        
        # Format the task output
        task_output = f"Task: {task}\n\n{'='*50}\n\n"
        task_output += "Actions performed:\n"
        task_output += f"- Task executed successfully\n"
        task_output += f"- Execution time: {execution_time:.2f} seconds\n"
        
        update_log("Task completed successfully")
        update_log(f"Execution time: {execution_time:.2f} seconds")
        
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
    if server_state['browser']:
        try:
            update_log("Starting cleanup process...")
            await server_state['browser'].close()
            server_state['browser'] = None
            server_state['is_initialized'] = False
            update_log("Browser closed successfully")
            return True, "Browser closed successfully"
        except Exception as e:
            error_msg = f"Error during cleanup: {str(e)}"
            update_log(error_msg)
            return False, error_msg
    return True, "No browser instance to clean up"

def run_async_in_server(coro):
    """Helper to run async functions in sync context for server"""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    return loop.run_until_complete(coro)

def create_flask_server():
    """Create and configure Flask server"""
    global app
    app = Flask(__name__)
    CORS(app)  # Enable CORS for all routes
    
    @app.route('/status', methods=['GET'])
    def get_status():
        """Get current browser automation status"""
        return jsonify({
            'initialized': server_state['is_initialized'],
            'executing': server_state['is_executing'],
            'current_task': server_state['current_task'],
            'start_time': server_state['start_time'],
            'logs': "\n".join(server_state['log_buffer'])
        })

    @app.route('/initialize', methods=['POST'])
    def initialize():
        """Initialize browser automation"""
        try:
            success, message = run_async_in_server(initialize_browser_server())
            return jsonify({
                'success': success,
                'message': message,
                'logs': "\n".join(server_state['log_buffer'])
            })
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f"Error: {str(e)}",
                'logs': "\n".join(server_state['log_buffer'])
            }), 500

    @app.route('/execute', methods=['POST'])
    def execute_task():
        """Execute a browser automation task"""
        try:
            data = request.get_json()
            task = data.get('task', '')
            
            success, result, status = run_async_in_server(execute_task_server(task))
            
            return jsonify({
                'success': success,
                'result': result,
                'status': status,
                'logs': "\n".join(server_state['log_buffer'])
            })
        except Exception as e:
            return jsonify({
                'success': False,
                'result': f"Error: {str(e)}",
                'status': 'FAILURE',
                'logs': "\n".join(server_state['log_buffer'])
            }), 500

    @app.route('/cleanup', methods=['POST'])
    def cleanup():
        """Cleanup browser automation"""
        try:
            success, message = run_async_in_server(cleanup_browser_server())
            return jsonify({
                'success': success,
                'message': message,
                'logs': "\n".join(server_state['log_buffer'])
            })
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f"Error: {str(e)}",
                'logs': "\n".join(server_state['log_buffer'])
            }), 500

    @app.route('/logs', methods=['GET'])
    def get_logs():
        """Get current logs"""
        return jsonify({
            'logs': "\n".join(server_state['log_buffer'])
        })
    
    return app

def start_server():
    """Start the Flask server"""
    import os
    pid = os.getpid()
    
    print("🚀 Starting Browser Automation Server...")
    print(f"📍 Server will be available at: http://localhost:5001")
    print(f"🆔 Process ID: {pid}")
    print("🔄 Press Ctrl+C to stop the server")
    print("-" * 50)
    
    app = create_flask_server()
    
    try:
        print(f"✅ Flask server started successfully with PID: {pid}")
        app.run(host='0.0.0.0', port=5001, debug=False)
    except KeyboardInterrupt:
        print("\n🛑 Stopping server...")
        print("✅ Server stopped successfully")
    except Exception as e:
        print(f"❌ Error starting server: {str(e)}")
        raise

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
    await inject_youtube_cookies(context)
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

async def main():
    trace_folder = args.trace_folder.replace("_", " ")
    print(f"----- Trace folder: {trace_folder} -----")
    task = args.task.replace("_", " ")
    print(f"----- Task: {task} -----")
    
    # Create trace path
    trace_path = os.path.join(os.getcwd(), trace_folder)
    os.makedirs(trace_path, exist_ok=True)
    
    result = False
    page = None
    context = None
    browser = None
    chrome_process = None
    
    try:
        async with async_playwright() as playwright:
            # Initialize browser with remote debugging
            page, context, browser, chrome_process = await init_browser_async(
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
            screenshot_path = os.path.join(trace_path, f"youtube_{timestamp}.png")
            await page.screenshot(path=screenshot_path, full_page=True, timeout=20000)
            print(f"Screenshot saved to: {screenshot_path}")
            result = True
            print("Browser automation ready to execute task")
            # Note: execute_task_server is async, so we need to await it
            await execute_task_server(task)
            return True
    except Exception as e:
        print(f"Test Failed, Error during browser automation: {str(e)}")
        return False

if __name__ == '__main__':
        asyncio.run(main())        
        #start_server()
