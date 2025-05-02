import sys
import ast
from io import StringIO

def is_safe_node(node):
    allowed_nodes = (
        ast.Module, ast.Expr, ast.Call, ast.Name, ast.Load,
        ast.Str, ast.Constant, ast.Num
    )
    return isinstance(node, allowed_nodes)

def execute_script(script):
    try:
        tree = ast.parse(script)
        for node in ast.walk(tree):
            if not is_safe_node(node):
                return {"status": "error", "message": f"Unsafe construct: {type(node).__name__}"}

        stdout = StringIO()
        sys.stdout = stdout
        safe_globals = {"print": print}
        exec(script, safe_globals)
        sys.stdout = sys.__stdout__
        output = stdout.getvalue()
        return {"status": "success", "output": output}
    except SyntaxError as e:
        return {"status": "error", "message": f"Syntax error: {str(e)}"}
    except Exception as e:
        return {"status": "error", "message": f"Execution error: {str(e)}"}