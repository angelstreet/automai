import argparse
from pymongo import MongoClient
from utils.orchestrator_utils import Orchestrator
from utils.db_utils import init_mongodb, get_test_case, get_tree

def main():
    parser = argparse.ArgumentParser(description='VirtualPyTest Framework')
    parser.add_argument('--campaign', help='Path to campaign JSON')
    parser.add_argument('--interactive', action='store_true', help='Interactive mode')
    parser.add_argument('--list-test-cases', action='store_true', help='List test cases')
    parser.add_argument('--list-trees', action='store_true', help='List navigation trees')
    parser.add_argument('--auto', help='Auto-test mode: validateAll, validateSpecificNodes, validateCommonPaths')
    parser.add_argument('--tree-id', help='Navigation tree ID')
    parser.add_argument('--nodes', help='Comma-separated node IDs for validateSpecificNodes')
    parser.add_argument('--prioritize', action='store_true', help='Enable prioritization')
    args = parser.parse_args()

    # Initialize MongoDB
    mongo_client = init_mongodb()
    
    # Initialize Orchestrator
    orchestrator = Orchestrator(mongo_client, 'outputs')

    if args.campaign:
        campaign = orchestrator.load_campaign(args.campaign)
        if args.prioritize:
            campaign['prioritize'] = True
        orchestrator.run_campaign(campaign)
    
    elif args.list_test_cases:
        db = mongo_client['virtual_pytest']
        for tc in db.test_cases.find():
            print(f"Test Case ID: {tc['test_id']}, Name: {tc['name']}")

    elif args.list_trees:
        db = mongo_client['virtual_pytest']
        for tree in db.trees.find():
            print(f"Tree ID: {tree['tree_id']}, Device: {tree['device']}")

    elif args.interactive:
        print("Interactive mode not implemented yet.")

    elif args.auto and args.tree_id:
        campaign = {
            'campaign_name': 'AutoTest',
            'navigation_tree_id': args.tree_id,
            'remote_controller': 'Dummy',
            'audio_video_acquisition': 'Dummy',
            'auto_tests': {'mode': args.auto}
        }
        if args.nodes:
            campaign['auto_tests']['nodes'] = args.nodes.split(',')
        if args.prioritize:
            campaign['prioritize'] = True
        orchestrator.run_campaign(campaign)

if __name__ == '__main__':
    main()