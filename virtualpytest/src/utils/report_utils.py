import json
import os
from typing import Dict, List
from datetime import datetime

class Reporter:
    def __init__(self, output_dir: str):
        self.output_dir = os.path.join(output_dir, 'reports')
        os.makedirs(self.output_dir, exist_ok=True)

    def generate_report(self, test_case: Dict, status: str, duration: float, steps: List[Dict]) -> None:
        """Generate a JSON report for a test case."""
        report = {
            'test_id': test_case['test_id'],
            'name': test_case['name'],
            'test_type': test_case['test_type'],
            'status': status,
            'duration': duration,
            'timestamp': datetime.utcnow().isoformat(),
            'steps': steps
        }
        report_path = os.path.join(self.output_dir, f"report_{test_case['test_id']}.json")
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)

    def format_report(self, test_case: Dict, status: str, duration: float, steps: List[Dict]) -> Dict:
        """Format report data (placeholder for future extensions)."""
        return {
            'test_id': test_case['test_id'],
            'name': test_case['name'],
            'status': status,
            'duration': duration,
            'steps': steps
        }