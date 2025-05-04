import sys
import ast
from io import StringIO
import os
import builtins

def is_safe_node(node):
    # Expanded list of allowed AST nodes for common Python constructs
    allowed_nodes = (
        # Core structure
        ast.Module, ast.Expr, ast.Call, ast.Name, ast.Load, ast.Store, ast.Assign,
        ast.FunctionDef, ast.If, ast.Return, ast.Pass, ast.AnnAssign,
        ast.arguments, ast.arg,  # Added for argparse support
        ast.Try, ast.ExceptHandler,  # Added for try/except support
        ast.AugAssign, ast.Raise, ast.Assert, ast.Delete,  # Common operations
        ast.Global, ast.Nonlocal,  # Variable scope declarations
        ast.Yield, ast.YieldFrom, ast.Lambda,  # Advanced function constructs
        ast.IfExp, ast.Starred, ast.NamedExpr,  # Modern Python features
        ast.keyword,  # Added for keyword arguments support
        # Literals and constants
        ast.Str, ast.Constant, ast.Num, ast.List, ast.Dict, ast.Tuple, ast.Set,
        # Control flow
        ast.For, ast.While, ast.Break, ast.Continue,
        # Comparisons and operations
        ast.Compare, ast.Eq, ast.NotEq, ast.Lt, ast.LtE, ast.Gt, ast.GtE, ast.In, ast.NotIn,
        ast.BinOp, ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Mod, ast.Pow,
        ast.UnaryOp, ast.USub, ast.Not,
        # Imports
        ast.Import, ast.ImportFrom, ast.alias,
        # String formatting
        ast.JoinedStr, ast.FormattedValue,
        # Attribute access and indexing
        ast.Attribute, ast.Subscript, ast.Slice,
        # Comprehensions
        ast.ListComp, ast.DictComp, ast.SetComp, ast.GeneratorExp,
        # Boolean operations
        ast.BoolOp, ast.And, ast.Or,
        # Context management
        ast.With, ast.withitem
    )
    return isinstance(node, allowed_nodes)

def execute_script(script, parameters=None, venv_path=None):
    site_packages = None
    original_argv = sys.argv  # Initialize before try block
    original_stdout = sys.stdout
    try:
        # Parse and validate AST
        tree = ast.parse(script)
        for node in ast.walk(tree):
            if not is_safe_node(node):
                return {"status": "error", "message": f"Disallowed construct: {type(node).__name__}"}

        # Capture stdout
        stdout = StringIO()
        sys.stdout = stdout

        # Set up virtual environment if provided
        if venv_path and os.path.exists(venv_path):
            site_packages = os.path.join(venv_path, "lib", f"python{sys.version_info.major}.{sys.version_info.minor}", "site-packages")
            if os.path.exists(site_packages):
                sys.path.insert(0, site_packages)

        # Set sys.argv for parameters
        sys.argv = ["script.py"] + (parameters or [])

        # Curated safe built-ins
        safe_builtins = {
            'abs': abs, 'all': all, 'any': any, 'bool': bool, 'chr': chr,
            'dict': dict, 'enumerate': enumerate, 'float': float, 'format': format,
            'int': int, 'isinstance': isinstance, 'len': len, 'list': list,
            'map': map, 'max': max, 'min': min, 'ord': ord, 'print': print,
            'range': range, 'reversed': reversed, 'round': round, 'set': set,
            'slice': slice, 'sorted': sorted, 'str': str, 'sum': sum, 'tuple': tuple,
            'type': type, 'zip': zip
        }

        # Flexible globals namespace
        import subprocess
        import json
        import platform
        import argparse
        safe_globals = {
            "__builtins__": safe_builtins,
            "sys": sys,
            "__name__": "__main__",  # Support if __name__ == "__main__":
            "subprocess": subprocess,  # Pre-imported for modem_test.py
            "json": json,  # Pre-imported for modem_test.py
            "platform": platform,  # Pre-imported for modem_test.py
            "argparse": argparse  # Pre-imported for modem_test.py
        }
        print("DEBUG: safe_globals keys available: ", list(safe_globals.keys()))

        # Execute the script
        exec(script, safe_globals)

        sys.stdout = original_stdout
        sys.argv = original_argv
        output = stdout.getvalue()
        return {"status": "success", "output": output}
    except SyntaxError as e:
        return {"status": "error", "message": f"Syntax error: {str(e)}"}
    except ImportError as e:
        return {"status": "error", "message": f"Module import error: {str(e)}"}
    except SystemExit:
        return {"status": "success", "output": stdout.getvalue()}  # Handle exit() gracefully
    except Exception as e:
        return {"status": "error", "message": f"Execution error: {str(e)}"}
    finally:
        sys.stdout = original_stdout
        sys.argv = original_argv
        if site_packages and site_packages in sys.path:
            sys.path.remove(site_packages)