import asyncio
import os 
import logging
from io import StringIO
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from browser_use import Agent
from browser_use import SystemPrompt, ActionResult
from browser_use.browser.browser import Browser, BrowserConfig
from browser_use.browser.context import BrowserContext, BrowserContextConfig
from browser_use.controller.service import Controller
from browser_use.controller.registry.views import ActionModel
from datetime import datetime
from typing import Callable, Dict, Optional
from langchain_core.language_models.chat_models import BaseChatModel

# Function to inject YouTube cookies to bypass consent banners
async def inject_youtube_cookies(browser_context):
    """
    Inject cookies to bypass YouTube consent banners
    """
    try:
        logger.info("Injecting YouTube cookies to bypass consent banners...")
        
        # Ensure the session is initialized
        session = await browser_context.get_session()
        
        # YouTube consent cookies - these indicate user has already accepted cookies
        youtube_cookies = [
            {
                "name": "CONSENT",
                "value": "YES+cb.20210328-17-p0.en+FX+1",  # Consent given
                "domain": ".youtube.com",
                "path": "/",
                "secure": True
            },
            {
                "name": "SOCS",
                "value": "CAESEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg",  # Cookie settings
                "domain": ".youtube.com", 
                "path": "/",
                "secure": True
            },
            {
                "name": "__Secure-YEC",
                "value": "CgtaWVJzVjBsVFVnOCiB8-2oBjIKCgJGUhIEGgAgVw%3D%3D",
                "domain": ".youtube.com",
                "path": "/",
                "secure": True
            },
            # Google consent cookies (YouTube is owned by Google)
            {
                "name": "CONSENT",
                "value": "YES+cb.20210328-17-p0.en+FX+1",
                "domain": ".google.com",
                "path": "/",
                "secure": True
            }
        ]
        
        # Access the underlying Playwright context and use add_cookies
        playwright_context = session.context
        await playwright_context.add_cookies(youtube_cookies)
        logger.info(f"Successfully injected {len(youtube_cookies)} YouTube consent cookies")
        
    except Exception as e:
        logger.error(f"Error injecting YouTube cookies: {str(e)}")


class CustomController(Controller):
    def __init__(self, screenshot_folder=None, **kwargs):
        super().__init__(**kwargs) 
        self.screenshot_folder = screenshot_folder
        self.current_step = 0  # Add step counter

    async def multi_act(
        self,
        actions: list[ActionModel],
        browser_context: BrowserContext,
        **kwargs  # Capture all other parameters without explicitly listing them
    ) -> list[ActionResult]:
        results = []
        self.current_step += 1
        page = await browser_context.get_current_page()

        for idx, action in enumerate(actions):
            try:
                result = await self.act(
                    action=action,
                    browser_context=browser_context
                )
                results.append(result)
                
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                screenshot_path = os.path.join(
                    self.screenshot_folder, 
                    f"step_{self.current_step}_action_{idx+1}_{timestamp}.png"
                )
                await page.screenshot(path=screenshot_path, full_page=True)
            except Exception as e:
                print(f"Error during action execution or screenshot: {str(e)}")
                
        return results

class MultiHandler(logging.Handler):
    def __init__(self, stream_handler, file_handler):
        super().__init__()
        self.stream_handler = stream_handler
        self.file_handler = file_handler

    def emit(self, record):
        self.stream_handler.emit(record)
        self.file_handler.emit(record)

class LogCapture:
    def __init__(self):
        self.log_stream = StringIO()
        
        # Create handlers
        self.stream_handler = logging.StreamHandler()  # Prints to terminal
        self.file_handler = logging.StreamHandler(self.log_stream)  # Captures to StringIO
        
        # Set format for both handlers
        formatter = logging.Formatter('%(message)s')
        self.stream_handler.setFormatter(formatter)
        self.file_handler.setFormatter(formatter)
        
        # Create and set up the multi handler
        self.multi_handler = MultiHandler(self.stream_handler, self.file_handler)
        self.multi_handler.setLevel(logging.INFO)
        
        # Get the browser_use logger specifically
        self.logger = logging.getLogger('browser_use')
        # Remove any existing handlers
        self.logger.handlers = []
        self.logger.addHandler(self.multi_handler)
        self.logger.setLevel(logging.INFO)

    def emit(self, record):
        # Add separator when a new step starts
        if "📍 Step" in record.msg:
            separator = "-" * 50
            print(f"\n{separator}")
            super().emit(record)
            print(separator)
        else:
            super().emit(record)
    
    def get_logs(self):
        logs = self.log_stream.getvalue()
        # Add separators to captured logs
        formatted_logs = []
        separator = "-" * 50
        for line in logs.splitlines():
            if "📍 Step" in line:
                formatted_logs.extend(["", separator, line, separator, ""])
            else:
                formatted_logs.append(line)
        
        self.log_stream.seek(0)
        self.log_stream.truncate()
        return "\n".join(formatted_logs)

    def cleanup(self):
        if self.multi_handler in self.logger.handlers:
            self.logger.removeHandler(self.multi_handler)
        self.stream_handler.close()
        self.file_handler.close()

class BrowserManager:
    def __init__(self):
        # Initialize log capture
        self.log_capture = LogCapture()
        
        # Keep context of last task executed
        self.context_history = []
        self.last_result = None
        # Load environment variables
        load_dotenv()
        self.SUNRISE_URL = os.getenv('SUNRISE_URL', 'https://preprod360-www.sunrisetv.ch/en/home')
        self.OPENAI_MODEL = os.getenv('OPENAI_MODEL', 'gpt-4o')
        self.HIGHLIGHT_ELEMENTS = os.getenv('HIGHLIGHT_ELEMENTS', 'True').lower() == 'true' 
        # Initialize paths
        self.timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        self.trace_folder = os.path.join(os.path.dirname(__file__), 'traces', self.timestamp)
        os.makedirs(self.trace_folder, exist_ok=True)
        self.save_conversation_path = os.path.join(self.trace_folder, 'traces')
        self.screenshot_folder = os.path.join(self.trace_folder, 'screenshots')
        os.makedirs(self.screenshot_folder, exist_ok=True)

        # Initialize controller with screenshot support
        self.controller = CustomController(exclude_actions=['open_tab', 'google_search'],screenshot_folder=self.screenshot_folder)
        self.setup_controller_actions()
        # Initialize LLM
        self.llm = ChatOpenAI(model=self.OPENAI_MODEL)

        # Initialize browser and context
        self.browser = self.create_browser()
        self.context = self.create_browser_context(self.browser,highlight_elements=self.HIGHLIGHT_ELEMENTS)
        # Add reference to browser manager in context
        self.context.browser_manager = self
        await inject_youtube_cookies(self.context)
        self.test_page = None  # Store test page reference
        self.gradio_page = None  # Store Gradio page reference
        self.initial_task = f"""
        - Navigate to url '{self.SUNRISE_URL}'
        - Activate semantic
        """

    def setup_controller_actions(self):
        @self.controller.action('Activate semantic')
        async def activate_semantic(browser: Browser):
            page = await browser.get_current_page()
            await asyncio.sleep(2)
            js_command = """
            (() => {
                const shadowHost = document.querySelector('body > flutter-view > flt-glass-pane');
                if (shadowHost) {
                    const shadowRoot = shadowHost.shadowRoot;
                    if (shadowRoot) {
                        const element = shadowRoot.querySelector('flt-semantics-placeholder');
                        if (element) {
                            element.click();
                            return true;
                        }
                    }
                }
                return false;
            })()
            """

            try:
                result = await page.evaluate(f"""
                    (async () => {{
                        const result = {js_command};
                        console.log(result);
                        return result;
                    }})()
                """)
                print("Semantic placeholder activated.")
                return ActionResult(extracted_content="Semantic placeholder activated")
            except Exception as e:
                print(f"Error during semantic placeholder activation: {e}")
                return ActionResult(error=str(e))

        @self.controller.action('wait')
        async def wait(browser: Browser, seconds: int = 3):
            """Wait for a specified number of seconds"""
            await asyncio.sleep(seconds)
            return ActionResult(success=True,extracted_content=f'Waited for {seconds} seconds')

    def get_system_prompt(self):
        class MySystemPrompt(SystemPrompt):
            def important_rules(self) -> str:
                try:
                    with open('systemprompt.md', 'r') as file:
                        rules = file.read()
                except Exception as e:
                    print(f"Error reading systemprompt.md: {e}")
                    rules = super().important_rules()
                return rules
        return MySystemPrompt

    def create_browser(self):
        return Browser(
            config=BrowserConfig(
                headless=False,
                chrome_instance_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
                wss_url="ws://localhost:9222"
            )
        )

    def create_browser_context(self, browser: Browser, highlight_elements: bool):
        config = BrowserContextConfig(highlight_elements=highlight_elements)
        return BrowserContext(browser=browser, config=config)

    async def run_task(self, task: str):
        """
        Execute a task with context from previous actions.
        
        Args:
            task (str): The new task to execute
            
        Returns:
            Tuple[List[str], List[str], str]: Returns (errors, action_names, logs)
        """
        try:
            # Build context from previous actions and results
            context = ""
            if self.context_history:
                # Format previous actions as bullet points
                context = "Previous actions:\n" + "\n".join(
                    f"- {action}" for action in self.context_history
                )
                # Add the last result if available
                if self.last_result:
                    context += f"\nLast result: {self.last_result}\n"
            
            # Combine context with new task
            full_task = f"{context}\nNew task: {task}" if context else task
            
            # Create and run agent with full context
            agent = Agent(
                task=full_task,
                llm=self.llm,
                browser_context=self.context,
                system_prompt_class=self.get_system_prompt(),
                controller=self.controller,
                max_actions_per_step=4,
                save_conversation_path=self.save_conversation_path,
                use_vision=True,
                generate_gif=False,
            )

            # Execute the task
            await asyncio.sleep(1)
            result = await agent.run(max_steps=10)
            logs = self.log_capture.get_logs()
            
            # Update context history with new actions
            self.context_history.extend(result.action_names())
            # Store success message if available
            self.last_result = result.success_message() if hasattr(result, 'success_message') else None
            
            return result.errors(), result.action_names(), logs
        except Exception as e:
            print(f"Error during task execution: {str(e)}")
            logs = self.log_capture.get_logs()
            return [], [], logs

    async def cleanup(self):
        """Clean up browser resources and logging"""
        try:
            if self.context:
                await self.context.browser.close()
            if hasattr(self, 'log_capture'):
                self.log_capture.cleanup()
            print("Browser and resources cleaned up successfully")
        except Exception as e:
            print(f"Error during cleanup: {str(e)}")
            raise

async def main():
    browser_manager = BrowserManager()
    
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
    except Exception as e:
        print(f"Error during execution: {str(e)}")
        await asyncio.sleep(1000)

if __name__ == "__main__":
    asyncio.run(main())