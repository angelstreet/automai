# python-runner/scripts/restrict_script.py
import sys
from RestrictedPython import compile_restricted, safe_globals, utility_builtins
from RestrictedPython.PrintCollector import PrintCollector

def create_safe_globals():
    restricted_globals = safe_globals.copy()
    restricted_globals.update(utility_builtins)
    restricted_globals['__builtins__'] = utility_builtins

    # Create a PrintCollector instance
    print_collector = PrintCollector(_inplace=True)

    # Wrap PrintCollector to handle RestrictedPython's print calls
    def _print_wrapper(*args, **kwargs):
        return print_collector(*args, **kwargs)

    restricted_globals['_print_'] = _print_wrapper
    restricted_globals['_getattr_'] = getattr  # Required for some RestrictedPython internals

    return restricted_globals, print_collector

def execute_script(script):
    try:
        code = compile_restricted(script, '<user_script>', 'exec')
        safe_env, print_collector = create_safe_globals()
        exec(code, safe_env)
        # Retrieve output from PrintCollector
        output = print_collector.text()
        return {"status": "success", "output": output}
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