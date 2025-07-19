import sys
import json
from datetime import datetime
import logging
import os
from importlib import import_module
from pkg_resources import get_distribution, DistributionNotFound
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Set up logging
logging.basicConfig(
    filename='test_chatopenai_browser.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def log_versions():
    """Log versions of relevant packages."""
    packages = ['langchain', 'openai', 'selenium']
    versions = {}
    for pkg in packages:
        try:
            versions[pkg] = get_distribution(pkg).version
        except DistributionNotFound:
            versions[pkg] = 'Not installed'
    logger.info(f"Package versions: {json.dumps(versions, indent=2)}")
    return versions

def test_chatopenai():
    """Test ChatOpenAI functionality and method availability."""
    result = {
        "actions_performed": [],
        "error": None,
        "execution_time": 0,
        "success": False,
        "task": "Test ChatOpenAI object"
    }
    start_time = datetime.now()

    try:
        from langchain_openai import ChatOpenAI
        logger.info("Successfully imported ChatOpenAI")
        result["actions_performed"].append("Imported ChatOpenAI")
        #API KEYS
        OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
        
        if not OPENAI_API_KEY:
            logger.error("OPENAI_API_KEY not found in environment variables")
            result["error"] = "OPENAI_API_KEY not found in environment variables"
            result["success"] = False
            return result

        # Initialize ChatOpenAI with a dummy model
        llm = ChatOpenAI(model="gpt-3.5-turbo", api_key=OPENAI_API_KEY)
        result["actions_performed"].append("Initialized ChatOpenAI")

        # Check available methods
        methods = [method for method in dir(llm) if callable(getattr(llm, method)) and not method.startswith('_')]
        logger.info(f"Available methods on ChatOpenAI: {methods}")
        result["actions_performed"].append(f"Checked methods: {methods}")

        # Test for ainvoke method
        if hasattr(llm, 'ainvoke'):
            logger.info("ainvoke method is available")
            result["actions_performed"].append("Found ainvoke method")
            # Try a simple invocation
            response = llm.ainvoke("Hello, test message")
            logger.info(f"ainvoke response: {response}")
            result["actions_performed"].append(f"ainvoke response: {response}")
        else:
            logger.warning("ainvoke method not found")
            result["actions_performed"].append("ainvoke method not found")
            result["error"] = "'ChatOpenAI' object has no field 'ainvoke'"

        # Test alternative invoke method if available
        if hasattr(llm, 'invoke'):
            logger.info("invoke method is available")
            result["actions_performed"].append("Found invoke method")
            response = llm.invoke("Hello, test message")
            logger.info(f"invoke response: {response}")
            result["actions_performed"].append(f"invoke response: {response}")

        result["success"] = True

    except ImportError as e:
        logger.error(f"ImportError: {str(e)}")
        result["error"] = f"ImportError: {str(e)}"
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        result["error"] = f"Unexpected error: {str(e)}"

    result["execution_time"] = int((datetime.now() - start_time).total_seconds() * 1000)
    logger.info(f"ChatOpenAI test result: {json.dumps(result, indent=2)}")
    return result

def test_browser_navigation():
    """Test browser navigation to YouTube."""
    result = {
        "actions_performed": [],
        "error": None,
        "execution_time": 0,
        "success": False,
        "task": "Navigate to YouTube"
    }
    start_time = datetime.now()

    try:
        # Set up Selenium
        chrome_options = Options()
        chrome_options.add_argument("--headless")  # Run in headless mode
        driver = webdriver.Chrome(options=chrome_options)
        result["actions_performed"].append("Initialized Selenium WebDriver")

        # Navigate to YouTube
        driver.get("https://www.youtube.com")
        result["actions_performed"].append("Navigated to YouTube")
        logger.info("Successfully navigated to YouTube")

        # Verify page title
        title = driver.title
        result["actions_performed"].append(f"Page title: {title}")
        logger.info(f"YouTube page title: {title}")

        result["success"] = True

    except Exception as e:
        logger.error(f"Browser navigation error: {str(e)}")
        result["error"] = f"Browser navigation error: {str(e)}"
    finally:
        if 'driver' in locals():
            driver.quit()
            result["actions_performed"].append("Closed WebDriver")

    result["execution_time"] = int((datetime.now() - start_time).total_seconds() * 1000)
    logger.info(f"Browser navigation test result: {json.dumps(result, indent=2)}")
    return result

def main():
    """Run all tests and output results."""
    results = {
        "package_versions": log_versions(),
        "chatopenai_test": test_chatopenai(),
        "browser_test": test_browser_navigation()
    }
    with open('test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    logger.info("Test results written to test_results.json")
    print("Tests completed. Check test_results.json and test_chatopenai_browser.log for details.")

if __name__ == "__main__":
    main()