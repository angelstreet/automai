CLI Commands for main.py
The main.py script is the entry point for the VirtualPyTest framework, using argparse to handle command-line arguments. Below are the supported CLI commands:

Run a Campaign:
python main.py --campaign <path_to_campaign_json>


Description: Executes a test campaign specified by the JSON file (e.g., config/campaigns/androidtv_video.json).
Example: python main.py --campaign config/campaigns/androidtv_video.json
Behavior: Loads campaign, retrieves test cases/trees from MongoDB, runs tests via Orchestrator, saves results/logs.


Interactive Mode:
python main.py --interactive


Description: Launches an interactive CLI to select navigation tree, controllers, test cases, and auto-test modes.
Example: python main.py --interactive
Behavior: Prompts user to choose components, generates campaign JSON, executes via Orchestrator (placeholder).


List Test Cases:
python main.py --list-test-cases


Description: Lists all test cases in MongoDB test_cases collection.
Example: python main.py --list-test-cases
Behavior: Queries MongoDB, prints test case IDs and names.


List Navigation Trees:
python main.py --list-trees


Description: Lists all navigation trees in MongoDB trees collection.
Example: python main.py --list-trees
Behavior: Queries MongoDB, prints tree IDs and device names.


Run Auto Tests:
python main.py --auto <mode> --tree-id <tree_uuid> [--nodes <node1>,<node2>]


Description: Runs auto-generated tests for a navigation tree.
Options:
<mode>: validateAll, validateSpecificNodes, validateCommonPaths.
--nodes: Comma-separated node IDs (required for validateSpecificNodes).


Example: python main.py --auto validateSpecificNodes --tree-id tree_uuid --nodes VideoPlayer
Behavior: Generates test cases via AutoTestGenerator, executes via Orchestrator.


Enable Prioritization:
python main.py --campaign <path> --prioritize


Description: Runs campaign with data-driven prioritization.
Example: python main.py --campaign config/campaigns/androidtv_video.json --prioritize
Behavior: Applies TestPrioritizer to sort test cases by failure rates/client priorities.



Implementation Notes

Use argparse in main.py to parse commands.
Example:import argparse
def main():
    parser = argparse.ArgumentParser(description='VirtualPyTest Framework')
    parser.add_argument('--campaign', help='Path to campaign JSON')
    parser.add_argument('--interactive', action='store_true', help='Interactive mode')
    parser.add_argument('--list-test-cases', action='store_true', help='List test cases')
    parser.add_argument('--list-trees', action='store_true', help='List navigation trees')
    parser.add_argument('--auto', help='Auto-test mode')
    parser.add_argument('--tree-id', help='Navigation tree ID')
    parser.add_argument('--nodes', help='Comma-separated node IDs')
    parser.add_argument('--prioritize', action='store_true', help='Enable prioritization')
    args = parser.parse_args()
    # Handle commands


Integrate with Orchestrator to execute campaigns.
Query MongoDB via db_utils for listing commands.

