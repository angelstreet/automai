import sys
import ast
from io import StringIO
import os

def is_safe_node(node):
    allowed_nodes = (
        ast.Module, ast.Expr, ast.Call, ast.Name, ast.Load,
        ast.Str, ast.Constant, ast.Num, ast.Import, ast.ImportFrom, ast.alias,
        ast.JoinedStr, ast.FormattedValue, ast.Attribute, ast.Subscript
    )
    return isinstance(node, allowed_nodes)

def execute_script(script, parameters=None, venv_path=None):
    site_packages = None
    try:
        tree = ast.parse(script)
        for node in ast.walk(tree):
            if not is_safe_node(node):
                return {"status": "error", "message": f"Unsafe construct: {type(node).__name__}"}

        stdout = StringIO()
        sys.stdout = stdout

        if venv_path and os.path.exists(venv_path):
            site_packages = os.path.join(venv_path, "lib", f"python{sys.version_info.major}.{sys.version_info.minor}", "site-packages")
            if os.path.exists(site_packages):
                sys.path.insert(0, site_packages)

        # Set sys.argv for parameters
        original_argv = sys.argv
        sys.argv = [script_path or "script.py"] + (parameters or [])

        safe_globals = {"print": print, "sys": sys}
        exec(script, safe_globals)

        sys.stdout = sys.__stdout__
        sys.argv = original_argv
        output = stdout.getvalue()
        return {"status": "success", "output": output}
    except SyntaxError as e:
        return {"status": "error", "message": f"Syntax error: {str(e)}"}
    except Exception as e:
        return {"status": "error", "message": f"Execution error: {str(e)}"}
    finally:
        sys.argv = original_argv
        if site_packages and site_packages in sys.path:
            sys.path.remove(site_packages)