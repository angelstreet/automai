import os
import sys
import logging
import asyncio
import argparse
import time
import zipfile
import json
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from browser_use import BrowserConfig, Browser, Agent, BrowserContextConfig
from utils import  get_cookies_path, launch_browser_with_remote_debugging
from suncherryAsyncUtils import pass_login,take_screenshot
from datetime import datetime


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
parser = argparse.ArgumentParser(description='Run a browser automation task')
parser.add_argument('--headless', action='store_true', help='Run in headless mode')
parser.add_argument('--task', type=str, default='Click on Guide TV', help='The task for the agent to perform')
parser.add_argument('--trace_folder', type=str, default='traces', help='The folder to save the trace')
parser.add_argument('--executable_path', type=str, help='Path to Google Chrome executable, defaults to Chromium if not provided')
args, _ = parser.parse_known_args()

# Determine headless mode based on command-line argument only
headless = args.headless
logger.info(f"Parsed headless argument: {args.headless}")

task = args.task.replace("_", " ")
logger.info(f"----- Task: {task} -----")
trace_folder = args.trace_folder
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
job_folder = trace_folder  # Use trace_folder as the base job folder directly
trace_subfolder = os.path.join(job_folder, f"trace_{timestamp}")  # Create a trace subfolder within job_folder
os.makedirs(trace_subfolder, exist_ok=True)

# Initialize the model
llm = ChatOpenAI(
    model='gpt-4o',
    temperature=0.0
)

# Set default cookies path using trace_path
cookies_path = get_cookies_path(trace_folder, True)

# Launch browser with remote debugging if executable path is provided or default path is used
browser_process = None
if args.executable_path:
    browser_process = launch_browser_with_remote_debugging(args.executable_path)
else:
    browser_process = launch_browser_with_remote_debugging()

# Context configuration
context_config = BrowserContextConfig(
    save_recording_path=trace_folder,
    save_downloads_path=trace_folder,
    #trace_path=trace_path, # bug in patchright
    cookies_file=cookies_path
)

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
        '--node-default-browser-check',
        '--hide-crash-restore-bubble'
    ],
    cdp_url="http://127.0.0.1:9222",
    keep_alive=True
)

browser = Browser(config=browser_config)
agent = Agent(task=task, llm=llm, browser=browser)
step_start = True

# Define your before and after functions
async def before_agent(agent):
    global step_start
    if step_start :
        print("--------------------------------")
        print("ON STEP START")
        page = await agent.browser_context.get_current_page()
        await page.goto("https://sunrisetv.ch/home")
        await page.wait_for_timeout(5000)
        await pass_login(page, trace_subfolder)
        step_start = False

async def main():
    result = False
    history = None
    try:
        history = await agent.run(
            on_step_start=before_agent
        )
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
                screenshot_path = os.path.join(trace_subfolder, f"final_state_{timestamp}.png")
                await agent.browser_context.agent_current_page.screenshot(path=screenshot_path, full_page=True, timeout=20000)
                logger.info(f"Screenshot saved to: {screenshot_path}")
        except Exception as e:
            logger.error(f"Error taking final screenshot: {str(e)}")

        # Unzip the trace file if it exists
        try:
            if agent.browser_context and hasattr(agent.browser_context, 'context_id'):
                trace_file = os.path.join(trace_subfolder, ".zip")
                if os.path.exists(trace_file):
                    os.makedirs(trace_subfolder, exist_ok=True)
                    with zipfile.ZipFile(trace_file, 'r') as zip_ref:
                        zip_ref.extractall(trace_subfolder)
                    os.remove(trace_file)
                    logger.info(f"Trace data extracted to: {trace_subfolder}")
                    logger.info(f"Zip file removed: {trace_file}")
        except Exception as e:
            logger.error(f"Error saving or extracting trace data: {str(e)}")
        
        # Keep the browser open as requested
        print("Browser remains open. Remember to close it manually or terminate the process when done.")
        if browser_process:
            print(f"Browser process PID: {browser_process.pid}")
        return result, history

if __name__ == '__main__':
    asyncio.run(main())
