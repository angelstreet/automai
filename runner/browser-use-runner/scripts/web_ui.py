import gradio as gr
import asyncio
from typing import Tuple, List
import os
from datetime import datetime
from langchain_openai import ChatOpenAI
from browser_use import Agent
from main import BrowserManager

class GradioTaskRunner:
    def __init__(self):
        self.browser_manager = None
        self.is_initialized = False
        self.log_buffer = []
        self.start_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        self.update_log(f"Task Runner initialized at {self.start_time}")

    def update_log(self, message: str):
        """Update the log with new content while preserving history"""
        if message and message.strip():
            timestamp = datetime.now().strftime('%H:%M:%S')
            formatted_message = f"[{timestamp}] {message}"
            self.log_buffer.append(formatted_message)
        return "\n".join(self.log_buffer)

    async def focus_web_ui(self):
        """Focus on the Gradio interface"""
        if self.browser_manager and self.browser_manager.gradio_page:
            await self.browser_manager.gradio_page.bring_to_front()
            await asyncio.sleep(3)
            print("Switched to Gradio interface")

    async def focus_test_page(self):
        """Focus on the test page"""
        if self.browser_manager and self.browser_manager.test_page:
            await self.browser_manager.test_page.bring_to_front()
            print("Switched to test page")

    async def close_other_tabs(self):
        """Close all tabs except Gradio and test page"""
        if self.browser_manager and self.browser_manager.context:
            try:
                # Store test page reference
                self.browser_manager.test_page = await self.browser_manager.context.get_current_page()
                
                while True:
                    tabs_info = await self.browser_manager.context.get_tabs_info()
                    if len(tabs_info) <= 2:
                        break               
                    
                    for tab in tabs_info:
                        if 'gradio' in tab.title.lower():
                            if not self.browser_manager.gradio_page:
                                await self.browser_manager.context.switch_to_tab(tab.page_id)
                                self.browser_manager.gradio_page = await self.browser_manager.context.get_current_page()
                            continue
                        if tab == self.browser_manager.test_page:
                            continue
                            
                        try:
                            await self.browser_manager.context.switch_to_tab(tab.page_id)
                            await asyncio.sleep(1)
                            current_page = await self.browser_manager.context.get_current_page()
                            if current_page:
                                await current_page.close()
                                print(f"Closed tab: {tab.title}")
                                break
                        except Exception as e:
                            print(f"Error closing tab '{tab.title}': {str(e)}")
                            
                print("Closed all tabs except Gradio and test page")
                await asyncio.sleep(2)
            except Exception as e:
                print(f"Error during tab cleanup: {str(e)}")

    async def initialize_browser(self):
        """Initialize the browser and perform initial setup"""
        try:
            # If browser exists, clean it up first
            if self.is_initialized:
                self.update_log("Browser refresh detected, cleaning up existing instance...")
                await self.cleanup()
                await asyncio.sleep(1)
                self.is_initialized = False
                self.browser_manager = None
            
            self.log_buffer = []
            self.update_log("Starting browser initialization...")
            
            self.browser_manager = BrowserManager()
            self.update_log("Browser manager created")
            
            # Close other tabs first
            await self.close_other_tabs()
            await asyncio.sleep(1)
            
            self.update_log("Running initial task...")
            errors, actions, logs = await self.browser_manager.run_task(self.browser_manager.initial_task)
            
            # Update logs with agent output
            if logs:
                self.update_log(logs.strip())
            
            if errors:
                for error in errors:
                    self.update_log(f"Error: {error}")
            
            for action in actions:
                self.update_log(f"Action performed: {action}")
            
            self.is_initialized = True
            await self.focus_web_ui()  # Make sure we end on Gradio interface
            
            return "Browser initialized successfully ✅\nYou can start executing tasks now 👍", self.update_log("Browser initialization completed")
        except Exception as e:
            error_msg = f"Error initializing browser: {str(e)}"
            return error_msg, self.update_log(error_msg)

    async def execute_task(self, task: str):
        """Execute a task and return the results"""
        if not task or task.strip() == "":
            raise gr.Error("Please enter a task before clicking Execute")

        if not self.is_initialized:
            return "Browser not initialized. Please initialize first.", self.update_log("Error: Browser not initialized")

        try:
            self.update_log(f"Executing new task:\n{task}")
            await self.focus_test_page()  # Switch to test page before execution
            await asyncio.sleep(1)
            errors, actions, logs = await self.browser_manager.run_task(task)
            
            # Update logs with agent output
            if logs:
                self.update_log(logs.strip())
            
            # Format the task output
            task_output = "Actions performed:\n"
            for action in actions:
                task_output += f"- {action}\n"
                self.update_log(f"Action completed: {action}")
            
            if errors:
                task_output += "\nErrors encountered:\n"
                for error in errors:
                    task_output += f"- {error}\n"
                    self.update_log(f"Error: {error}")
            await asyncio.sleep(2)
            await self.focus_web_ui()  # Return to Gradio interface
            return task_output, self.update_log("Task execution completed")
        except Exception as e:
            error_msg = f"Error executing task: {str(e)}"
            return error_msg, self.update_log(error_msg)

    async def cleanup(self):
        """Cleanup resources"""
        if self.browser_manager:
            try:
                self.update_log("Starting cleanup process...")
                await self.browser_manager.cleanup()
                self.is_initialized = False
                self.browser_manager = None
                return "Browser closed successfully", self.update_log("Browser and all tabs closed successfully")
            except Exception as e:
                error_msg = f"Error during cleanup: {str(e)}"
                return error_msg, self.update_log(error_msg)
        return "No browser instance to clean up", self.update_log("No browser instance to clean up")

def create_gradio_interface():
    runner = GradioTaskRunner()

    # Update CSS to include task input helper
    css = """
        #execute-button {
            position: relative;
        }
        #execute-button:not(.disabled) {
            background-color: #2B3499;
            color: white;
        }
        #execute-button.disabled {
            background-color: #e0e0e0;
            cursor: not-allowed;
        }
        #execute-button.disabled:hover::after {
            content: "Please click 'Start' button first";
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            padding: 5px;
            background: #333;
            color: white;
            border-radius: 4px;
            font-size: 12px;
            white-space: nowrap;
        }
        .empty-task-warning {
            color: #ff4444;
            font-size: 0.9em;
            margin-top: 4px;
            display: none;
        }
    """

    with gr.Blocks(css=css) as interface:
        gr.Markdown("# Browser Automation Interface")
        
        # Control buttons row
        with gr.Row():
            init_button = gr.Button("Start", variant="primary")
            cleanup_button = gr.Button("Stop", variant="stop", interactive=False)

        # Task input area
        with gr.Column():
            task_input = gr.Textbox(
                label="Task Input",
                placeholder="Enter your task here...",
                lines=3
            )
            helper_text = gr.HTML(
                '<div class="empty-task-warning">Please enter a task before clicking Execute</div>',
                visible=False
            )
            execute_button = gr.Button(
                "Execute Task", 
                elem_id="execute-button",
                interactive=False,
                variant="primary"
            )
            
            # Example tasks
            gr.Examples(
                examples=[
                    "Go to TV Guide",
                    "Click on Live TV then wait 3s",
                ],
                inputs=task_input,
                label="Example Tasks",
                examples_per_page=2,
            )

        # Output areas
        with gr.Column():
            task_output = gr.Textbox(
                label="Task Result",
                lines=10,
                interactive=False
            )
            log_output = gr.Textbox(
                label="Log Output",
                lines=10,
                interactive=False
            )

        # Event handlers
        def on_start_click():
            return [
                gr.update(interactive=False),
                "Initializing browser...",
                runner.update_log("Starting browser initialization...")
            ]

        def on_init_success(output_msg, logs):
            if "successfully" in output_msg.lower():
                return [
                    gr.update(interactive=True),   # execute_button
                    gr.update(interactive=False),  # init_button
                    gr.update(interactive=True),   # cleanup_button
                    output_msg,
                    logs
                ]
            return [
                gr.update(interactive=False),  # execute_button
                gr.update(interactive=True),   # init_button
                gr.update(interactive=False),  # cleanup_button
                output_msg,
                logs
            ]

        def on_execute_start():
            """Disable buttons when task starts"""
            return [
                gr.update(interactive=False),  # execute_button
                gr.update(interactive=False),  # cleanup_button
                "Executing task...",
                ""  # Keep logs
            ]

        def on_execute_end(task, result, logs):
            """Re-enable buttons and format output when task completes"""
            formatted_output = f"Task:\n{task}\n\n{'='*50}\n\nResult:\n{result}"
            return [
                "",  # Clear task input
                gr.update(interactive=True),  # execute_button
                gr.update(interactive=True),  # cleanup_button
                formatted_output,
                logs
            ]

        # Add helper text div and modify execute button click handler
        def on_execute_click(task):
            """Validate task before execution"""
            if not task or task.strip() == "":
                return {
                    helper_text: gr.update(visible=True),
                    task_input: gr.update(value=task)
                }
            return {
                helper_text: gr.update(visible=False),
                task_input: gr.update(value=task)
            }

        # Event bindings
        init_button.click(
            fn=on_start_click,
            outputs=[init_button, task_output, log_output],
        ).then(
            fn=runner.initialize_browser,
            outputs=[task_output, log_output],
        ).then(
            fn=on_init_success,
            inputs=[task_output, log_output],
            outputs=[execute_button, init_button, cleanup_button, task_output, log_output]
        )
        
        cleanup_button.click(
            fn=runner.cleanup,
            outputs=[task_output, log_output],
        ).then(
            fn=lambda x, y: [
                gr.update(interactive=False),  # execute_button
                gr.update(interactive=True),   # init_button
                gr.update(interactive=False),  # cleanup_button
                x, y
            ],
            inputs=[task_output, log_output],
            outputs=[execute_button, init_button, cleanup_button, task_output, log_output]
        )
        
        execute_button.click(
            fn=on_execute_click,
            inputs=[task_input],
            outputs=[helper_text, task_input],
        ).success(  # Only continue if validation passes
            fn=on_execute_start,
            outputs=[execute_button, cleanup_button, task_output, log_output]
        ).then(
            fn=runner.execute_task,
            inputs=task_input,
            outputs=[task_output, log_output]
        ).then(
            fn=on_execute_end,
            inputs=[task_input, task_output, log_output],
            outputs=[task_input, execute_button, cleanup_button, task_output, log_output]
        )

    return interface

if __name__ == "__main__":
    demo = create_gradio_interface()
    demo.queue().launch(
        server_name="0.0.0.0",
        server_port=7860,
        share=False
    )