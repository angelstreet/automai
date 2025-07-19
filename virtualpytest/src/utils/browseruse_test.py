import sys
import os
import time
from controllers.web.playwright import PlaywrightWebController
from utils.playwright_utils import PlaywrightUtils

def test_browser_use_task():
    print('[Test] Starting browser-use task test')
    
    # Initialize utils
    utils = PlaywrightUtils(auto_accept_cookies=True, window_size="auto")
    
    # Initialize controller
    controller = PlaywrightWebController()
    
    try:
        # Connect and open browser
        if not controller.connect():
            raise Exception('Failed to connect to Chrome')
        
        open_result = controller.open_browser()
        print(f'[Test] Open browser result: {open_result}')
        if not open_result['success']:
            raise Exception('Failed to open browser')
        
        time.sleep(2)  # Wait for browser to stabilize
        
        # Execute task
        task_result = controller.browser_use_task('go to youtube')
        print('\n[Test] Task Execution Result:')
        print(task_result)
        
        if task_result['success']:
            print('[Test] SUCCESS: Task completed successfully')
        else:
            print(f'[Test] FAILURE: {task_result.get("error", "Unknown error")}')
        
    except Exception as e:
        print(f'[Test] Error during test: {str(e)}')
    finally:
        # Cleanup
        if controller.is_connected:
            controller.close_browser()
            controller.disconnect()
        print('[Test] Cleanup completed')

if __name__ == '__main__':
    test_browser_use_task() 