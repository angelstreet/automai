import os
import sys
import logging
import asyncio
import argparse
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from browser_use import BrowserConfig, Browser, Agent

load_dotenv()

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Set up argument parser
parser = argparse.ArgumentParser(description='Run a browser automation task')
parser.add_argument('--task', type=str, default='Go to youtube and launch a video', help='The task for the agent to perform')
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

# Force headless mode
os.environ["PLAYWRIGHT_HEADLESS"] = "1"

# Set default cookies path if not provided, using os.getcwd()
cookies_file = args.cookies_path if args.cookies_path else os.path.join(os.getcwd(), 'cookies', 'cookies.json')

# Ensure the cookies directory exists
os.makedirs(os.path.dirname(cookies_file), exist_ok=True)

# Basic configuration
config = BrowserConfig(
    headless=True,
    disable_security=False,
    cookies_file=cookies_file,
)

logger.info(f"BrowserConfig headless: {config.headless}")
browser = Browser(config=config)

agent = Agent(task=task, llm=llm)

async def main():
    await agent.run()

if __name__ == '__main__':
    asyncio.run(main())