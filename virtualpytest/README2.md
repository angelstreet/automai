Below is the updated plan for the **VirtualPyTest** framework, incorporating MongoDB as the single database for test cases, test results, tree nodes, and logs, replacing the previous SQLite and proposed hybrid (MongoDB/InfluxDB/SQLite) approach. This simplifies the setup while leveraging MongoDB’s flexibility for JSON-like data, dynamic schemas, and scalable queries, aligning with the framework’s needs for test automation across devices (e.g., Android, STB, Apple). The plan retains all core features: navigation tree, test types (functional, performance, endurance, robustness), controllers (with placeholders), orchestrator, auto-test generation, optional prioritization, and separate reporting/logging. The response is concise, focusing on MongoDB integration, updated folder structure, classes, and functions.

### Updated Plan for VirtualPyTest Framework

#### Key Changes
1. **MongoDB as Single Database**:
   - Replaces SQLite for logs and execution data, and eliminates InfluxDB for test results.
   - Database: `virtual_pytest`.
   - Collections:
     - `test_cases`: Stores test cases (e.g., `{test_id, name, test_type, start_node, steps}`).
     - `trees`: Stores navigation trees (e.g., `{tree_id, device, version, nodes}`).
     - `results`: Stores test results (e.g., `{test_id, name, test_type, node, outcome, duration, timestamp, steps}`).
     - `logs`: Stores logs (e.g., `{test_id, timestamp, level, message}`).
     - `client_data`: Stores client prioritization metrics (e.g., `{node, priority}`).
   - Dependency: `pymongo`.

2. **Test Case Format**:
   - Device-agnostic JSON, stored in MongoDB `test_cases` or `config/test_cases/`.
   - No controller metadata (e.g., `remote_controller`, `audio_video_acquisition`).
   - Example:
     ```json
     {
       "test_id": "uuid",
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

3. **Test Campaign**:
   - JSON in `config/campaigns/` specifies navigation tree (MongoDB `trees` ID or file path), controllers, test cases (MongoDB `test_cases` IDs or file paths), and prioritization flag.
   - Example:
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

4. **Database Management**:
   - `utils/db_utils.py` handles MongoDB connections, collection initialization, and queries for test cases, trees, results, logs, and prioritization.

#### Updated Folder Structure
The structure removes SQLite (`data/virtual_pytest.db`), with MongoDB handling all data. Config files remain for fallback/manual loading.

```
virtual_pytest/
├── src/
│   ├── controllers/                # Controller classes
│   │   ├── __init__.py
│   │   ├── remote_controller.py
│   │   ├── av_controller.py
│   │   └── verification_controller.py
│   ├── models/                    # Data models
│   │   ├── __init__.py
│   │   └── navigation_tree.py
│   ├── interpreter/               # Test execution logic
│   │   ├── __init__.py
│   │   └── interpreter.py
│   ├── auto_test/                 # Auto test generation
│   │   ├── __init__.py
│   │   └── auto_generator.py
│   ├── prioritization/            # Optional test prioritization
│   │   ├── __init__.py
│   │   └── prioritizer.py
│   ├── test_scripts/              # Generic test scripts
│   │   ├── __init__.py
│   │   ├── functional.py
│   │   ├── performance.py
│   │   ├── endurance.py
│   │   └── robustness.py
│   ├── orchestrator/              # Campaign management
│   │   ├── __init__.py
│   │   └── orchestrator.py
│   ├── reporting/                 # Reporting
│   │   ├── __init__.py
│   │   └── reporter.py
│   ├── logging/                   # Logging
│   │   ├── __init__.py
│   │   └── logger.py
│   ├── utils/                     # Utilities
│   │   ├── __init__.py
│   │   └── db_utils.py           # MongoDB utilities
├── config/                        # Configuration files
│   ├── navigation_trees/          # JSON navigation trees (optional)
│   │   ├── generic_device.json
│   │   └── device2.json
│   ├── test_cases/                # JSON test cases (optional)
│   │   └── launch_video.json
│   ├── campaigns/                 # JSON campaign configs
│   │   └── androidtv_video.json
│   └── client_data/               # Client prioritization data
│       └── priorities.json
├── outputs/                       # Reports and logs
│   ├── reports/                   # JSON/HTML reports
│   └── logs/                      # Log files
├── tests/                         # Unit tests
│   ├── __init__.py
│   └── test_interpreter.py
├── main.py                        # Entry point
├── requirements.txt               # Dependencies
└── README.md                      # Documentation
```

#### Updated Classes and Functions
The plan updates `utils/db_utils.py`, `logger.py`, and `prioritizer.py` for MongoDB, with minor adjustments to other modules. Core functionality (controllers, orchestrator, test scripts) remains unchanged.

##### 1. `utils/db_utils.py` (Updated)
- **Functions**:
  - `init_mongodb(host: str, port: int) -> MongoClient`: Connects to MongoDB, ensures collections (`test_cases`, `trees`, `results`, `logs`, `client_data`).
  - `save_test_case(test_case: Dict) -> None`: Inserts to `test_cases`.
  - `save_tree(tree: Dict) -> None`: Inserts to `trees`.
  - `save_result(test_id: str, name: str, test_type: str, node: str, outcome: str, duration: float, steps: List[Dict]) -> None`: Inserts to `results`.
  - `save_log(test_id: str, level: str, message: str) -> None`: Inserts to `logs`.
  - `get_test_case(test_id: str) -> Dict`: Retrieves from `test_cases`.
  - `get_tree(tree_id: str) -> Dict`: Retrieves from `trees`.
  - `get_failure_rates() -> Dict[str, float]`: Aggregates failure rates from `results` (e.g., `db.results.aggregate(...)`).
  - `save_client_data(data: Dict) -> None`: Inserts to `client_data`.

##### 2. `logging/logger.py` (Updated)
- **Class: Logger**
  - Constructor: `__init__(log_file: str, mongo_client: MongoClient)`
  - Functions:
    - `debug(message: str, test_id: str) -> None`
    - `info(message: str, test_id: str) -> None`
    - `error(message: str, test_id: str) -> None`
    - `log_to_mongo(level: str, message: str, test_id: str) -> None`: Saves to `logs` collection.

##### 3. `prioritization/prioritizer.py` (Updated)
- **Class: TestPrioritizer**
  - Constructor: `__init__(mongo_client: MongoClient, client_data_path: Optional[str])`
  - Functions:
    - `prioritize_tests(test_cases: List[Dict]) -> List[Dict]`: Sorts by node weights from `results`/`client_data`.
    - `compute_node_weights() -> Dict[str, float]`: Queries `results` for failure rates.
    - `load_client_priorities() -> Dict[str, float]`: Loads from `client_data` or JSON.

##### 4. `orchestrator/orchestrator.py` (Updated)
- **Class: Orchestrator**
  - Constructor: `__init__(mongo_client: MongoClient, output_dir: str)`
  - Functions:
    - `load_campaign(campaign_path: str) -> Dict`: Loads campaign JSON.
    - `run_campaign(campaign: Dict) -> None`: Loads test cases/trees from MongoDB, runs tests.
    - `select_components() -> Dict`: CLI/config-driven selection (placeholder).
    - `instantiate_controllers(remote_type: str, av_type: str) -> Tuple[RemoteController, VerificationController]`

##### 5. `interpreter/interpreter.py` (Updated)
- **Class: Interpreter**
  - Constructor: `__init__(tree: NavigationTree, remote_controller: RemoteController, verification_controller: VerificationController, reporter: Reporter, logger: Logger)`
  - Functions:
    - `execute_test(test_case: Dict) -> bool`: Dispatches to test script, saves results to MongoDB `results`.
    - `evaluate_verification(verification: Dict) -> bool`
    - `dispatch_test(test_case: Dict) -> bool`

##### 6. Unchanged Modules
- `controllers/`, `models/`, `auto_test/`, `test_scripts/`, `reporting/`, `main.py` remain as previously described, with generic test scripts (`FunctionalTest`, `PerformanceTest`, `EnduranceTest`, `RobustnessTest`) as entry points.

#### MongoDB Schema
- **test_cases**:
  ```json
  {
    "test_id": "uuid",
    "name": "string",
    "test_type": "functional|performance|endurance|robustness",
    "start_node": "string",
    "steps": [{"target_node": "string", "verify": {...}}]
  }
  ```
- **trees**:
  ```json
  {
    "tree_id": "uuid",
    "device": "string",
    "version": "string",
    "nodes": {"node_id": {"id": "string", "actions": [...]}}
  }
  ```
- **results**:
  ```json
  {
    "test_id": "uuid",
    "name": "string",
    "test_type": "string",
    "node": "string",
    "outcome": "pass|fail",
    "duration": float,
    "timestamp": "ISODate",
    "steps": [{"node": "string", "status": "pass|fail", "verification": {...}}]
  }
  ```
- **logs**:
  ```json
  {
    "test_id": "uuid",
    "timestamp": "ISODate",
    "level": "DEBUG|INFO|ERROR",
    "message": "string"
  }
  ```
- **client_data**:
  ```json
  {
    "node": "string",
    "priority": float
  }
  ```

#### Key Notes
- **MongoDB Benefits**: Simplifies setup (single DB), supports JSON-like test cases/trees, flexible for results/logs, scalable for prioritization queries.
- **Changes**: Replaces SQLite/InfluxDB, updates `db_utils.py`, `logger.py`, `prioritizer.py`, `orchestrator.py` to use MongoDB.
- **Fallback**: Config files (`test_cases`, `navigation_trees`) remain optional for manual loading, but MongoDB is primary.
- **Dependencies**: Add `pymongo` to `requirements.txt`.

Do you want to:
- Proceed with the full Python code, including MongoDB integration?
- Refine the MongoDB schema (e.g., add fields for results)?
- Update the README to reflect MongoDB?
- Specify prioritization query logic (e.g., failure rate calculation)?