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

load_dotenv()

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Set up argument parser
parser = argparse.ArgumentParser(description='Run a browser automation task')
parser.add_argument('--task', type=str, default='Go to youtube', help='The task for the agent to perform')
parser.add_argument('--trace_folder', type=str, default='traces', help='The folder to save the trace')
parser.add_argument('--cookies_path', type=str, default='', help='The path to the cookies file')
args, _ = parser.parse_known_args()

task = args.task
# Use os.getcwd() instead of __file__ for trace_path
trace_path = os.path.join(os.getcwd(), args.trace_folder)

# Modify sys.path to include parent directory of current working directory
sys.path.append(os.path.dirname(os.getcwd()))

# Initialize the model
llm = ChatOpenAI(
    model='gpt-4o',
    temperature=0.0
)

# Set default cookies path using trace_path
cookies_file = args.cookies_path if args.cookies_path else os.path.join(trace_path, 'cookies.json')

# Ensure the cookies directory exists
os.makedirs(os.path.dirname(cookies_file), exist_ok=True)

# Context configuration
context_config = BrowserContextConfig(
    save_recording_path=trace_path,
    save_downloads_path=trace_path,
    trace_path=trace_path,
    cookies_file=cookies_file
)

# Basic configuration
browser_config = BrowserConfig(
    headless=False,
    disable_security=False,
    new_context_config=context_config
)

logger.info(f"BrowserConfig headless: {browser_config.headless}")
browser = Browser(config=browser_config)

agent = Agent(task=task, llm=llm, browser=browser)

async def main():
    try:
        await agent.run()
    except Exception as e:
        logger.error(f"Error during agent run: {str(e)}")
    finally:
        # Take a screenshot of the final state
        try:
            if agent.browser_context and agent.browser_context.agent_current_page:
                timestamp = time.strftime("%Y%m%d-%H%M%S")
                screenshot_path = os.path.join(trace_path, f"final_state_{timestamp}.png")
                await agent.browser_context.agent_current_page.screenshot(path=screenshot_path, full_page=True, timeout=20000)
                logger.info(f"Screenshot saved to: {screenshot_path}")
        except Exception as e:
            logger.error(f"Error taking final screenshot: {str(e)}")

        # Save cookies to file
        try:
            if agent.browser_context:
                cookies_data = await agent.browser_context.context.cookies()
                with open(cookies_file, 'w') as f:
                    json.dump(cookies_data, f, indent=2)
                logger.info(f"Saved cookies to: {cookies_file}")
        except Exception as e:
            logger.error(f"Error saving cookies: {str(e)}")

        # Unzip the trace file if it exists
        try:
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

if __name__ == '__main__':
    asyncio.run(main())