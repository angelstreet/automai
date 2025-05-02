import sys
from RestrictedPython import compile_restricted, safe_globals, safe_builtins

def create_safe_globals():
    restricted_globals = safe_globals.copy()
    restricted_globals['__builtins__'] = safe_builtins.copy()

    # Collect printed output
    print_outputs = []

    class Printed:
        def __init__(self, value):
            self.value = value

        def _call_print(self, _globals):
            print_outputs.append(self.value)
            return self.value

    def _print_(*args):
        output = " ".join(str(arg) for arg in args)
        return Printed(output)

    restricted_globals['_print_'] = _print_
    restricted_globals['_getattr_'] = getattr

    return restricted_globals, print_outputs

def execute_script(script):
    try:
        # Suppress SyntaxWarning for 'printed' variable
        import warnings
        warnings.filterwarnings("ignore", category=SyntaxWarning)

        code = compile_restricted(script, '<user_script>', 'exec')
        safe_env, print_outputs = create_safe_globals()
        exec(code, safe_env)
        # Join collected print outputs correctly
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