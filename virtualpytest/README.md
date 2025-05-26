VirtualPyTest Framework
VirtualPyTest is a Python-based test automation framework for devices (e.g., Android, STB, Apple), using a model-data approach to minimize script duplication. It models the system under test (SUT) as a navigation tree, supports manual and auto-generated test cases, and handles functional, performance, endurance, and robustness tests. An orchestrator manages test campaigns, selecting navigation trees, controllers (e.g., Bluetooth, ADB, HDMI), and test cases. Verifications include appear/disappear for image/audio/video/text with AND/OR. Features include automatic test generation, optional data-driven prioritization, and separate reporting/logging.
Features

Navigation Tree: JSON-based model of SUT states (nodes) and actions/verifications (edges), supporting device variants.
Test Types: Functional (navigate, act, verify), performance (measure KPIs), endurance (repeat actions), robustness (stress/random tests).
Orchestrator: Configures campaigns, selecting trees, controllers, and test cases via JSON or CLI.
Controllers: Abstract RemoteController (Bluetooth, ADB, SSH, IR), AudioVideoController (HDMI, ADB, camera), VerificationController (image/audio/video/text).
Test Cases: Device-agnostic JSON, manual or auto-generated (validateAll, validateSpecificNodes, validateCommonPaths).
Prioritization: Optional, based on past execution or client metrics.
Reporting: JSON reports in outputs/reports/.
Logging: File and SQLite logs in outputs/logs/ and data/virtual_pytest.db.

Diagram
+-----------------+       +-----------------+
|   Test Case     |       |   Auto Test Gen |
| (JSON, Manual)  |       | - validateAll   |
+-----------------+       | - validateNodes |
          |              +-----------------+
          v                      |
+-----------------+       +-----------------+
|  Test Campaign  |       | Navigation Tree |
| (JSON)          |       | (JSON)          |
| - controllers   |       +-----------------+
| - tree          |              |
| - test cases    |              v
+-----------------+       +-----------------+
          |              | Data Prioritize |
          v              | (Optional)      |
+-----------------+      +-----------------+
|   Orchestrator  |              |
| - Load campaign |              v
| - Run tests     |<-------------+
+-----------------+       +-----------------+
          |              |    Controllers  |
          v              | - Remote        |
+-----------------+      | - AudioVideo    |
|   Interpreter   |----->| - Verification  |
| - Dispatch      |      +-----------------+
| - Execute       |              |
+-----------------+              v
          |              +-----------------+
          v              | Device (SUT)    |
+-----------------+      +-----------------+
|    Reporter     |
+-----------------+
          |
+-----------------+
|     Logger      |
+-----------------+

Folder Structure
virtual_pytest/
├── src/                    # Source code
│   ├── controllers/        # Remote, AudioVideo, Verification controllers
│   ├── models/            # NavigationTree model
│   ├── interpreter/       # Test execution logic
│   ├── auto_test/         # Auto test generation
│   ├── prioritization/    # Optional test prioritization
│   ├── test_scripts/      # Generic scripts (functional, performance, endurance, robustness)
│   ├── orchestrator/      # Campaign management
│   ├── reporting/         # Report generation
│   ├── logging/           # Logging system
│   └── utils/             # Database utilities
├── config/                # Configuration files
│   ├── navigation_trees/  # JSON navigation trees
│   ├── test_cases/        # JSON test cases
│   ├── campaigns/         # JSON campaign configs
│   └── client_data/       # Client prioritization data
├── outputs/               # Reports and logs
│   ├── reports/           # JSON reports
│   └── logs/              # Log files
├── data/                  # SQLite database
├── tests/                 # Unit tests
├── main.py                # Entry point
├── requirements.txt       # Dependencies
└── README.md              # This file

Setup

Clone Repository:git clone <repository_url>
cd virtual_pytest


Install Dependencies:pip install -r requirements.txt

Note: Includes python, sqlite3, logging, typing. Add pybluez, opencv-python, tesseract for real controllers.
Initialize Database:python -m src.utils.db_utils

Creates data/virtual_pytest.db.
Configure:
Add navigation trees to config/navigation_trees/.
Add test cases to config/test_cases/.
Add campaign configs to config/campaigns/.
(Optional) Add client data to config/client_data/priorities.json.



Usage

Run Campaign:python main.py --campaign config/campaigns/androidtv_video.json

Executes campaign, outputs reports to outputs/reports/ and logs to outputs/logs/ and data/virtual_pytest.db.
Interactive Mode (Future):python main.py --interactive

CLI to select tree, controllers, test cases (placeholder).
Enable Prioritization:Set "prioritize": true in campaign JSON. Requires data in data/virtual_pytest.db or config/client_data/.

Example Campaign
{
  "campaign_name": "AndroidTV_Video_Test",
  "navigation_tree": "config/navigation_trees/generic_device.json",
  "remote_controller": "AndroidTV",
  "audio_video_acquisition": "HDMI",
  "test_cases": [
    "config/test_cases/launch_video.json"
  ],
  "auto_tests": {
    "mode": "validateSpecificNodes",
    "nodes": ["VideoPlayer"]
  },
  "prioritize": true
}

Example Test Case
{
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

Extending Controllers

Replace placeholders (DummyRemoteController, DummyAudioVideoController, DummyVerificationController) with:
pybluez for Bluetooth (e.g., STB_EOS).
adb-shell for ADB (e.g., AndroidTV).
opencv-python, tesseract for HDMI/camera verifications.


Add new device subclasses in src/controllers/remote_controller.py.

Notes

Test cases are device-agnostic; controllers are specified in campaign JSON.
Placeholders print actions/verifications (e.g., "Performing press_button").
Auto-generation may produce many tests for large trees; configure limits.

Contributing

Add unit tests to tests/.
Submit pull requests with clear descriptions.

License
MIT License
