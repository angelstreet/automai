from typing import Dict, List, Optional

class NavigationTree:
    def __init__(self, tree_data: Dict):
        self.nodes = tree_data.get('nodes', {})
        self.device = tree_data.get('device')
        self.version = tree_data.get('version')

    def get_actions(self, node_id: str) -> List[Dict]:
        """Return actions for a node."""
        return self.nodes.get(node_id, {}).get('actions', [])

    def find_action(self, from_node: str, to_node: str) -> Optional[Dict]:
        """Find action to transition from one node to another."""
        for action in self.get_actions(from_node):
            if action.get('to') == to_node:
                return action
        return None

    def get_all_nodes(self) -> List[str]:
        """Return all node IDs."""
        return list(self.nodes.keys())

    def get_subtree_nodes(self, root_node: str) -> List[str]:
        """Return nodes in the subtree starting from root_node."""
        nodes = [root_node]
        visited = set()
        stack = [root_node]
        while stack:
            node = stack.pop()
            if node not in visited:
                visited.add(node)
                for action in self.get_actions(node):
                    next_node = action.get('to')
                    if next_node and next_node not in nodes:
                        nodes.append(next_node)
                        stack.append(next_node)
        return nodes