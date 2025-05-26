import time
from typing import Dict

class PerformanceTest:
    def __init__(self, interpreter):
        self.interpreter = interpreter

    def execute(self, test_case: Dict) -> bool:
        """Execute a performance test case, measuring KPIs."""
        self.interpreter.logger.info(f"Executing performance test: {test_case['name']}", test_case['test_id'])
        current_node = test_case.get('start_node')
        
        for step in test_case.get('steps', []):
            start_time = time.time()
            target_node = step.get('target_node')
            action_data = self.interpreter.tree.find_action(current_node, target_node)
            
            if not action_data:
                self.interpreter.logger.error(f"No action from {current_node} to {target_node}", test_case['test_id'])
                return False
                
            # Perform action
            self.interpreter.remote_controller.perform_action(
                action_data.get('action'), action_data.get('params', {})
            )
            
            # Verify and measure time
            verification = step.get('verify')
            if verification and not self.interpreter.evaluate_verification(verification):
                self.interpreter.logger.error(f"Verification failed for step to {target_node}", test_case['test_id'])
                return False
                
            duration = time.time() - start_time
            self.interpreter.logger.info(f"Step to {target_node} took {duration:.2f}s", test_case['test_id'])
            
            current_node = target_node
        
        return True