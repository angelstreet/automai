from typing import Dict, List
import time
from models.navigation_tree import NavigationTree
from controllers.remote_controller import RemoteController
from controllers.verification_controller import VerificationController
from .report_utils import Reporter
from .logger_utils import Logger
from test_scripts.functional import FunctionalTest
from test_scripts.performance import PerformanceTest
from test_scripts.endurance import EnduranceTest
from test_scripts.robustness import RobustnessTest

class Interpreter:
    def __init__(self, tree: NavigationTree, remote_controller: RemoteController, 
                 verification_controller: VerificationController, reporter: Reporter, logger: Logger):
        self.tree = tree
        self.remote_controller = remote_controller
        self.verification_controller = verification_controller
        self.reporter = reporter
        self.logger = logger
        self.test_scripts = {
            'functional': FunctionalTest(self),
            'performance': PerformanceTest(self),
            'endurance': EnduranceTest(self),
            'robustness': RobustnessTest(self)
        }

    def execute_test(self, test_case: Dict) -> bool:
        """Execute a test case and return result."""
        start_time = time.time()
        self.logger.info(f"Starting test: {test_case['name']}", test_case['test_id'])
        
        result = self.dispatch_test(test_case)
        
        duration = time.time() - start_time
        steps = test_case.get('steps', [])
        self.reporter.generate_report(test_case, 'pass' if result else 'fail', duration, steps)
        
        from .db_utils import save_result
        save_result(
            test_case['test_id'], test_case['name'], test_case['test_type'],
            test_case.get('start_node'), 'pass' if result else 'fail', duration, steps, self.logger.mongo_client
        )
        
        return result

    def dispatch_test(self, test_case: Dict) -> bool:
        """Dispatch test to appropriate script based on test_type."""
        test_type = test_case.get('test_type')
        script = self.test_scripts.get(test_type)
        if not script:
            self.logger.error(f"Unknown test type: {test_type}", test_case['test_id'])
            return False
        return script.execute(test_case)

    def evaluate_verification(self, verification: Dict) -> bool:
        """Evaluate single or compound verification."""
        if verification.get('type') == 'compound':
            operator = verification.get('operator')
            conditions = verification.get('conditions', [])
            results = [self._verify_condition(c) for c in conditions]
            return all(results) if operator == 'AND' else any(results)
        return self._verify_condition(verification)

    def _verify_condition(self, condition: Dict) -> bool:
        """Verify a single condition."""
        verify_type = condition.get('type')
        verify_condition = condition.get('condition')
        timeout = condition.get('timeout', 5.0)
        
        verify_methods = {
            'image_appear': self.verification_controller.wait_for_image_appear,
            'image_disappear': self.verification_controller.wait_for_image_disappear,
            'audio_appear': self.verification_controller.wait_for_audio_appear,
            'audio_disappear': self.verification_controller.wait_for_audio_disappear,
            'video_appear': self.verification_controller.wait_for_video_appear,
            'video_disappear': self.verification_controller.wait_for_video_disappear,
            'text_appear': self.verification_controller.wait_for_text_appear,
            'text_disappear': self.verification_controller.wait_for_text_disappear
        }
        
        method = verify_methods.get(verify_type)
        if not method:
            self.logger.error(f"Unknown verification type: {verify_type}", "")
            return False
            
        return method(verify_condition, timeout)