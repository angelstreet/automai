from flask import Flask, request, jsonify
from datetime import datetime
from restrict_script import execute_script
import os
import timeout_decorator

app = Flask(__name__)

@app.route('/execute', methods=['POST'])
def execute():
    try:
        data = request.get_json()
        script_path = data.get('script_path')
        if not script_path:
            return jsonify({
                "status": "error",
                "message": "No script_path provided",
                "start_time": datetime.utcnow().isoformat() + 'Z',
                "end_time": datetime.utcnow().isoformat() + 'Z',
                "duration_seconds": 0
            }), 400

        # Verify script path
        if not os.path.exists(script_path):
            return jsonify({
                "status": "error",
                "message": f"Script not found: {script_path}",
                "start_time": datetime.utcnow().isoformat() + 'Z',
                "end_time": datetime.utcnow().isoformat() + 'Z',
                "duration_seconds": 0
            }), 400

        # Record start time
        start_time = datetime.utcnow()
        start_time_str = start_time.isoformat() + 'Z'

        # Read and execute the script with a timeout
        with open(script_path, 'r') as f:
            script_content = f.read()

        @timeout_decorator.timeout(5)  # 5-second timeout
        def run_script():
            return execute_script(script_content)

        result = run_script()

        # Record end time
        end_time = datetime.utcnow()
        end_time_str = end_time.isoformat() + 'Z'
        duration = (end_time - start_time).total_seconds()

        # Format response
        return jsonify({
            "status": result["status"],
            "output": {
                "stdout": result.get("output", ""),
                "stderr": result.get("message", "") if result["status"] == "error" else ""
            },
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
    except timeout_decorator.TimeoutError:
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