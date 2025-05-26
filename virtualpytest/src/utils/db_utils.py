from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError
from typing import Dict, List, Optional
from datetime import datetime
from uuid import uuid4

def init_mongodb(host: str = 'localhost', port: int = 27017) -> MongoClient:
    """Initialize MongoDB client and create collections with indexes."""
    client = MongoClient(host, port)
    db = client['virtual_pytest']
    collections = ['test_cases', 'trees', 'results', 'logs', 'client_data']
    for coll in collections:
        db[coll].create_index('test_id', unique=True, sparse=True)
        if coll == 'trees':
            db[coll].create_index('tree_id', unique=True, sparse=True)
        elif coll == 'client_data':
            db[coll].create_index('node', unique=True, sparse=True)
    return client

def save_test_case(test_case: Dict, client: MongoClient) -> None:
    """Save test case to MongoDB test_cases collection."""
    test_case['test_id'] = test_case.get('test_id', str(uuid4()))
    test_case['created_at'] = datetime.utcnow().isoformat()
    db = client['virtual_pytest']
    try:
        db.test_cases.insert_one(test_case)
    except DuplicateKeyError:
        db.test_cases.update_one({'test_id': test_case['test_id']}, {'$set': test_case})

def save_tree(tree: Dict, client: MongoClient) -> None:
    """Save navigation tree to MongoDB trees collection."""
    tree['tree_id'] = tree.get('tree_id', str(uuid4()))
    tree['created_at'] = datetime.utcnow().isoformat()
    db = client['virtual_pytest']
    try:
        db.trees.insert_one(tree)
    except DuplicateKeyError:
        db.trees.update_one({'tree_id': tree['tree_id']}, {'$set': tree})

def save_result(test_id: str, name: str, test_type: str, node: str, outcome: str, duration: float, steps: List[Dict], client: MongoClient) -> None:
    """Save test result to MongoDB results collection."""
    result = {
        'test_id': test_id,
        'name': name,
        'test_type': test_type,
        'node': node,
        'outcome': outcome,
        'duration': duration,
        'timestamp': datetime.utcnow().isoformat(),
        'steps': steps
    }
    db = client['virtual_pytest']
    db.results.insert_one(result)

def save_log(test_id: str, level: str, message: str, client: MongoClient) -> None:
    """Save log entry to MongoDB logs collection."""
    log = {
        'test_id': test_id,
        'timestamp': datetime.utcnow().isoformat(),
        'level': level,
        'message': message
    }
    db = client['virtual_pytest']
    db.logs.insert_one(log)

def get_test_case(test_id: str, client: MongoClient) -> Optional[Dict]:
    """Retrieve test case by test_id from MongoDB."""
    db = client['virtual_pytest']
    return db.test_cases.find_one({'test_id': test_id})

def get_tree(tree_id: str, client: MongoClient) -> Optional[Dict]:
    """Retrieve navigation tree by tree_id from MongoDB."""
    db = client['virtual_pytest']
    return db.trees.find_one({'tree_id': tree_id})

def get_failure_rates(client: MongoClient) -> Dict[str, float]:
    """Compute failure rates per node from MongoDB results."""
    db = client['virtual_pytest']
    pipeline = [
        {'$group': {
            '_id': '$node',
            'total': {'$sum': 1},
            'failures': {'$sum': {'$cond': [{'$eq': ['$outcome', 'fail']}, 1, 0]}}
        }},
        {'$project': {
            'failure_rate': {'$divide': ['$failures', '$total']}
        }}
    ]
    rates = {}
    for doc in db.results.aggregate(pipeline):
        rates[doc['_id']] = doc['failure_rate']
    return rates

def save_client_data(data: Dict, client: MongoClient) -> None:
    """Save client prioritization data to MongoDB client_data collection."""
    data['created_at'] = datetime.utcnow().isoformat()
    db = client['virtual_pytest']
    try:
        db.client_data.insert_one(data)
    except DuplicateKeyError:
        db.client_data.update_one({'node': data['node']}, {'$set': data})

def get_client_priorities(client: MongoClient) -> Dict[str, float]:
    """Retrieve client priorities from MongoDB client_data."""
    db = client['virtual_pytest']
    priorities = {}
    for doc in db.client_data.find():
        priorities[doc['node']] = doc.get('priority', 0.0)
    return priorities