import json
from typing import Dict, List, Optional
from pymongo import MongoClient
from .db_utils import get_failure_rates, get_client_priorities

class TestPrioritizer:
    def __init__(self, mongo_client: MongoClient, client_data_path: Optional[str] = None):
        self.mongo_client = mongo_client
        self.client_data_path = client_data_path

    def prioritize_tests(self, test_cases: List[Dict]) -> List[Dict]:
        """Sort test cases by priority based on failure rates and client data."""
        failure_rates = get_failure_rates(self.mongo_client)
        client_priorities = self.load_client_priorities()
        
        def get_priority(test_case: Dict) -> float:
            priority = 0.0
            for step in test_case.get('steps', []):
                node = step.get('target_node')
                priority += failure_rates.get(node, 0.0) * 0.5
                priority += client_priorities.get(node, 0.0) * 0.5
            return priority
        
        return sorted(test_cases, key=get_priority, reverse=True)

    def load_client_priorities(self) -> Dict[str, float]:
        """Load client priorities from MongoDB or JSON file."""
        priorities = get_client_priorities(self.mongo_client)
        if self.client_data_path:
            try:
                with open(self.client_data_path, 'r') as f:
                    data = json.load(f)
                    for item in data:
                        priorities[item['node']] = item.get('priority', 0.0)
            except FileNotFoundError:
                pass
        return priorities