#!/usr/bin/env python3
"""
Git Diagnostic Script

This script helps diagnose git repository issues on both server and host sides.
"""

import os
import subprocess
import sys

def run_command(cmd, cwd=None):
    """Run a command and return the result."""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=cwd)
        return result.returncode == 0, result.stdout.strip(), result.stderr.strip()
    except Exception as e:
        return False, "", str(e)

def find_git_repository_root(start_path=None):
    """Find git repository root by walking up the directory tree."""
    if start_path is None:
        start_path = os.getcwd()
    
    current_path = os.path.abspath(start_path)
    
    while current_path != os.path.dirname(current_path):  # Stop at filesystem root
        git_dir = os.path.join(current_path, '.git')
        if os.path.exists(git_dir):
            return current_path
        current_path = os.path.dirname(current_path)
    
    return None

def test_relative_path_approach():
    """Test the relative path approach used in the code."""
    print(f"\n=== Testing Relative Path Approach ===")
    current_dir = os.getcwd()
    print(f"Current directory: {current_dir}")
    
    # Test the approach used in the code
    relative_paths = [
        "../../../",  # Up 3 levels (main approach)
        "../../",     # Up 2 levels
        "../../../../", # Up 4 levels  
        "../"         # Up 1 level
    ]
    
    for rel_path in relative_paths:
        test_path = os.path.abspath(os.path.join(current_dir, rel_path))
        git_dir = os.path.join(test_path, '.git')
        exists = os.path.exists(git_dir)
        print(f"  {rel_path:12} -> {test_path} {'✅' if exists else '❌'}")
    
    # Test the dynamic approach
    found_root = find_git_repository_root()
    if found_root:
        print(f"  Dynamic search -> {found_root} ✅")
    else:
        print(f"  Dynamic search -> Not found ❌")

def check_git_repo(path, name):
    """Check git repository status at given path."""
    print(f"\n=== {name} ===")
    print(f"Path: {path}")
    
    if not os.path.exists(path):
        print(f"❌ Path does not exist: {path}")
        return
    
    if not os.path.isdir(path):
        print(f"❌ Path is not a directory: {path}")
        return
    
    # Check if it's a git repository
    git_dir = os.path.join(path, '.git')
    if not os.path.exists(git_dir):
        print(f"❌ Not a git repository (no .git directory)")
        return
    
    print(f"✅ Git repository found")
    
    # Check git status
    success, stdout, stderr = run_command("git status --porcelain", cwd=path)
    if success:
        if stdout:
            print(f"📝 Uncommitted changes:")
            for line in stdout.split('\n'):
                print(f"   {line}")
        else:
            print(f"✅ Working directory clean")
    else:
        print(f"❌ Git status failed: {stderr}")
    
    # Check current branch
    success, stdout, stderr = run_command("git branch --show-current", cwd=path)
    if success:
        print(f"🌿 Current branch: {stdout}")
    else:
        print(f"❌ Failed to get current branch: {stderr}")
    
    # Check remote origin
    success, stdout, stderr = run_command("git remote -v", cwd=path)
    if success:
        if stdout:
            print(f"🔗 Remote origins:")
            for line in stdout.split('\n'):
                print(f"   {line}")
        else:
            print(f"⚠️  No remote origins configured")
    else:
        print(f"❌ Failed to get remotes: {stderr}")
    
    # Check if we can fetch from origin
    success, stdout, stderr = run_command("git fetch --dry-run", cwd=path)
    if success:
        print(f"✅ Can fetch from remote")
    else:
        print(f"❌ Cannot fetch from remote: {stderr}")
    
    # Check recent commits
    success, stdout, stderr = run_command("git log --oneline -5", cwd=path)
    if success:
        print(f"📚 Recent commits:")
        for line in stdout.split('\n'):
            if line.strip():
                print(f"   {line}")
    else:
        print(f"❌ Failed to get commit history: {stderr}")

def main():
    print("Git Repository Diagnostic Tool")
    print("=" * 50)
    
    # Test the relative path approach first
    test_relative_path_approach()
    
    # Current working directory (should be server side)
    current_dir = os.getcwd()
    check_git_repo(current_dir, "SERVER - Current Working Directory")
    
    # Test the dynamic git root finding
    git_root = find_git_repository_root()
    if git_root:
        check_git_repo(git_root, "SERVER - Dynamic Git Root")
    
    # Check if we're running on the host (Raspberry Pi)
    hostname_success, hostname, _ = run_command("hostname")
    if hostname_success and "sunri-pi1" in hostname:
        print(f"\n🍓 Running on Raspberry Pi host: {hostname}")
        
        # Host paths to check
        host_paths = [
            "/home/sunri-pi1/automai/virtualpytest/src",
            "/home/sunri-pi1/automai/virtualpytest/src/web",
            "/home/sunri-pi1/automai",
            "/var/www/html"
        ]
        
        for path in host_paths:
            check_git_repo(path, f"HOST - {path}")
    else:
        print(f"\n💻 Running on server/local machine: {hostname}")
    
    # Check GitPython availability
    print(f"\n=== GitPython Availability ===")
    try:
        import git
        print(f"✅ GitPython is available")
        
        # Try to open git root as repo
        if git_root:
            try:
                repo = git.Repo(git_root)
                print(f"✅ GitPython can open git root as repo")
                print(f"   Active branch: {repo.active_branch}")
                print(f"   Remote URLs: {[remote.url for remote in repo.remotes]}")
            except Exception as e:
                print(f"❌ GitPython cannot open git root as repo: {e}")
        else:
            print(f"❌ No git root found to test GitPython")
            
    except ImportError:
        print(f"❌ GitPython is not available")
    
    print(f"\n=== Environment Info ===")
    print(f"Current working directory: {current_dir}")
    print(f"Git repository root: {git_root}")
    print(f"Python executable: {sys.executable}")
    print(f"Python version: {sys.version}")

if __name__ == "__main__":
    main() 