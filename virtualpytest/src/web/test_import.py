#!/usr/bin/env python3

import sys
import os

print("Current working directory:", os.getcwd())
print("Current file:", __file__)

# Calculate the path like in core_routes.py - should go to src directory
parent_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
print("Parent dir calculated (3 levels up):", parent_dir)

# Try going up only 2 levels to reach src
src_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
print("Src dir calculated (2 levels up):", src_dir)

# Add to path
sys.path.insert(0, src_dir)  # Insert at beginning to prioritize over local utils
print("Python path:", sys.path)

# Check if utils directory exists
utils_path = os.path.join(src_dir, 'utils')
print("Utils path:", utils_path)
print("Utils exists:", os.path.exists(utils_path))

# Check if supabase_utils.py exists
supabase_utils_path = os.path.join(utils_path, 'supabase_utils.py')
print("Supabase utils path:", supabase_utils_path)
print("Supabase utils exists:", os.path.exists(supabase_utils_path))

# Try the import
try:
    import utils
    print("Utils package imported successfully")
    print("Utils package path:", utils.__file__)
    
    import utils.supabase_utils
    print("Supabase utils module imported successfully")
    
    from utils.supabase_utils import get_supabase_client
    print("Import successful!")
except ImportError as e:
    print("Import failed:", e)
    import traceback
    traceback.print_exc() 