"""
Web package for VirtualPyTest

This package contains the Flask web application and all its components.
This __init__.py sets up the necessary import paths for the entire web package.
"""

import sys
import os

# Get directory paths
current_dir = os.path.dirname(os.path.abspath(__file__))  # /src/web
src_dir = os.path.dirname(current_dir)                    # /src
parent_dir = os.path.dirname(src_dir)                     # /

print(f"[@web:__init__] Setting up web package import paths...")
print(f"[@web:__init__] Web dir: {current_dir}")
print(f"[@web:__init__] Src dir: {src_dir}")
print(f"[@web:__init__] Parent dir: {parent_dir}")

# Add paths to sys.path for the entire web package
paths_to_add = [
    os.path.join(current_dir, 'utils'),           # /src/web/utils
    os.path.join(current_dir, 'cache'),           # /src/web/cache
    os.path.join(current_dir, 'services'),        # /src/web/services
    os.path.join(src_dir, 'utils'),               # /src/utils  
    src_dir,                                      # /src
    os.path.join(parent_dir, 'controllers'),      # /controllers
]

for path in paths_to_add:
    if path not in sys.path:
        sys.path.insert(0, path)
        print(f"[@web:__init__] Added to sys.path: {path}")
    else:
        print(f"[@web:__init__] Already in sys.path: {path}")

print(f"[@web:__init__] Web package import paths setup completed") 