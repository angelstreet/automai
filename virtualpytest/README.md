# VirtualPyTest Framework

A modular, scalable test automation framework for device testing with MongoDB integration and flexible controller architecture.

## Features

- **Modular Architecture**: Separate controllers for remote control, audio/video acquisition, and verification
- **MongoDB Integration**: Store test cases, navigation trees, and results in MongoDB
- **Auto Test Generation**: Automatically generate tests from navigation trees
- **Test Prioritization**: Prioritize tests based on failure rates and client data
- **Flexible Verification**: Support for image, audio, video, and text verification
- **Comprehensive Reporting**: Generate detailed test reports and logs

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd virtualpytest
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Install the package:
```bash
pip install -e .
```

## Quick Start

### 1. Set up MongoDB
Ensure MongoDB is running and accessible. The framework will create the necessary collections automatically.

### 2. Run a Sample Campaign
```bash
python src/main.py --campaign config/campaigns/sample_campaign.json
```

### 3. List Available Test Cases
```bash
python src/main.py --list-test-cases
```

### 4. List Navigation Trees
```bash
python src/main.py --list-trees
```

### 5. Auto-generate Tests
```bash
python src/main.py --auto validateAll --tree-id generic_device_v1 --prioritize
```

## Usage Examples

### Running Specific Auto Tests
```bash
# Validate all paths in a navigation tree
python src/main.py --auto validateAll --tree-id generic_device_v1

# Validate specific nodes
python src/main.py --auto validateSpecificNodes --tree-id generic_device_v1 --nodes Home,VideoPlayer

# Validate common paths
python src/main.py --auto validateCommonPaths --tree-id generic_device_v1
```

### With Prioritization
```bash
python src/main.py --campaign config/campaigns/sample_campaign.json --prioritize
```

## Project Structure

```
virtualpytest/
├── src/
│   ├── controllers/          # Remote, AV, and verification controllers
│   ├── models/              # Data models (NavigationTree, etc.)
│   ├── test_scripts/       # Test script implementations
│   ├── utils/              # All utilities and core logic:
│   │   ├── auto_generator_utils.py  # Auto test generation
│   │   ├── db_utils.py             # Database operations
│   │   ├── interpreter_utils.py    # Test execution engine
│   │   ├── logger_utils.py         # Logging functionality
│   │   ├── orchestrator_utils.py   # Main orchestration logic
│   │   ├── prioritizer_utils.py    # Test prioritization
│   │   └── report_utils.py         # Report generation
│   └── main.py             # CLI entry point
├── config/
│   ├── navigation_trees/   # Navigation tree definitions
│   ├── test_cases/         # Test case definitions
│   ├── campaigns/          # Campaign configurations
│   └── client_data/        # Client-specific data
├── outputs/
│   ├── reports/            # Generated test reports
│   └── logs/               # Log files
└── tests/                  # Unit tests
```

## Configuration

### Navigation Trees
Define device navigation structures in `config/navigation_trees/`. See `generic_device.json` for an example.

### Test Cases
Define manual test cases in `config/test_cases/`. See `basic_navigation.json` for an example.

### Campaigns
Define test campaigns in `config/campaigns/`. See `sample_campaign.json` for an example.

### Client Priorities
Define node priorities in `config/client_data/priorities.json`.

## Extending the Framework

### Adding New Controllers
1. Implement the abstract base classes in `src/controllers/`
2. Register your controllers in the orchestrator
3. Update campaign configurations to use your controllers

### Adding New Test Types
1. Create a new test script in `src/test_scripts/`
2. Register it in the interpreter's test_scripts dictionary
3. Use the new test type in your test cases

### Adding New Verification Types
1. Extend the verification controller with new methods
2. Update the interpreter's verification dispatch logic
3. Use the new verification types in your navigation trees

## MongoDB Schema

The framework uses the following MongoDB collections:
- `test_cases`: Store test case definitions
- `trees`: Store navigation tree definitions
- `results`: Store test execution results
- `failure_rates`: Store node failure statistics
- `client_priorities`: Store client-defined priorities

## Contributing

1. Follow the existing code structure and patterns
2. Add unit tests for new functionality
3. Update documentation for new features
4. Ensure all imports use relative paths within the package

## License

MIT License - see LICENSE file for details.
