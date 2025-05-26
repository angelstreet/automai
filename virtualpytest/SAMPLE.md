I'll provide the requested components for the **VirtualPyTest** framework: the `db_utils.py` module, detailed MongoDB schemas, an updated README with MongoDB setup, and CLI commands for `main.py`. These align with the updated plan using MongoDB as the single database for test cases, test results, tree nodes, and logs, maintaining all core features: navigation tree, test types (functional, performance, endurance, robustness), controllers (with placeholders), orchestrator, auto-test generation, optional prioritization, and separate reporting/logging. The response is concise, with artifacts wrapped appropriately.

### 1. Coding `db_utils.py`
This module handles MongoDB connections, collection initialization, and CRUD operations for test cases, trees, results, logs, and client data.

```python
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
```

### 2. Detailed MongoDB Schemas
The schemas define the structure for each MongoDB collection in the `virtual_pytest` database, ensuring consistency for test cases, trees, results, logs, and client data.

```json
{
  "database": "virtual_pytest",
  "collections": [
    {
      "name": "test_cases",
      "description": "Stores device-agnostic test cases",
      "schema": {
        "test_id": "string (UUID, unique)",
        "name": "string",
        "test_type": "string (functional|performance|endurance|robustness)",
        "start_node": "string",
        "steps": [
          {
            "target_node": "string",
            "verify": {
              "type": "string (single|compound)",
              "operator": "string (AND|OR, optional)",
              "conditions": [
                {
                  "type": "string (image_appear|image_disappear|audio_appear|audio_disappear|video_appear|video_disappear|text_appear|text_disappear)",
                  "condition": "string",
                  "timeout": "float"
                }
              ]
            }
          }
        ],
        "created_at": "string (ISO date)"
      },
      "indexes": [
        {"key": "test_id", "unique": true}
      ]
    },
    {
      "name": "trees",
      "description": "Stores navigation trees",
      "schema": {
        "tree_id": "string (UUID, unique)",
        "device": "string",
        "version": "string",
        "nodes": {
          "<node_id>": {
            "id": "string",
            "actions": [
              {
                "to": "string",
                "action": "string",
                "params": {"<key>": "any"},
                "verification": {
                  "type": "string (single|compound)",
                  "operator": "string (AND|OR, optional)",
                  "conditions": [
                    {
                      "type": "string (image_appear|image_disappear|...)",
                      "condition": "string",
                      "timeout": "float"
                    }
                  ]
                }
              }
            ]
          }
        },
        "created_at": "string (ISO date)"
      },
      "indexes": [
        {"key": "tree_id", "unique": true}
      ]
    },
    {
      "name": "results",
      "description": "Stores test execution results",
      "schema": {
        "test_id": "string (UUID)",
        "name": "string",
        "test_type": "string",
        "node": "string",
        "outcome": "string (pass|fail)",
        "duration": "float",
        "timestamp": "string (ISO date)",
        "steps": [
          {
            "node": "string",
            "status": "string (pass|fail)",
            "verification": {
              "type": "string",
              "operator": "string (optional)",
              "conditions": [
                {
                  "type": "string",
                  "condition": "string",
                  "timeout": "float",
                  "result": "boolean"
                }
              ]
            }
          }
        ]
      },
      "indexes": [
        {"key": "test_id", "unique": false}
      ]
    },
    {
      "name": "logs",
      "description": "Stores execution logs",
      "schema": {
        "test_id": "string (UUID)",
        "timestamp": "string (ISO date)",
        "level": "string (DEBUG|INFO|ERROR)",
        "message": "string"
      },
      "indexes": [
        {"key": "test_id"}
      ]
    },
    {
      "name": "client_data",
      "description": "Stores client prioritization metrics",
      "schema": {
        "node": "string (unique)",
        "priority": "float",
        "created_at": "string (ISO date)"
      },
      "indexes": [
        {"key": "node", "unique": true}
      ]
    }
  ]
}
```

### 3. Updated README with MongoDB Setup
The README is updated to include MongoDB setup instructions, reflecting the single database approach.


# VirtualPyTest Framework

VirtualPyTest is a Python-based test automation framework for devices (e.g., Android, STB, Apple), using a model-data approach to minimize script duplication. It models the system under test as a navigation tree, supports manual and auto-generated test cases, and handles functional, performance, endurance, and robustness tests. An orchestrator manages test campaigns, selecting trees, controllers, and test cases. Verifications support `appear`/`disappear` for image/audio/video/text with `AND`/`OR`. Features include MongoDB storage, auto test generation, optional prioritization, and separate reporting/logging.

## Features
- **Navigation Tree**: JSON-based, nodes for states, supports device variants.
- **Test Types**: Functional, performance, endurance, robustness.
- **Orchestrator**: Configures campaigns via JSON/CLI.
- **Controllers**: `RemoteController` (Bluetooth, ADB, etc.), `AudioVideoController` (HDMI, etc.), `VerificationController`.
- **Test Cases**: Device-agnostic JSON, stored in MongoDB or files.
- **Prioritization**: Optional, data-driven via MongoDB.
- **Reporting**: JSON in `outputs/reports/`.
- **Logging**: Files and MongoDB in `outputs/logs/`.

## Diagram
```
+-----------------+      +-------------------------------+
|   Test Case     |      | Auto Test Gen                 |
| (JSON, MongoDB) |      +-------------------------------+
+-----------------+------+                               |
          |              |                               v
+-----------------+      +-------------------------------+
|  Test Campaign  |                           NavigationTree
| (JSON)         |                           | (MongoDB, JSON)|
+-------------------+                           |
| v                                         v
  +-----------------+      +-----------------+
  | Orchestrator  |                           | Data-Driven     |
  |               |<--------------------------+ Prioritization  |
  +-----------------+      +-----------------+
          |                           |
          v                           v
+-----------------+      +-----------------+
|   Interpreter   |----->|    Controllers  |
|                |      +-----------------+
+-----------------+              |
          |                      v
+-----------------+      +-----------------+
|    Reporter     |      | Device (SUT)    |
+-----------------+      +-----------------+
          |
+-----------------+
|     Logger      |
+-----------------+
```

## Folder Structure
```
virtual_pytest/
├── src/
│   ├── controllers/
│   ├── models/
│   ├── interpreter/
│   ├── auto_test/
│   ├── prioritization/
│   ├── test_scripts/
│   ├── orchestrator/
│   ├── reporting/
│   ├── logging/
│   ├── utils/
├── config/
│   ├── navigation_trees/
│   ├── test_cases/
│   ├── campaigns/
│   ├── client_data/
├── outputs/
│   ├── reports/
│   └── logs/
├── tests/
├── main.py
├── requirements.txt
└── README.md
```

## Setup
1. **Clone Repository**:
   ```bash
   git clone <repository_url>
   cd virtual_pytest
   ```
2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
   Includes: `pymongo`, `logging`, `typing`. Add `pybluez`, `opencv-python`, `tesseract` for real controllers.
3. **Install MongoDB**:
   - Follow [MongoDB installation guide](https://www.mongodb.com/docs/manual/installation/).
   - Start MongoDB: `mongod --dbpath <path_to_db_folder>` or use MongoDB Atlas.
4. **Initialize MongoDB**:
   ```bash
   python -m src.utils.db_utils
   ```
   Creates `virtual_pytest` database with collections: `test_cases`, `trees`, `results`, `logs`, `client_data`.
5. **Configure**:
   - Add navigation trees to MongoDB `trees` or `config/navigation_trees/`.
   - Add test cases to MongoDB `test_cases` or `config/test_cases/`.
   - Add campaign configs to `config/campaigns/`.
   - (Optional) Add client data to MongoDB `client_data` or `config/client_data/priorities.json`.

## Usage
1. **Run Campaign**:
   ```bash
   python main.py --campaign config/campaigns/androidtv_video.json
   ```
   Executes campaign, outputs reports to `outputs/reports/` and logs to `outputs/logs/` and MongoDB.
2. **Run Interactive Mode**:
   ```bash
   python main.py --interactive
   ```
   CLI to select components (placeholder).
3. **Enable Prioritization**:
   Set `"prioritize": true` in campaign JSON.
4. **List Test Cases**:
   ```bash
   python main.py --list-test-cases
   ```
   Lists test cases from MongoDB.
5. **List Navigation Trees**:
   ```bash
   python main.py --list-trees
   ```
   Lists trees from MongoDB.

## Example Campaign
```json
{
  "campaign_name": "AndroidTV_Video_Test",
  "navigation_tree_id": "tree_uuid",
  "remote_controller": "AndroidTV",
  "audio_video_acquisition": "HDMI",
  "test_case_ids": ["test_uuid1"],
  "auto_tests": {
    "mode": "validateSpecificNodes",
    "nodes": ["VideoPlayer"]
  },
  "prioritize": true
}
```

## Example Test Case
```json
{
  "test_id": "test_uuid1",
  "name": "Launch Video",
  "test_type": "functional",
  "start_node": "Home",
  "steps": [
    {
      "target_node": "VideoPlayer",
      "verify": {
        "type": "compound",
        "operator": "AND",
        "conditions": [
          {"type": "image_appear", "condition": "video_app_icon", "timeout": 5},
          {"type": "text_appear", "condition": "Video App", "timeout": 5}
        ]
      }
    }
  ]
}
```

## Extending Controllers
- Replace placeholders (`DummyRemoteController`, etc.) with:
  - `pybluez` for Bluetooth.
  - `adb-shell` for ADB.
  - `opencv-python`, `tesseract` for verifications.
- Add device subclasses in `src/controllers/remote_controller.py`.

## Notes
- Test cases are device-agnostic; controllers are in campaign JSON.
- Placeholders print actions/verifications.
- Auto-generation may produce many tests; configure limits.

## Contributing
- Add tests to `tests/`.
- Submit pull requests.

## License
MIT License


### 4. CLI Commands for `main.py`
The CLI commands for `main.py` enable users to run campaigns, interact with components, and query MongoDB. Below is a specification of the commands, to be implemented in `main.py`.


# CLI Commands for main.py

The `main.py` script is the entry point for the VirtualPyTest framework, using `argparse` to handle command-line arguments. Below are the supported CLI commands:

1. **Run a Campaign**:
   ```bash
   python main.py --campaign <path_to_campaign_json>
   ```
   - Description: Executes a test campaign specified by the JSON file (e.g., `config/campaigns/androidtv_video.json`).
   - Example: `python main.py --campaign config/campaigns/androidtv_video.json`
   - Behavior: Loads campaign, retrieves test cases/trees from MongoDB, runs tests via Orchestrator, saves results/logs.

2. **Interactive Mode**:
   ```bash
   python main.py --interactive
   ```
   - Description: Launches an interactive CLI to select navigation tree, controllers, test cases, and auto-test modes.
   - Example: `python main.py --interactive`
   - Behavior: Prompts user to choose components, generates campaign JSON, executes via Orchestrator (placeholder).

3. **List Test Cases**:
   ```bash
   python main.py --list-test-cases
   ```
   - Description: Lists all test cases in MongoDB `test_cases` collection.
   - Example: `python main.py --list-test-cases`
   - Behavior: Queries MongoDB, prints test case IDs and names.

4. **List Navigation Trees**:
   ```bash
   python main.py --list-trees
   ```
   - Description: Lists all navigation trees in MongoDB `trees` collection.
   - Example: `python main.py --list-trees`
   - Behavior: Queries MongoDB, prints tree IDs and device names.

5. **Run Auto Tests**:
   ```bash
   python main.py --auto <mode> --tree-id <tree_uuid> [--nodes <node1>,<node2>]
   ```
   - Description: Runs auto-generated tests for a navigation tree.
   - Options:
     - `<mode>`: `validateAll`, `validateSpecificNodes`, `validateCommonPaths`.
     - `--nodes`: Comma-separated node IDs (required for `validateSpecificNodes`).
   - Example: `python main.py --auto validateSpecificNodes --tree-id tree_uuid --nodes VideoPlayer`
   - Behavior: Generates test cases via `AutoTestGenerator`, executes via Orchestrator.

6. **Enable Prioritization**:
   ```bash
   python main.py --campaign <path> --prioritize
   ```
   - Description: Runs campaign with data-driven prioritization.
   - Example: `python main.py --campaign config/campaigns/androidtv_video.json --prioritize`
   - Behavior: Applies `TestPrioritizer` to sort test cases by failure rates/client priorities.

## Implementation Notes
- Use `argparse` in `main.py` to parse commands.
- Example:
  ```python
  import argparse
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
  ```
- Integrate with `Orchestrator` to execute campaigns.
- Query MongoDB via `db_utils` for listing commands.


### Key Notes
- **`db_utils.py`**: Provides MongoDB operations, tested via `python -m src.utils.db_utils`.
- **MongoDB Schemas**: Define flexible structures for JSON-like data, supporting test types and verifications.
- **README**: Updated with MongoDB setup, includes latest diagram and CLI usage.
- **CLI Commands**: Enable flexible execution, listing, and auto-testing, implemented in `main.py`.
- **Next Steps**: Implement remaining modules (e.g., `orchestrator.py`, `interpreter.py`) or test `db_utils.py`.

Do you want to:
- Code additional modules (e.g., `orchestrator.py`)?
- Test `db_utils.py` with sample data?
- Refine CLI commands or MongoDB schemas?
- Add more README details (e.g., example outputs)?