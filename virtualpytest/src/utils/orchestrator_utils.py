import json
from typing import Dict, Tuple
from pymongo import MongoClient
from .interpreter_utils import Interpreter
from models.navigation_tree import NavigationTree
from controllers.remote_controller import RemoteController, DummyRemoteController
from controllers.av_controller import AudioVideoController, DummyAudioVideoController
from controllers.verification_controller import VerificationController, DummyVerificationController
from .report_utils import Reporter
from .logger_utils import Logger
from .prioritizer_utils import TestPrioritizer
from .db_utils import get_test_case, get_tree

class Orchestrator:
    def __init__(self, mongo_client: MongoClient, output_dir: str):
        self.mongo_client = mongo_client
        self.output_dir = output_dir
        self.reporter = Reporter(output_dir)
        self.logger = Logger(f"{output_dir}/logs/virtual_pytest.log", mongo_client)

    def load_campaign(self, campaign_path: str) -> Dict:
        """Load campaign JSON from file."""
        with open(campaign_path, 'r') as f:
            return json.load(f)

    def instantiate_controllers(self, remote_type: str, av_type: str) -> Tuple[RemoteController, VerificationController]:
        """Instantiate controllers based on campaign metadata."""
        # Placeholder: Only Dummy controllers for now
        remote_controller = DummyRemoteController()
        av_controller = DummyAudioVideoController()
        verification_controller = DummyVerificationController(av_controller)
        return remote_controller, verification_controller

    def run_campaign(self, campaign: Dict) -> None:
        """Execute a test campaign."""
        self.logger.info(f"Starting campaign: {campaign['campaign_name']}", "campaign_init")
        
        # Load navigation tree
        tree_id = campaign.get('navigation_tree_id')
        tree_data = get_tree(tree_id, self.mongo_client) or json.load(open(campaign.get('navigation_tree')))
        tree = NavigationTree(tree_data)

        # Instantiate controllers
        remote_controller, verification_controller = self.instantiate_controllers(
            campaign.get('remote_controller'), campaign.get('audio_video_acquisition')
        )

        # Initialize interpreter
        interpreter = Interpreter(tree, remote_controller, verification_controller, self.reporter, self.logger)

        # Load test cases
        test_cases = []
        for test_id in campaign.get('test_case_ids', []):
            test_case = get_test_case(test_id, self.mongo_client)
            if test_case:
                test_cases.append(test_case)

        # Auto-generate tests if specified
        auto_tests = campaign.get('auto_tests', {})
        if auto_tests:
            from .auto_generator_utils import AutoTestGenerator
            generator = AutoTestGenerator(tree)
            mode = auto_tests.get('mode')
            if mode == 'validateAll':
                test_cases.extend(generator.validate_all())
            elif mode == 'validateSpecificNodes':
                test_cases.extend(generator.validate_specific_nodes(auto_tests.get('nodes', [])))
            elif mode == 'validateCommonPaths':
                test_cases.extend(generator.validate_common_paths())

        # Apply prioritization if enabled
        if campaign.get('prioritize', False):
            prioritizer = TestPrioritizer(self.mongo_client, campaign.get('client_data_path'))
            test_cases = prioritizer.prioritize_tests(test_cases)

        # Execute tests
        for test_case in test_cases:
            interpreter.execute_test(test_case)