import os
import sys
import logging

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from browser_use import BrowserConfig, Browser
from browser_use import Agent
import os 

load_dotenv()

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize the model
llm = ChatOpenAI(
	model='gpt-4o',
	temperature=0.0,
)
task = 'Go to youtube and launch a video'

# Force headless mode
os.environ["PLAYWRIGHT_HEADLESS"] = "1"

# Basic configuration
config = BrowserConfig(
    headless=True,
    disable_security=False
)

logger.info(f"BrowserConfig headless: {config.headless}")
browser = Browser(config=config)

agent = Agent(task=task, llm=llm)


async def main():
	await agent.run()


if __name__ == '__main__':
	asyncio.run(main())
