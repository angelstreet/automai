# python-runner/app.py
from flask import Flask, request, jsonify
import subprocess
import time
from datetime import datetime

app = Flask(__name__)

@app.route('/execute', methods=['POST'])
def execute_script():
    try:
        data = request.get_json()
        script_path = data.get('script_path')
        if not script_path:
            return jsonify({"status": "error", "message": "No script_path provided"}), 400

        # Record start time
        start_time = datetime.utcnow()
        start_time_str = start_time.isoformat() + 'Z'

        # Run the script
        script_content = open(script_path, 'r').read()
        result = subprocess.run(
            ['python3', 'scripts/restrict_script.py'],
            input=script_content,
            text=True,
            capture_output=True,
            timeout=5  # 5-second timeout
        )

        # Record end time
        end_time = datetime.utcnow()
        end_time_str = end_time.isoformat() + 'Z'

        # Parse output
        stdout_lines = result.stdout.strip().split('\n')
        status = stdout_lines[0]
        output = '\n'.join(stdout_lines[1:]) if len(stdout_lines) > 1 else ''
        stderr = result.stderr

        # Calculate duration in seconds
        duration = (end_time - start_time).total_seconds()

        return jsonify({
            "status": status,
            "output": {"stdout": output, "stderr": stderr},
            "start_time": start_time_str,
            "end_time": end_time_str,
            "duration_seconds": duration
        })
    except FileNotFoundError as e:
        end_time = datetime.utcnow()
        return jsonify({
            "status": "error",
            "message": f"Script not found: {str(e)}",
            "start_time": datetime.utcnow().isoformat() + 'Z',
            "end_time": end_time.isoformat() + 'Z',
            "duration_seconds": (end_time - datetime.utcnow()).total_seconds()
        }), 400
    except subprocess.TimeoutExpired:
        end_time = datetime.utcnow()
        return jsonify({
            "status": "error",
            "message": "Script execution timed out",
            "start_time": datetime.utcnow().isoformat() + 'Z',
            "end_time": end_time.isoformat() + 'Z',
            "duration_seconds": (end_time - datetime.utcnow()).total_seconds()
        }), 408
    except Exception as e:
        end_time = datetime.utcnow()
        return jsonify({
            "status": "error",
            "message": f"Execution error: {str(e)}",
            "start_time": datetime.utcnow().isoformat() + 'Z',
            "end_time": end_time.isoformat() + 'Z',
            "duration_seconds": (end_time - datetime.utcnow()).total_seconds()
        }), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)  # Render default port