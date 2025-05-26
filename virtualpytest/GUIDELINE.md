Below is a concise step-by-step guide to implement the **VirtualPyTest** framework, updated to use MongoDB as the single database for test cases, test results, tree nodes, and logs, as per the revised plan. The guide focuses on practical implementation, covering setup, coding key components, and testing, while maintaining all core features: navigation tree, test types (functional, performance, endurance, robustness), controllers (with placeholders), orchestrator, auto-test generation, optional prioritization, and separate reporting/logging. Each step includes actions and expected outcomes, assuming a Python environment and basic familiarity with MongoDB.

### Step-by-Step Guide to Implement VirtualPyTest

#### Step 1: Set Up Project Structure
- **Actions**:
  - Create the folder structure:
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
    │   ├── logs/
    ├── tests/
    ├── main.py
    ├── requirements.txt
    ├── README.md
    ```
  - Create empty `__init__.py` files in each `src/` subdirectory.
  - Initialize `requirements.txt`:
    ```
    pymongo==4.8.0
    logging
    typing-extensions
    ```
  - Install MongoDB locally or use a cloud instance (e.g., MongoDB Atlas).
  - Start MongoDB: `mongod --dbpath <path_to_db_folder>`.
  - Install dependencies: `pip install -r requirements.txt`.
- **Outcome**: Project skeleton ready, MongoDB running, dependencies installed.

#### Step 2: Implement Database Utilities
- **Actions**:
  - Create `src/utils/db_utils.py`:
    - Initialize MongoDB client, create collections (`test_cases`, `trees`, `results`, `logs`, `client_data`).
    - Add functions to save/retrieve test cases, trees, results, logs, and compute failure rates.
  - Example functions:
    ```python
    from pymongo import MongoClient
    def init_mongodb(host='localhost', port=27017):
        client = MongoClient(host, port)
        db = client['virtual_pytest']
        for coll in ['test_cases', 'trees', 'results', 'logs', 'client_data']:
            db[coll].create_index('test_id', unique=True, sparse=True)
        return client
    def save_test_case(test_case: dict, client: MongoClient):
        db = client['virtual_pytest']
        db.test_cases.insert_one(test_case)
    ```
  - Test by running: `python -m src.utils.db_utils` to initialize MongoDB.
- **Outcome**: MongoDB database `virtual_pytest` created with collections, utility functions ready.

#### Step 3: Implement Navigation Tree Model
- **Actions**:
  - Create `src/models/navigation_tree.py`:
    - Define `NavigationTree` class to parse JSON trees, manage nodes/edges.
    - Add methods: `get_actions`, `find_action`, `get_all_nodes`, `get_subtree_nodes`.
  - Example:
    ```python
    class NavigationTree:
        def __init__(self, tree_data: dict):
            self.nodes = tree_data['nodes']
            self.device = tree_data.get('device')
            self.version = tree_data.get('version')
        def get_actions(self, node_id: str) -> list:
            return self.nodes.get(node_id, {}).get('actions', [])
    ```
  - Create sample tree in `config/navigation_trees/generic_device.json` (see previous responses).
  - Load tree into MongoDB `trees` collection using `db_utils.save_tree`.
- **Outcome**: Navigation tree model functional, sample tree stored in MongoDB.

#### Step 4: Implement Controllers with Placeholders
- **Actions**:
  - Create `src/controllers/remote_controller.py`:
    - Define abstract `RemoteController` with `perform_action`, `get_state`.
    - Implement `DummyRemoteController` with print statements (e.g., `print("Performing action: press_button")`).
    - Add placeholders for `AndroidPhone`, `STB_EOS`, etc.
  - Create `src/controllers/av_controller.py`:
    - Define abstract `AudioVideoController` with `capture_image`, `capture_audio`, `capture_video`, `capture_text`.
    - Implement `DummyAudioVideoController` with prints (e.g., `print("Capturing image")`).
  - Create `src/controllers/verification_controller.py`:
    - Define abstract `VerificationController` with `wait_for_X_appear/disappear` (X = image, audio, video, text).
    - Implement `DummyVerificationController` with prints (e.g., `print("Verifying image appear")`).
- **Outcome**: Placeholder controllers ready, simulating device interactions/verifications.

#### Step 5: Implement Generic Test Scripts
- **Actions**:
  - Create `src/test_scripts/functional.py`, `performance.py`, `endurance.py`, `robustness.py`:
    - Define classes (`FunctionalTest`, `PerformanceTest`, `EnduranceTest`, `RobustnessTest`).
    - Implement `execute` method for each:
      - Functional: Navigate steps, verify outcomes.
      - Performance: Measure timing for steps/KPIs.
      - Endurance: Repeat steps N times.
      - Robustness: Random/stress actions.
  - Example:
    ```python
    class FunctionalTest:
        def __init__(self, interpreter):
            self.interpreter = interpreter
        def execute(self, test_case: dict) -> bool:
            print(f"Executing functional test: {test_case['name']}")
            return self.interpreter.execute_test(test_case)
    ```
- **Outcome**: Test scripts ready as entry points for test types.

#### Step 6: Implement Interpreter
- **Actions**:
  - Create `src/interpreter/interpreter.py`:
    - Define `Interpreter` class to parse test cases, dispatch to scripts, handle verifications (`AND`/`OR`).
    - Save results to MongoDB `results` via `db_utils.save_result`.
  - Example:
    ```python
    class Interpreter:
        def __init__(self, tree, remote_controller, verification_controller, reporter, logger):
            self.tree = tree
            self.remote_controller = remote_controller
            self.verification_controller = verification_controller
            self.reporter = reporter
            self.logger = logger
        def execute_test(self, test_case: dict) -> bool:
            self.logger.info(f"Starting test: {test_case['name']}", test_case['test_id'])
            return self.dispatch_test(test_case)
    ```
  - Test with sample test case from `config/test_cases/launch_video.json`.
- **Outcome**: Interpreter executes test cases, dispatches to scripts, logs results.

#### Step 7: Implement Auto Test Generation
- **Actions**:
  - Create `src/auto_test/auto_generator.py`:
    - Define `AutoTestGenerator` with `validate_all`, `validate_specific_nodes`, `validate_common_paths`.
    - Generate JSON test cases, save to MongoDB `test_cases`.
  - Example:
    ```python
    class AutoTestGenerator:
        def __init__(self, tree):
            self.tree = tree
        def validate_all(self) -> list:
            print("Generating tests for all nodes")
            return [{"test_id": "uuid", "name": "AutoTest", "test_type": "functional", ...}]
    ```
- **Outcome**: Auto-generated test cases created, stored in MongoDB.

#### Step 8: Implement Orchestrator
- **Actions**:
  - Create `src/orchestrator/orchestrator.py`:
    - Define `Orchestrator` to load campaigns, instantiate controllers, run tests via `Interpreter`.
    - Load test cases/trees from MongoDB.
  - Example:
    ```python
    class Orchestrator:
        def __init__(self, mongo_client, output_dir):
            self.mongo_client = mongo_client
            self.output_dir = output_dir
        def run_campaign(self, campaign: dict):
            print(f"Running campaign: {campaign['campaign_name']}")
            # Load and execute tests
    ```
  - Create sample campaign in `config/campaigns/androidtv_video.json`.
- **Outcome**: Orchestrator runs campaigns, integrating components.

#### Step 9: Implement Reporting and Logging
- **Actions**:
  - Create `src/reporting/reporter.py`:
    - Define `Reporter` to generate JSON reports in `outputs/reports/`.
  - Create `src/logging/logger.py`:
    - Define `Logger` to save logs to `outputs/logs/` and MongoDB `logs`.
  - Example:
    ```python
    class Reporter:
        def generate_report(self, test_case, status, duration, steps):
            print(f"Generating report for {test_case['name']}")
    class Logger:
        def info(self, message, test_id):
            print(f"Logging: {message}")
    ```
- **Outcome**: Reports and logs generated, stored in files/MongoDB.

#### Step 10: Implement Prioritization
- **Actions**:
  - Create `src/prioritization/prioritizer.py`:
    - Define `TestPrioritizer` to sort test cases by failure rates (MongoDB `results`) or client priorities (`client_data`).
  - Example:
    ```python
    class TestPrioritizer:
        def prioritize_tests(self, test_cases):
            print("Prioritizing tests")
            return test_cases
    ```
- **Outcome**: Optional prioritization functional, using MongoDB queries.

#### Step 11: Finalize Entry Point
- **Actions**:
  - Create `main.py`:
    - Parse CLI args, initialize `Orchestrator`, run campaign.
  - Example:
    ```python
    def main():
        print("Starting VirtualPyTest")
        # Run orchestrator
    ```
- **Outcome**: Framework executable via `python main.py --campaign config/campaigns/androidtv_video.json`.

#### Step 12: Test and Extend
- **Actions**:
  - Write unit tests in `tests/test_interpreter.py`.
  - Run sample campaign, verify reports/logs in `outputs/` and MongoDB.
  - Replace placeholder controllers with real implementations (e.g., `pybluez` for Bluetooth).
- **Outcome**: Framework functional, ready for extension.

### Key Notes
- **MongoDB**: Simplifies data management (single DB), supports JSON, scalable for prioritization.
- **Placeholders**: Controllers print actions/verifications, replaceable with real logic.
- **Testing**: Start with small test cases, verify MongoDB storage, then scale.
- **Dependencies**: `pymongo` required, add `pybluez`, `opencv-python` later.

Do you want to:
- Start coding specific modules (e.g., `db_utils.py`)?
- Define detailed MongoDB schemas?
- Update the README with MongoDB setup?
- Specify CLI commands for `main.py`?