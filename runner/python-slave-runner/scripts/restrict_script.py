import sys
import ast
from io import StringIO
import os

def is_safe_node(node):
    allowed_nodes = (
        ast.Module, ast.Expr, ast.Call, ast.Name, ast.Load,
        ast.Str, ast.Constant, ast.Num
    )
    return isinstance(node, allowed_nodes)

def execute_script(script, venv_path=None):
    try:
        tree = ast.parse(script)
        for node in ast.walk(tree):
            if not is_safe_node(node):
                return {"status": "error", "message": f"Unsafe construct: {type(node).__name__}"}

        stdout = StringIO()
        sys.stdout = stdout

        # Use virtual environment's Python if provided
        if venv_path and os.path.exists(venv_path):
            # Update sys.path to include virtual environment's site-packages
            site_packages = os.path.join(venv_path, "lib", f"python{sys.version_info.major}.{sys.version_info.minor}", "site-packages")
            if os.path.exists(site_packages):
                sys.path.insert(0, site_packages)

        safe_globals = {"print": print}
        exec(script, safe_globals)

        sys.stdout = sys.__stdout__
        output = stdout.getvalue()
        return {"status": "success", "output": output}
    except SyntaxError as e:
        return {"status": "error", "message": f"Syntax error: {str(e)}"}
    except Exception as e:
        return {"status": "error", "message": f"Execution error: {str(e)}"}
    finally:
        # Clean up sys.path
        if venv_path and os.path.exists(venv_path) and site_packages in sys.path:
            sys.path.remove(site_packages)