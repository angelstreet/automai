"""
Navigation Git Manager

Handles git operations for navigation config files.
Reuses existing git patterns from host routes for consistency.
"""

import os
import subprocess
from typing import Dict, Any, Optional

def commit_and_push_navigation_config(commit_message: str = "Update navigation config") -> bool:
    """
    Commit and push navigation config changes to git
    
    Args:
        commit_message: Commit message for the changes
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        print(f"[@utils:navigationGitManager:commit_and_push_navigation_config] Committing and pushing changes: {commit_message}")
        
        # Store original directory
        original_cwd = os.getcwd()
        
        # Change to the parent directory for git operations
        os.chdir('..')
        
        # Git add all navigation config files
        add_result = subprocess.run(['git', 'add', 'config/navigation/'], check=True, capture_output=True, text=True)
        print(f"[@utils:navigationGitManager:commit_and_push_navigation_config] Git add completed")
        
        # Git commit with message
        commit_result = subprocess.run(['git', 'commit', '-m', commit_message], check=True, capture_output=True, text=True)
        print(f"[@utils:navigationGitManager:commit_and_push_navigation_config] Git commit completed")
        
        # Git push with authentication
        github_token = os.getenv('GITHUB_TOKEN')
        if github_token:
            # Set up environment for git push with token authentication
            env = os.environ.copy()
            env['GIT_ASKPASS'] = 'echo'  # Prevent interactive prompts
            env['GIT_USERNAME'] = github_token  # Use token as username
            env['GIT_PASSWORD'] = ''  # Empty password when using token
            
            # Alternative approach: Use token in the push URL
            # Get the current remote URL
            remote_result = subprocess.run(['git', 'remote', 'get-url', 'origin'], 
                                         check=True, capture_output=True, text=True)
            remote_url = remote_result.stdout.strip()
            
            # If it's an HTTPS URL, inject the token
            if remote_url.startswith('https://github.com/'):
                # Format: https://token@github.com/user/repo.git
                authenticated_url = remote_url.replace('https://github.com/', f'https://{github_token}@github.com/')
                push_result = subprocess.run(['git', 'push', authenticated_url, 'HEAD'], 
                                           check=True, capture_output=True, text=True, env=env)
            else:
                # Fallback to regular push
                push_result = subprocess.run(['git', 'push'], 
                                           check=True, capture_output=True, text=True, env=env)
            
            print(f"[@utils:navigationGitManager:commit_and_push_navigation_config] Git push completed successfully")
        else:
            print(f"[@utils:navigationGitManager:commit_and_push_navigation_config] Warning: GITHUB_TOKEN not set, skipping push")
        
        # Return to original directory
        os.chdir(original_cwd)
        
        return True
        
    except subprocess.CalledProcessError as git_error:
        # Ensure we return to original directory on error
        try:
            os.chdir(original_cwd)
        except:
            pass
            
        print(f"[@utils:navigationGitManager:commit_and_push_navigation_config] Git operation failed: {str(git_error)}")
        return False
        
    except Exception as e:
        # Ensure we return to original directory on error
        try:
            os.chdir(original_cwd)
        except:
            pass
            
        print(f"[@utils:navigationGitManager:commit_and_push_navigation_config] Error: {str(e)}")
        return False


def perform_navigation_git_operations(tree_name: str, operation_type: str = "save") -> Dict[str, Any]:
    """
    Perform git operations for navigation config files
    
    Args:
        tree_name: The navigation tree name that was modified
        operation_type: Type of operation (save, delete, etc.)
        
    Returns:
        dict: Result of git operations with success status and details
    """
    try:
        print(f"[@utils:navigationGitManager:perform_navigation_git_operations] Starting git operations for tree: {tree_name}")
        
        # Store original directory
        original_cwd = os.getcwd()
        
        # Change to the parent directory for git operations (same pattern as host routes)
        os.chdir('..')
        
        print(f"[@utils:navigationGitManager:perform_navigation_git_operations] Performing git operations...")
        
        # Git pull to get latest changes
        pull_result = subprocess.run(['git', 'pull'], check=True, capture_output=True, text=True)
        print(f"[@utils:navigationGitManager:perform_navigation_git_operations] Git pull completed")
        
        # Git add the navigation config file
        config_file_path = f'config/navigation/{tree_name}.json'
        add_result = subprocess.run(['git', 'add', config_file_path], check=True, capture_output=True, text=True)
        print(f"[@utils:navigationGitManager:perform_navigation_git_operations] Git add completed for: {config_file_path}")
        
        # Git commit with descriptive message
        if operation_type == "save":
            commit_message = f'Update navigation tree: {tree_name}'
        elif operation_type == "delete":
            commit_message = f'Delete navigation tree: {tree_name}'
        else:
            commit_message = f'Modify navigation tree: {tree_name} ({operation_type})'
        
        commit_result = subprocess.run(['git', 'commit', '-m', commit_message], check=True, capture_output=True, text=True)
        print(f"[@utils:navigationGitManager:perform_navigation_git_operations] Git commit completed with message: {commit_message}")
        
        # Git push with authentication (same pattern as host routes)
        github_token = os.getenv('GITHUB_TOKEN')
        if github_token:
            # Set up environment for git push with token authentication
            env = os.environ.copy()
            env['GIT_ASKPASS'] = 'echo'  # Prevent interactive prompts
            env['GIT_USERNAME'] = github_token  # Use token as username
            env['GIT_PASSWORD'] = ''  # Empty password when using token
            
            # Alternative approach: Use token in the push URL
            # Get the current remote URL
            remote_result = subprocess.run(['git', 'remote', 'get-url', 'origin'], 
                                         check=True, capture_output=True, text=True)
            remote_url = remote_result.stdout.strip()
            
            # If it's an HTTPS URL, inject the token
            if remote_url.startswith('https://github.com/'):
                # Format: https://token@github.com/user/repo.git
                authenticated_url = remote_url.replace('https://github.com/', f'https://{github_token}@github.com/')
                push_result = subprocess.run(['git', 'push', authenticated_url, 'HEAD'], 
                                           check=True, capture_output=True, text=True, env=env)
            else:
                # Fallback to regular push
                push_result = subprocess.run(['git', 'push'], 
                                           check=True, capture_output=True, text=True, env=env)
            
            print(f"[@utils:navigationGitManager:perform_navigation_git_operations] Git push completed successfully")
            push_success = True
        else:
            print(f"[@utils:navigationGitManager:perform_navigation_git_operations] Warning: GITHUB_TOKEN not set, skipping push")
            push_success = False
        
        # Return to original directory
        os.chdir(original_cwd)
        
        return {
            'success': True,
            'message': f'Navigation tree {operation_type} committed successfully: {tree_name}',
            'commit_message': commit_message,
            'pushed': push_success,
            'tree_name': tree_name,
            'operation_type': operation_type
        }
        
    except subprocess.CalledProcessError as git_error:
        # Ensure we return to original directory on error
        try:
            os.chdir(original_cwd)
        except:
            pass
            
        error_message = f'Git operation failed: {str(git_error)}'
        print(f"[@utils:navigationGitManager:perform_navigation_git_operations] {error_message}")
        
        return {
            'success': False,
            'error': error_message,
            'tree_name': tree_name,
            'operation_type': operation_type
        }
        
    except Exception as e:
        # Ensure we return to original directory on error
        try:
            os.chdir(original_cwd)
        except:
            pass
            
        error_message = f'Navigation git operation error: {str(e)}'
        print(f"[@utils:navigationGitManager:perform_navigation_git_operations] {error_message}")
        
        return {
            'success': False,
            'error': error_message,
            'tree_name': tree_name,
            'operation_type': operation_type
        }


def pull_latest_navigation_config() -> bool:
    """
    Pull latest navigation config changes from git
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        print(f"[@utils:navigationGitManager:pull_latest_navigation_config] Pulling latest navigation config changes")
        
        # Store original directory
        original_cwd = os.getcwd()
        
        # Change to the parent directory for git operations
        os.chdir('..')
        
        # Git pull to get latest changes
        pull_result = subprocess.run(['git', 'pull'], check=True, capture_output=True, text=True)
        
        # Return to original directory
        os.chdir(original_cwd)
        
        print(f"[@utils:navigationGitManager:pull_latest_navigation_config] Git pull completed successfully")
        return True
        
    except subprocess.CalledProcessError as git_error:
        # Ensure we return to original directory on error
        try:
            os.chdir(original_cwd)
        except:
            pass
            
        print(f"[@utils:navigationGitManager:pull_latest_navigation_config] Git pull failed: {str(git_error)}")
        return False
        
    except Exception as e:
        # Ensure we return to original directory on error
        try:
            os.chdir(original_cwd)
        except:
            pass
            
        print(f"[@utils:navigationGitManager:pull_latest_navigation_config] Error: {str(e)}")
        return False


def check_navigation_git_status() -> Dict[str, Any]:
    """
    Check git status for navigation config directory
    
    Returns:
        dict: Git status information
    """
    try:
        print(f"[@utils:navigationGitManager:check_navigation_git_status] Checking git status for navigation config")
        
        # Store original directory
        original_cwd = os.getcwd()
        
        # Change to the parent directory for git operations
        os.chdir('..')
        
        # Git status for navigation config directory
        status_result = subprocess.run(['git', 'status', 'config/navigation/', '--porcelain'], 
                                     check=True, capture_output=True, text=True)
        
        # Return to original directory
        os.chdir(original_cwd)
        
        # Parse status output
        modified_files = []
        if status_result.stdout.strip():
            for line in status_result.stdout.strip().split('\n'):
                if line.strip():
                    status_code = line[:2]
                    file_path = line[3:].strip()
                    modified_files.append({
                        'status': status_code,
                        'file': file_path
                    })
        
        print(f"[@utils:navigationGitManager:check_navigation_git_status] Found {len(modified_files)} modified navigation files")
        
        return {
            'success': True,
            'modified_files': modified_files,
            'has_changes': len(modified_files) > 0
        }
        
    except subprocess.CalledProcessError as git_error:
        # Ensure we return to original directory on error
        try:
            os.chdir(original_cwd)
        except:
            pass
            
        error_message = f'Git status check failed: {str(git_error)}'
        print(f"[@utils:navigationGitManager:check_navigation_git_status] {error_message}")
        
        return {
            'success': False,
            'error': error_message
        }
        
    except Exception as e:
        # Ensure we return to original directory on error
        try:
            os.chdir(original_cwd)
        except:
            pass
            
        error_message = f'Navigation git status error: {str(e)}'
        print(f"[@utils:navigationGitManager:check_navigation_git_status] {error_message}")
        
        return {
            'success': False,
            'error': error_message
        } 