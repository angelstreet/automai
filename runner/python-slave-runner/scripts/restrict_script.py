import sys
import ast
from io import StringIO

def is_safe_node(node):
    # Allow basic nodes for print statements
    allowed_nodes = (
        ast.Module, ast.Expr, ast.Call, ast.Name, ast.Load,
        ast.Str, ast.Constant, ast.Num, ast.Str
    )
    return isinstance(node, allowed_nodes)

def execute_script(script):
    try:
        # Parse script to AST and validate
        tree = ast.parse(script)
        for node in ast.walk(tree):
            if not is_safe_node(node):
                return {"status": "error", "message": f"Unsafe construct: {type(node).__name__}"}

        # Redirect stdout to capture output
        stdout = StringIO()
        sys.stdout = stdout

        # Execute script in a restricted environment
        safe_globals = {"print": print}
        exec(script, safe_globals)

        # Restore stdout
        sys.stdout = sys.__stdout__

        # Get captured output
        output = stdout.getvalue()
        return {"status": "success", "output": output}
    except SyntaxError as e:
        return {"status": "error", "message": f"Syntax error: {str(e)}"}
    except Exception as e:
        return {"status": "error", "message": f"Execution error: {str(e)}"}