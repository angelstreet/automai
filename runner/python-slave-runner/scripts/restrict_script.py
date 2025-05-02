import sys
from RestrictedPython import compile_restricted, safe_globals, safe_builtins

def create_safe_globals():
    restricted_globals = safe_globals.copy()
    restricted_globals['__builtins__'] = safe_builtins.copy()

    # Collect printed output
    print_outputs = []

    def _print_(*args):
        output = " ".join(str(arg) for arg in args)
        print_outputs.append(output)
        return output  # Optional: Return for compatibility with RestrictedPython

    restricted_globals['_print_'] = _print_
    restricted_globals['_getattr_'] = getattr

    return restricted_globals, print_outputs

def execute_script(script):
    try:
        code = compile_restricted(script, '<user_script>', 'exec')
        safe_env, print_outputs = create_safe_globals()
        exec(code, safe_env)
        # Join collected print outputs
        output = "\n".join(print_outputs) + ("\n" if print_outputs else "")
        return {"status": "success", "output": output}
    except SyntaxError as e:
        return {"status": "error", "message": f"Syntax error: {str(e)}"}
    except Exception as e:
        return {"status": "error", "message": f"Execution error: {str(e)}"}

if __name__ == "__main__":
    script = sys.stdin.read()
    result = execute_script(script)
    print(result["status"])
    print(result["output"] if result["status"] == "success" else result["message"])