import sys
from pysandbox import Sandbox
from io import StringIO

def execute_script(script):
    try:
        # Create a sandbox
        sandbox = Sandbox()
        
        # Redirect stdout to capture output
        stdout = StringIO()
        sys.stdout = stdout
        
        # Execute the script in the sandbox
        sandbox.execute(script)
        
        # Restore stdout
        sys.stdout = sys.__stdout__
        
        # Get the captured output
        output = stdout.getvalue()
        return {"status": "success", "output": output}
    except Exception as e:
        return {"status": "error", "message": f"Execution error: {str(e)}"}

if __name__ == "__main__":
    script = sys.stdin.read()
    result = execute_script(script)
    print(result["status"])
    print(result["output"] if result["status"] == "success" else result["message"])