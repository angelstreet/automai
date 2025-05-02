# scripts/restrict_script.py
import sys
import io
from contextlib import redirect_stdout
from RestrictedPython import compile_restricted, safe_globals, utility_builtins

def create_safe_globals():
    restricted_globals = safe_globals.copy()
    restricted_globals.update(utility_builtins)
    restricted_globals['__builtins__'] = utility_builtins
    return restricted_globals

def execute_script(script):
    try:
        code = compile_restricted(script, '<user_script>', 'exec')
        safe_env = create_safe_globals()
        output = io.StringIO()
        with redirect_stdout(output):
            exec(code, safe_env, {})
        return {"status": "success", "output": output.getvalue()}
    except SyntaxError as e:
        return {"status": "error", "message": f"Syntax error: {str(e)}"}
    except Exception as e:
        return {"status": "error", "message": f"Execution error: {str(e)}"}

if __name__ == "__main__":
    # Read script from stdin
    script = sys.stdin.read()
    result = execute_script(script)
    print(result["status"])
    print(result["output"] if result["status"] == "success" else result["message"])