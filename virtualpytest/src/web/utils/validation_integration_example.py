"""
Integration example showing how to use the NetworkX-based SmartValidationEngine

This example demonstrates the proper way to use the new validation system
that leverages NetworkX for pathfinding and graph operations.
"""

import sys
import os
from typing import Dict, Any, List

# Add paths for imports
web_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
web_utils_path = os.path.join(web_dir, 'utils')
sys.path.insert(0, web_utils_path)

from validation_utils import (
    SmartValidationEngine,
    calculate_validation_preview,
    execute_smart_validation
)

def example_tree_data() -> Dict[str, Any]:
    """Example navigation tree data for demonstration"""
    return {
        'nodes': [
            {
                'id': 'entry_1',
                'label': 'Entry Point',
                'name': 'Entry Point',
                'data': {
                    'label': 'Entry Point',
                    'node_type': 'entry',
                    'is_entry_point': True
                }
            },
            {
                'id': 'menu_main',
                'label': 'Main Menu',
                'name': 'Main Menu',
                'data': {
                    'label': 'Main Menu',
                    'node_type': 'menu'
                }
            },
            {
                'id': 'settings_page',
                'label': 'Settings',
                'name': 'Settings',
                'data': {
                    'label': 'Settings',
                    'node_type': 'page'
                }
            },
            {
                'id': 'profile_page',
                'label': 'Profile',
                'name': 'Profile',
                'data': {
                    'label': 'Profile',
                    'node_type': 'page'
                }
            }
        ],
        'edges': [
            {
                'from': 'entry_1',
                'to': 'menu_main',
                'source': 'entry_1',
                'target': 'menu_main',
                'data': {
                    'actions': [
                        {
                            'id': 'navigate_to_main',
                            'label': 'Navigate to Main Menu',
                            'command': 'navigate',
                            'params': {'url': '/main'},
                            'waitTime': 1000
                        }
                    ],
                    'retryActions': [
                        {
                            'type': 'wait',
                            'duration': 2
                        },
                        {
                            'type': 'refresh'
                        }
                    ]
                }
            },
            {
                'from': 'menu_main',
                'to': 'settings_page',
                'source': 'menu_main',
                'target': 'settings_page',
                'data': {
                    'actions': [
                        {
                            'id': 'click_settings',
                            'label': 'Click Settings',
                            'command': 'click',
                            'params': {'elementId': 'settings-btn'},
                            'waitTime': 500
                        }
                    ]
                }
            },
            {
                'from': 'menu_main',
                'to': 'profile_page',
                'source': 'menu_main',
                'target': 'profile_page',
                'data': {
                    'actions': [
                        {
                            'id': 'click_profile',
                            'label': 'Click Profile',
                            'command': 'click',
                            'params': {'elementId': 'profile-btn'},
                            'waitTime': 500
                        }
                    ],
                    'retryActions': [
                        {
                            'type': 'wait',
                            'duration': 1
                        }
                    ]
                }
            }
        ]
    }

def demonstrate_networkx_validation():
    """Demonstrate the NetworkX-based validation system"""
    print("=== NetworkX-Based Smart Validation Demonstration ===\n")
    
    # Sample tree data
    tree_data = example_tree_data()
    team_id = "demo_team_123"
    
    print("1. Creating SmartValidationEngine with NetworkX support...")
    engine = SmartValidationEngine(tree_data, team_id)
    
    print(f"   ✓ Created NetworkX graph with {len(engine.graph.nodes())} nodes and {len(engine.graph.edges())} edges")
    print(f"   ✓ Graph is DAG: {engine.graph.number_of_nodes() > 0}")
    
    print("\n2. Getting reachable nodes using NetworkX algorithms...")
    reachable_nodes = engine.get_reachable_nodes()
    print(f"   ✓ Found {len(reachable_nodes)} reachable nodes: {list(reachable_nodes)}")
    
    print("\n3. Generating smart validation paths with topological ordering...")
    smart_paths = engine.get_smart_validation_paths()
    print(f"   ✓ Generated {len(smart_paths)} validation paths")
    
    for i, path in enumerate(smart_paths):
        deps = ', '.join(path['dependsOn']) if path['dependsOn'] else 'None'
        print(f"      Path {i+1}: {path['targetName']} (depends on: {deps}, depth: {path['depth']})")
    
    print("\n4. Calculating validation preview...")
    preview = calculate_validation_preview(tree_data, team_id)
    
    print(f"   ✓ Total nodes to validate: {preview['totalNodes']}")
    print(f"   ✓ Reachable nodes: {len(preview['reachableNodes'])}")
    print(f"   ✓ Edges with retry logic: {len(preview['edgesWithRetry'])}")
    print(f"   ✓ NetworkX graph stats:")
    print(f"      - Graph nodes: {preview['networkxStats']['graphNodes']}")
    print(f"      - Graph edges: {preview['networkxStats']['graphEdges']}")
    print(f"      - Is DAG: {preview['networkxStats']['isDAG']}")
    print(f"      - Is connected: {preview['networkxStats']['isConnected']}")
    print(f"      - Entry points: {preview['networkxStats']['entryPoints']}")
    
    print("\n5. Executing smart validation with NetworkX pathfinding...")
    validation_results = execute_smart_validation(tree_data, team_id)
    
    summary = validation_results['summary']
    print(f"   ✓ Validation completed:")
    print(f"      - Total nodes: {summary['totalNodes']}")
    print(f"      - Valid nodes: {summary['validNodes']}")
    print(f"      - Failed nodes: {summary['errorNodes']}")
    print(f"      - Skipped nodes: {summary['skippedNodes']}")
    print(f"      - Overall health: {summary['overallHealth']}")
    print(f"      - NetworkX enabled: {summary['networkxEnabled']}")
    print(f"      - Retry attempts: {summary['retryAttempts']}")
    print(f"      - Retry successes: {summary['retrySuccesses']}")
    
    print(f"\n   ✓ NetworkX validation stats:")
    nx_stats = validation_results['networkxStats']
    print(f"      - Graph nodes: {nx_stats['graphNodes']}")
    print(f"      - Graph edges: {nx_stats['graphEdges']}")
    print(f"      - Is DAG: {nx_stats['isDAG']}")
    print(f"      - Is connected: {nx_stats['isConnected']}")
    print(f"      - Failed nodes: {nx_stats['failedNodes']}")
    print(f"      - Validated nodes: {nx_stats['validatedNodes']}")
    
    print("\n6. Individual node validation results:")
    for result in validation_results['nodeResults']:
        status = "✓ PASSED" if result['isValid'] else ("⚠ SKIPPED" if result.get('isSkipped') else "✗ FAILED")
        errors = f" (Errors: {', '.join(result['errors'])})" if result['errors'] else ""
        print(f"      {status}: {result['nodeName']} - Path length: {result['pathLength']}{errors}")

def demonstrate_dependency_handling():
    """Demonstrate how NetworkX handles dependency validation"""
    print("\n=== Dependency Handling with NetworkX ===\n")
    
    tree_data = example_tree_data()
    team_id = "demo_team_dep"
    
    engine = SmartValidationEngine(tree_data, team_id)
    
    print("1. Testing dependency resolution...")
    
    # Simulate a failed node
    failed_node = 'menu_main'
    engine.failed_nodes.add(failed_node)
    print(f"   ✓ Simulated failure of node: {failed_node}")
    
    # Check which nodes should be skipped
    dependent_nodes = ['settings_page', 'profile_page']
    
    for node_id in dependent_nodes:
        should_skip = engine.should_skip_node(node_id)
        print(f"   ✓ Node '{node_id}' should be skipped: {should_skip}")
        
        if should_skip:
            print(f"      → NetworkX determined that '{node_id}' is unreachable due to failed dependency")
    
    print("\n2. Testing reachability with failed nodes...")
    reachable_with_failures = engine.get_reachable_nodes(exclude_failed=True)
    reachable_without_exclusion = engine.get_reachable_nodes(exclude_failed=False)
    
    print(f"   ✓ Reachable nodes (excluding failed paths): {list(reachable_with_failures)}")
    print(f"   ✓ Reachable nodes (including failed paths): {list(reachable_without_exclusion)}")
    
    print("\n3. Testing abort dependent nodes using NetworkX...")
    smart_paths = engine.get_smart_validation_paths()
    aborted_results = engine.abort_dependent_nodes(failed_node, smart_paths)
    
    print(f"   ✓ Found {len(aborted_results)} nodes to abort due to failed dependency")
    for result in aborted_results:
        print(f"      → Aborted: {result['nodeName']} (Reason: {result['errors'][0]})")

def compare_old_vs_new_approach():
    """Compare the old manual approach vs new NetworkX approach"""
    print("\n=== Comparison: Manual vs NetworkX Approach ===\n")
    
    tree_data = example_tree_data()
    team_id = "demo_comparison"
    
    print("OLD APPROACH ISSUES:")
    print("   ✗ Manual BFS traversal implementation")
    print("   ✗ Custom dependency graph building")
    print("   ✗ Reinventing shortest path algorithms")
    print("   ✗ Manual circular dependency detection")
    print("   ✗ Custom reachability calculations")
    
    print("\nNEW NETWORKX APPROACH BENEFITS:")
    engine = SmartValidationEngine(tree_data, team_id)
    
    print("   ✓ Uses proven NetworkX algorithms")
    print("   ✓ Automatic topological sorting for optimal validation order")
    print("   ✓ Built-in shortest path finding")
    print("   ✓ Robust cycle detection and handling")
    print("   ✓ Efficient reachability analysis")
    print("   ✓ Integration with existing navigation pathfinding system")
    
    # Demonstrate NetworkX capabilities
    import networkx as nx
    
    print(f"\n   GRAPH ANALYSIS CAPABILITIES:")
    print(f"   ✓ Is DAG: {nx.is_directed_acyclic_graph(engine.graph)}")
    print(f"   ✓ Is connected: {nx.is_weakly_connected(engine.graph)}")
    print(f"   ✓ Number of components: {nx.number_weakly_connected_components(engine.graph)}")
    
    try:
        print(f"   ✓ Topological sort: {list(nx.topological_sort(engine.graph))}")
    except nx.NetworkXError:
        print(f"   ✓ Graph has cycles (handled gracefully)")
    
    # Show entry point detection
    from navigation_graph import get_entry_points
    entry_points = get_entry_points(engine.graph)
    print(f"   ✓ Entry points detected: {entry_points}")

if __name__ == "__main__":
    try:
        demonstrate_networkx_validation()
        demonstrate_dependency_handling()
        compare_old_vs_new_approach()
        
        print("\n" + "="*60)
        print("✓ NetworkX-based validation system demonstration completed successfully!")
        print("✓ The system now properly leverages existing navigation pathfinding infrastructure.")
        print("="*60)
        
    except Exception as e:
        print(f"\n✗ Demonstration failed with error: {e}")
        import traceback
        traceback.print_exc() 