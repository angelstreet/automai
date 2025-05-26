from typing import Dict, List
from uuid import uuid4
from models.navigation_tree import NavigationTree

class AutoTestGenerator:
    def __init__(self, tree: NavigationTree):
        self.tree = tree

    def validate_all(self) -> List[Dict]:
        """Generate tests covering all nodes and edges."""
        test_cases = []
        nodes = self.tree.get_all_nodes()
        for start_node in nodes:
            for end_node in nodes:
                path = self._find_path(start_node, end_node)
                if path:
                    test_cases.append(self.generate_test_case(path, 'functional'))
        return test_cases

    def validate_specific_nodes(self, nodes: List[str]) -> List[Dict]:
        """Generate tests for specific nodes and their subtrees."""
        test_cases = []
        for node in nodes:
            subtree_nodes = self.tree.get_subtree_nodes(node)
            for end_node in subtree_nodes:
                path = self._find_path(node, end_node)
                if path:
                    test_cases.append(self.generate_test_case(path, 'functional'))
        return test_cases

    def validate_common_paths(self) -> List[Dict]:
        """Generate tests for common paths (placeholder weights)."""
        # Placeholder: Assume Home to key nodes
        test_cases = []
        start_node = 'Home'
        key_nodes = ['VideoPlayer', 'Settings']
        for end_node in key_nodes:
            path = self._find_path(start_node, end_node)
            if path:
                test_cases.append(self.generate_test_case(path, 'functional'))
        return test_cases

    def generate_test_case(self, path: List[str], test_type: str) -> Dict:
        """Create a test case from a path."""
        steps = []
        for i in range(len(path) - 1):
            action = self.tree.find_action(path[i], path[i+1])
            steps.append({
                'target_node': path[i+1],
                'verify': action.get('verification', {})
            })
        return {
            'test_id': str(uuid4()),
            'name': f"AutoTest_{path[0]}_to_{path[-1]}",
            'test_type': test_type,
            'start_node': path[0],
            'steps': steps
        }

    def _find_path(self, start: str, end: str) -> List[str]:
        """Find a path between two nodes (DFS)."""
        visited = set()
        stack = [(start, [start])]
        while stack:
            node, path = stack.pop()
            if node == end:
                return path
            if node not in visited:
                visited.add(node)
                for action in self.tree.get_actions(node):
                    next_node = action.get('to')
                    if next_node and next_node not in visited:
                        stack.append((next_node, path + [next_node]))
        return []