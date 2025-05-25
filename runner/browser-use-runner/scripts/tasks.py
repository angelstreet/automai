import os
import sys
import logging
import asyncio
import argparse
import time
import zipfile
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from browser_use import BrowserConfig, Browser, Agent, BrowserContextConfig

# Flask server imports
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
from browseruseUtils import BrowserManager
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
parser.add_argument('--headless', action='store_true', help='Run in headless mode')
parser.add_argument('--task', type=str, default='Go to youtube and launch a video for 10s', help='The task for the agent to perform')
parser.add_argument('--trace_folder', type=str, default='traces', help='The folder to save the trace')
parser.add_argument('--cookies_path', type=str, default='', help='The path to the cookies file')
parser.add_argument('--executable_path', type=str, help='Path to Google Chrome executable, defaults to Chromium if not provided')
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
    """Initialize browser for server mode"""
    try:
        if server_state['is_initialized']:
            update_log("Browser refresh detected, cleaning up existing instance...")
            await cleanup_browser_server()
            await asyncio.sleep(1)
        
        server_state['log_buffer'] = []
        server_state['start_time'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        update_log("Starting browser initialization...")
        
        # Initialize the model
        llm = ChatOpenAI(model='gpt-4o', temperature=0.0)
        
        # Context configuration
        trace_path = os.path.join(os.getcwd(), args.trace_folder)
        context_config = BrowserContextConfig(
            save_recording_path=trace_path,
            save_downloads_path=trace_path,
            user_data_dir='/tmp/chrome_debug_profile'
        )
        
        # Browser configuration
        browser_config = BrowserConfig(
            headless=args.headless,
            disable_security=False,
            new_context_config=context_config,
            launch_args=[
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--node-default-browser-check'
            ],
            executable_path=args.executable_path if args.executable_path else None
        )
        
        server_state['browser'] = Browser(config=browser_config)
        update_log("Browser created successfully")
        
        # Initialize browser context
        browser_context = await server_state['browser'].new_context()
        
        # Inject YouTube cookies to bypass consent banners
        await inject_youtube_cookies(browser_context)
        
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
    print(f"📍 Server will be available at: http://localhost:5000")
    print(f"🆔 Process ID: {pid}")
    print("🔄 Press Ctrl+C to stop the server")
    print("-" * 50)
    
    app = create_flask_server()
    
    try:
        print(f"✅ Flask server started successfully with PID: {pid}")
        app.run(host='0.0.0.0', port=5000, debug=False)
    except KeyboardInterrupt:
        print("\n🛑 Stopping server...")
        print("✅ Server stopped successfully")
    except Exception as e:
        print(f"❌ Error starting server: {str(e)}")
        raise

# Original task execution code (unchanged)
task = args.task.replace("_", " ")
print(f"----- Task: {task} -----")

trace_path = os.path.join(os.getcwd(), args.trace_folder)

# Initialize the model
llm = ChatOpenAI(
    model='gpt-4o',
    temperature=0.0
)

# Context configuration
context_config = BrowserContextConfig(
    save_recording_path=trace_path,
    save_downloads_path=trace_path,
    user_data_dir = '/tmp/chrome_debug_profile'
    #trace_path=trace_path, # bug in patchright
)


# Determine headless mode based on command-line argument only
headless = args.headless
logger.info(f"Parsed headless argument: {args.headless}")

browser_config = BrowserConfig(
    headless=headless,
    disable_security=False,
    new_context_config=context_config,
    launch_args=[
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--node-default-browser-check'
    ],
    executable_path=args.executable_path if args.executable_path else None
)

browser = Browser(config=browser_config)

# Function to take screenshots after each step
async def screenshot_callback(step_number, step_description, browser_context):
    try:
        if browser_context and hasattr(browser_context, 'agent_current_page') and browser_context.agent_current_page:
            timestamp = time.strftime("%Y%m%d-%H%M%S")
            screenshot_path = os.path.join(trace_path, f"step_{step_number:03d}_{timestamp}.png")
            await browser_context.agent_current_page.screenshot(path=screenshot_path, full_page=True, timeout=20000)
            logger.info(f"Step {step_number} screenshot saved to: {screenshot_path}")
    except Exception as e:
        logger.error(f"Error taking step {step_number} screenshot: {str(e)}")

agent = Agent(
    task=task, 
    llm=llm, 
    browser=browser,
    register_new_step_callback=screenshot_callback
)

async def main():
    browser_manager = BrowserManager()
    result = False
    try:
        task = f"""
        - Navigate to url '{browser_manager.SUNRISE_URL}'
        - Activate semantic
        """
        errors, actions, logs = await browser_manager.run_task(task)
        print("Actions:", actions)
        print("Errors:", errors)
        print("Logs:", logs)
        
        input('Press Enter to close the browser...')
        await browser_manager.cleanup()
        result = True
        print("Test Success, Agent run successful")
    except Exception as e:
        print(f"Test Failed, Error during agent run: {str(e)}")
        logger.error(f"Error during agent run: {str(e)}")
    finally:
        # Take a screenshot of the final state
        try:
            if agent.browser_context and hasattr(agent.browser_context, 'agent_current_page') and agent.browser_context.agent_current_page:
                timestamp = time.strftime("%Y%m%d-%H%M%S")
                screenshot_path = os.path.join(trace_path, f"final_state_{timestamp}.png")
                await agent.browser_context.agent_current_page.screenshot(path=screenshot_path, full_page=True, timeout=20000)
                logger.info(f"Screenshot saved to: {screenshot_path}")
        except Exception as e:
            logger.error(f"Error taking final screenshot: {str(e)}")

        # Unzip the trace file if it exists
        try:
            if agent.browser_context and hasattr(agent.browser_context, 'context_id'):
                trace_file = os.path.join(trace_path, ".zip")
                if os.path.exists(trace_file):
                    trace_subfolder = os.path.join(trace_path, f"trace_{agent.browser_context.context_id}")
                    os.makedirs(trace_subfolder, exist_ok=True)
                    with zipfile.ZipFile(trace_file, 'r') as zip_ref:
                        zip_ref.extractall(trace_subfolder)
                    os.remove(trace_file)
                    logger.info(f"Trace data extracted to: {trace_subfolder}")
                    logger.info(f"Zip file removed: {trace_file}")
        except Exception as e:
            logger.error(f"Error saving or extracting trace data: {str(e)}")
        
        if result:
            print("Test Success, Agent run successful")
            return sys.exit(0)
        else:
            print("Test Failed, Agent run failed")
            return sys.exit(1)

if __name__ == '__main__':
        start_server()
        asyncio.run(main())