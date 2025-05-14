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
import sys

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
parser.add_argument('--task', type=str, default='Go to youtube, accept all cookies and launch a video for 10s', help='The task for the agent to perform')
parser.add_argument('--trace_folder', type=str, default='traces', help='The folder to save the trace')
parser.add_argument('--cookies_path', type=str, default='', help='The path to the cookies file')
parser.add_argument('--executable_path', type=str, help='Path to Google Chrome executable, defaults to Chromium if not provided')
args, _ = parser.parse_known_args()

print(f"----- WARNING: Use _ to escape spaces in task -----")
task = args.task.replace("_", " ")
print(f"----- Task: {task} -----")

trace_path = os.path.join(os.getcwd(), args.trace_folder)

# Initialize the model
llm = ChatOpenAI(
    model='gpt-4o',
    temperature=0.0
)

# Set default cookies path using trace_path
cookies_file = args.cookies_path if args.cookies_path else os.path.join(trace_path, 'cookies.json')
os.makedirs(os.path.dirname(cookies_file), exist_ok=True)

# Context configuration
context_config = BrowserContextConfig(
    save_recording_path=trace_path,
    save_downloads_path=trace_path,
    #trace_path=trace_path, # bug in patchright
    cookies_file=cookies_file
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
agent = Agent(task=task, llm=llm, browser=browser)
result = False

async def main():
    result = False
    try:
        await agent.run()
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
                trace_file = os.path.join(trace_path, f"{agent.browser_context.context_id}.zip")
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
            sys.exit(0)
        else:
            sys.exit(1)

if __name__ == '__main__':
    asyncio.run(main())