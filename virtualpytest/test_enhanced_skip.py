#!/usr/bin/env python3
"""
Test script to verify enhanced cascading skip logic with target node propagation
"""

def test_enhanced_cascading_skip():
    print('Testing ENHANCED Cascading Skip Logic with Target Node Propagation')
    print('=' * 70)

    # Simulate the scenario
    edges_to_skip = set()
    reachable_nodes = {'home', 'tvguide', 'tvguide_livetv'}  # Initial state after successful navigation
    remaining_edges = [
        ('tvguide_livetv', 'live'),      # This will fail
        ('live', 'tvguide_livetv'),      # Will be skipped (source unreachable)
        ('tvguide_livetv', 'tvguide'),   # Will be skipped (source unreachable)
        ('tvguide', 'home')              # Should now be skipped too!
    ]

    print('Initial reachable nodes:', reachable_nodes)
    print()

    # Step 1: tvguide_livetv → live FAILS
    print('1. tvguide_livetv → live FAILS')
    failed_from = 'tvguide_livetv'
    failed_to = 'live'
    unreachable_nodes = {failed_from, failed_to}
    print(f'   Both {failed_from} and {failed_to} become unreachable')

    # Mark dependent edges for skip
    for edge_from, edge_to in remaining_edges[1:]:  # Skip the failed edge itself
        if edge_from in unreachable_nodes:
            edges_to_skip.add((edge_from, edge_to))
            print(f'   Will skip: {edge_from} → {edge_to}')

    print(f'   edges_to_skip after failure: {edges_to_skip}')
    print()

    # Step 2: Process skipped edges and propagate unreachability
    print('2. Processing skipped edges:')
    for i, (edge_from, edge_to) in enumerate(remaining_edges[1:], 1):
        if (edge_from, edge_to) in edges_to_skip:
            print(f'   {i+1}. {edge_from} → {edge_to} SKIPPED')
            
            # NEW LOGIC: Target node also becomes unreachable
            if edge_to in reachable_nodes:
                reachable_nodes.remove(edge_to)
                print(f'      Target node {edge_to} becomes unreachable')
                
                # Check for additional edges to skip
                for future_from, future_to in remaining_edges[i+1:]:
                    if future_from == edge_to and (future_from, future_to) not in edges_to_skip:
                        edges_to_skip.add((future_from, future_to))
                        print(f'      Additional skip: {future_from} → {future_to}')

    print()
    print(f'Final reachable_nodes: {reachable_nodes}')
    print(f'Final edges_to_skip: {edges_to_skip}')
    print()
    print('Expected: tvguide → home should now be skipped because tvguide became unreachable!')

if __name__ == '__main__':
    test_enhanced_cascading_skip() 