from flask import Flask, request, jsonify
import subprocess

app = Flask(__name__)

@app.route('/execute', methods=['POST'])
def execute_script():
    try:
        data = request.get_json()
        script_path = data.get('script_path')
        if not script_path:
            return jsonify({"status": "error", "message": "No script_path provided"}), 400

        # Run restrict_script.py with the script content
        script_content = open(script_path, 'r').read()
        result = subprocess.run(
            ['python3', 'scripts/restrict_script.py'],
            input=script_content,
            text=True,
            capture_output=True,
            timeout=5  # 5-second timeout
        )

        # Parse output
        stdout_lines = result.stdout.strip().split('\n')
        status = stdout_lines[0]
        output = '\n'.join(stdout_lines[1:]) if len(stdout_lines) > 1 else ''
        stderr = result.stderr

        return jsonify({
            "status": status,
            "output": {"stdout": output, "stderr": stderr}
        })
    except FileNotFoundError as e:
        return jsonify({"status": "error", "message": f"Script not found: {str(e)}"}), 400
    except subprocess.TimeoutExpired:
        return jsonify({"status": "error", "message": "Script execution timed out"}), 408
    except Exception as e:
        return jsonify({"status": "error", "message": f"Execution error: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)  # Render default port