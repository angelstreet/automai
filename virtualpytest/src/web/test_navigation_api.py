#!/usr/bin/env python3
"""
Navigation API Test Script

This script demonstrates all the navigation API endpoints:
- Navigation trees CRUD operations
- Navigation screens CRUD operations  
- Navigation links CRUD operations
- Helper endpoints
"""

import requests
import json
import time

BASE_URL = "http://localhost:5009"

def print_response(response, operation):
    """Print formatted response"""
    print(f"\n{'='*50}")
    print(f"Operation: {operation}")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print(f"{'='*50}")

def test_navigation_api():
    """Test all navigation API endpoints"""
    
    print("🚀 Testing Navigation API Endpoints")
    
    # 1. Get available user interfaces
    print("\n1. Getting available user interfaces...")
    response = requests.get(f"{BASE_URL}/api/navigation/userinterfaces")
    print_response(response, "GET /api/navigation/userinterfaces")
    
    if response.status_code == 200:
        userinterfaces = response.json()
        if userinterfaces:
            userinterface_id = userinterfaces[0]['id']
            print(f"Using user interface: {userinterfaces[0]['name']} (ID: {userinterface_id})")
        else:
            print("❌ No user interfaces found!")
            return
    else:
        print("❌ Failed to get user interfaces!")
        return
    
    # 2. Create a navigation tree
    print("\n2. Creating a navigation tree...")
    tree_data = {
        "name": "Test Navigation Tree",
        "userinterface_id": userinterface_id,
        "description": "A test navigation tree for API demonstration"
    }
    response = requests.post(f"{BASE_URL}/api/navigation/trees", json=tree_data)
    print_response(response, "POST /api/navigation/trees")
    
    if response.status_code == 201:
        tree_id = response.json()['tree']['id']
        print(f"Created tree with ID: {tree_id}")
    else:
        print("❌ Failed to create navigation tree!")
        return
    
    # 3. Get all navigation trees
    print("\n3. Getting all navigation trees...")
    response = requests.get(f"{BASE_URL}/api/navigation/trees")
    print_response(response, "GET /api/navigation/trees")
    
    # 4. Get specific navigation tree
    print("\n4. Getting specific navigation tree...")
    response = requests.get(f"{BASE_URL}/api/navigation/trees/{tree_id}")
    print_response(response, f"GET /api/navigation/trees/{tree_id}")
    
    # 5. Create navigation screens
    print("\n5. Creating navigation screens...")
    
    # Create home screen
    home_screen_data = {
        "screen_name": "home",
        "screen_type": "screen",
        "level": 0,
        "is_entry_point": True,
        "position_x": 100,
        "position_y": 100,
        "description": "Main home screen"
    }
    response = requests.post(f"{BASE_URL}/api/navigation/trees/{tree_id}/screens", json=home_screen_data)
    print_response(response, f"POST /api/navigation/trees/{tree_id}/screens (home)")
    
    if response.status_code == 201:
        home_screen_id = response.json()['screen']['id']
        print(f"Created home screen with ID: {home_screen_id}")
    else:
        print("❌ Failed to create home screen!")
        return
    
    # Create settings screen
    settings_screen_data = {
        "screen_name": "settings",
        "screen_type": "screen",
        "level": 0,
        "is_entry_point": False,
        "position_x": 200,
        "position_y": 100,
        "description": "Settings screen"
    }
    response = requests.post(f"{BASE_URL}/api/navigation/trees/{tree_id}/screens", json=settings_screen_data)
    print_response(response, f"POST /api/navigation/trees/{tree_id}/screens (settings)")
    
    if response.status_code == 201:
        settings_screen_id = response.json()['screen']['id']
        print(f"Created settings screen with ID: {settings_screen_id}")
    else:
        print("❌ Failed to create settings screen!")
        return
    
    # 6. Get all screens for the tree
    print("\n6. Getting all screens for the tree...")
    response = requests.get(f"{BASE_URL}/api/navigation/trees/{tree_id}/screens")
    print_response(response, f"GET /api/navigation/trees/{tree_id}/screens")
    
    # 7. Create navigation link
    print("\n7. Creating navigation link...")
    link_data = {
        "source_screen_id": home_screen_id,
        "target_screen_id": settings_screen_id,
        "link_type": "sibling",
        "go_key": "RIGHT",
        "comeback_key": "LEFT",
        "description": "Navigate from home to settings"
    }
    response = requests.post(f"{BASE_URL}/api/navigation/trees/{tree_id}/links", json=link_data)
    print_response(response, f"POST /api/navigation/trees/{tree_id}/links")
    
    if response.status_code == 201:
        link_id = response.json()['link']['id']
        print(f"Created link with ID: {link_id}")
    else:
        print("❌ Failed to create navigation link!")
        return
    
    # 8. Get all links for the tree
    print("\n8. Getting all links for the tree...")
    response = requests.get(f"{BASE_URL}/api/navigation/trees/{tree_id}/links")
    print_response(response, f"GET /api/navigation/trees/{tree_id}/links")
    
    # 9. Get complete tree with details
    print("\n9. Getting complete tree with screens and links...")
    response = requests.get(f"{BASE_URL}/api/navigation/trees/{tree_id}?include_details=true")
    print_response(response, f"GET /api/navigation/trees/{tree_id}?include_details=true")
    
    # 10. Update navigation tree
    print("\n10. Updating navigation tree...")
    updated_tree_data = {
        "name": "Updated Test Navigation Tree",
        "userinterface_id": userinterface_id,
        "description": "Updated description for test navigation tree"
    }
    response = requests.put(f"{BASE_URL}/api/navigation/trees/{tree_id}", json=updated_tree_data)
    print_response(response, f"PUT /api/navigation/trees/{tree_id}")
    
    # 11. Update navigation screen
    print("\n11. Updating navigation screen...")
    updated_screen_data = {
        "screen_name": "home_updated",
        "screen_type": "screen",
        "level": 0,
        "is_entry_point": True,
        "position_x": 150,
        "position_y": 150,
        "description": "Updated home screen"
    }
    response = requests.put(f"{BASE_URL}/api/navigation/screens/{home_screen_id}", json=updated_screen_data)
    print_response(response, f"PUT /api/navigation/screens/{home_screen_id}")
    
    # 12. Update navigation link
    print("\n12. Updating navigation link...")
    updated_link_data = {
        "source_screen_id": home_screen_id,
        "target_screen_id": settings_screen_id,
        "link_type": "sibling",
        "go_key": "DOWN",
        "comeback_key": "UP",
        "direction": "down",
        "description": "Updated navigation link"
    }
    response = requests.put(f"{BASE_URL}/api/navigation/links/{link_id}", json=updated_link_data)
    print_response(response, f"PUT /api/navigation/links/{link_id}")
    
    # 13. Test error cases
    print("\n13. Testing error cases...")
    
    # Try to create tree with duplicate name
    duplicate_tree_data = {
        "name": "Updated Test Navigation Tree",  # Same name as updated tree
        "userinterface_id": userinterface_id,
        "description": "This should fail due to duplicate name"
    }
    response = requests.post(f"{BASE_URL}/api/navigation/trees", json=duplicate_tree_data)
    print_response(response, "POST /api/navigation/trees (duplicate name)")
    
    # Try to create tree with invalid user interface
    invalid_tree_data = {
        "name": "Invalid Tree",
        "userinterface_id": "invalid-uuid",
        "description": "This should fail due to invalid user interface"
    }
    response = requests.post(f"{BASE_URL}/api/navigation/trees", json=invalid_tree_data)
    print_response(response, "POST /api/navigation/trees (invalid userinterface_id)")
    
    # 14. Cleanup - Delete created resources
    print("\n14. Cleaning up...")
    
    # Delete navigation link
    response = requests.delete(f"{BASE_URL}/api/navigation/links/{link_id}")
    print_response(response, f"DELETE /api/navigation/links/{link_id}")
    
    # Delete navigation screens
    response = requests.delete(f"{BASE_URL}/api/navigation/screens/{home_screen_id}")
    print_response(response, f"DELETE /api/navigation/screens/{home_screen_id}")
    
    response = requests.delete(f"{BASE_URL}/api/navigation/screens/{settings_screen_id}")
    print_response(response, f"DELETE /api/navigation/screens/{settings_screen_id}")
    
    # Delete navigation tree
    response = requests.delete(f"{BASE_URL}/api/navigation/trees/{tree_id}")
    print_response(response, f"DELETE /api/navigation/trees/{tree_id}")
    
    print("\n✅ Navigation API test completed!")

if __name__ == "__main__":
    try:
        test_navigation_api()
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to the API server.")
        print("Make sure the Flask app is running on http://localhost:5009")
    except Exception as e:
        print(f"❌ Error: {e}") 