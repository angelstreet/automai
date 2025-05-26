from typing import Dict

class EnduranceTest:
    def __init__(self, interpreter):
        self.interpreter = interpreter

    def execute(self, test_case: Dict) -> bool:
        """Execute an endurance test case, repeating steps."""
        self.interpreter.logger.info(f"Executing endurance test: {test_case['name']}", test_case['test_id'])
        repeat_count = test_case.get('repeat', 10)
        
        for i in range(repeat_count):
            self.interpreter.logger.info(f"Iteration {i+1}/{repeat_count}", test_case['test_id'])
            current_node = test_case.get('start_node')
            
            for step in test_case.get('steps', []):
                target_node = step.get('target_node')
                action_data = self.interpreter.tree.find_action(current_node, target_node)
                
                if not action_data:
                    self.interpreter.logger.error(f"No action from {current_node} to {target_node}", test_case['test_id'])
                    return False
                    
                self.interpreter.remote_controller.perform_action(
                    action_data.get('action'), action_data.get('params', {})
                )
                
                verification = step.get('verify')
                if verification and not self.interpreter.evaluate_verification(verification):
                    self.interpreter.logger.error(f"Verification failed at iteration {i+1}", test_case['test_id'])
                    return False
                    
                current_node = target_node
        
        return True