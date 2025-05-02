from flask import Flask, request, jsonify
from datetime import datetime
from scripts.restrict_script import execute_script
import os
import threading
import queue

app = Flask(__name__)

def run_with_timeout(script_content, timeout=30):
    result_queue = queue.Queue()

    def target():
        try:
            result = execute_script(script_content)
            result_queue.put(result)
        except Exception as e:
            result_queue.put({"status": "error", "message": f"Execution error: {str(e)}"})

    thread = threading.Thread(target=target)
    thread.daemon = True
    thread.start()
    thread.join(timeout)

    if thread.is_alive():
        return {"status": "error", "message": "Script execution timed out"}
    try:
        return result_queue.get_nowait()
    except queue.Empty:
        return {"status": "error", "message": "No result returned"}

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

        if not os.path.exists(script_path):
            return jsonify({
                "status": "error",
                "message": f"Script not found: {script_path}",
                "start_time": datetime.utcnow().isoformat() + 'Z',
                "end_time": datetime.utcnow().isoformat() + 'Z',
                "duration_seconds": 0
            }), 400

        # Get timeout from payload, default to 30s, cap at 60s
        timeout = data.get('timeout', 30)
        try:
            timeout = float(timeout)
            if timeout < 1:
                timeout = 30
            elif timeout > 60:
                timeout = 60
        except (TypeError, ValueError):
            timeout = 30

        start_time = datetime.utcnow()
        start_time_str = start_time.isoformat() + 'Z'

        with open(script_path, 'r') as f:
            script_content = f.read()

        result = run_with_timeout(script_content, timeout)

        end_time = datetime.utcnow()
        end_time_str = end_time.isoformat() + 'Z'
        duration = (end_time - start_time).total_seconds()

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
            "duration_seconds": 0
        }), 400
    except Exception as e:
        end_time = datetime.utcnow()
        return jsonify({
            "status": "error",
            "message": f"Execution error: {str(e)}",
            "start_time": datetime.utcnow().isoformat() + 'Z',
            "end_time": end_time.isoformat() + 'Z',
            "duration_seconds": 0
        }), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)