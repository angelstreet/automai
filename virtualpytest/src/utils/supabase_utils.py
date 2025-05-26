import os
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.errors import UniqueViolation
from typing import Dict, List, Optional
from datetime import datetime
from uuid import uuid4
import json

class SupabaseClient:
    def __init__(self, connection_string: str = None):
        """Initialize Supabase PostgreSQL client."""
        if connection_string:
            self.connection_string = connection_string
        else:
            # Construct from NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
            supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
            anon_key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
            
            if supabase_url and anon_key:
                # Extract project reference from URL
                # https://wexkgcszrwxqsthahfyq.supabase.co -> wexkgcszrwxqsthahfyq
                project_ref = supabase_url.split('//')[1].split('.')[0]
                
                # Construct PostgreSQL connection string using anon key
                self.connection_string = f"postgresql://postgres.{project_ref}:{anon_key}@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
            else:
                raise ValueError("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in environment variables")
                    
        if not self.connection_string:
            raise ValueError("Database connection string could not be determined")
        
        # Extract project ref for logging (don't show the full connection string with password)
        if 'postgres.' in self.connection_string:
            project_ref = self.connection_string.split('postgres.')[1].split(':')[0]
            print(f"Using connection string: postgresql://postgres.{project_ref}:***@aws-0-us-east-1.pooler.supabase.com:6543/postgres")
        
    def get_connection(self):
        """Get a database connection."""
        return psycopg2.connect(self.connection_string, cursor_factory=RealDictCursor)

def init_supabase(connection_string: str = None) -> SupabaseClient:
    """Initialize Supabase client."""
    return SupabaseClient(connection_string)

def save_test_case(test_case: Dict, client: SupabaseClient, team_id: str, creator_id: str = None) -> None:
    """Save test case to Supabase test_cases table."""
    test_case['test_id'] = test_case.get('test_id', str(uuid4()))
    
    with client.get_connection() as conn:
        with conn.cursor() as cur:
            try:
                cur.execute("""
                    INSERT INTO test_cases (test_id, name, test_type, start_node, steps, team_id, creator_id)
                    VALUES (%(test_id)s, %(name)s, %(test_type)s, %(start_node)s, %(steps)s, %(team_id)s, %(creator_id)s)
                """, {
                    'test_id': test_case['test_id'],
                    'name': test_case['name'],
                    'test_type': test_case['test_type'],
                    'start_node': test_case['start_node'],
                    'steps': json.dumps(test_case.get('steps', [])),
                    'team_id': team_id,
                    'creator_id': creator_id
                })
            except UniqueViolation:
                # Update existing test case
                cur.execute("""
                    UPDATE test_cases 
                    SET name = %(name)s, test_type = %(test_type)s, start_node = %(start_node)s, 
                        steps = %(steps)s, updated_at = NOW()
                    WHERE test_id = %(test_id)s AND team_id = %(team_id)s
                """, {
                    'test_id': test_case['test_id'],
                    'name': test_case['name'],
                    'test_type': test_case['test_type'],
                    'start_node': test_case['start_node'],
                    'steps': json.dumps(test_case.get('steps', [])),
                    'team_id': team_id
                })
            conn.commit()

def save_tree(tree: Dict, client: SupabaseClient, team_id: str, creator_id: str = None) -> None:
    """Save navigation tree to Supabase navigation_trees table."""
    tree['tree_id'] = tree.get('tree_id', str(uuid4()))
    
    with client.get_connection() as conn:
        with conn.cursor() as cur:
            try:
                cur.execute("""
                    INSERT INTO navigation_trees (tree_id, name, description, nodes, team_id, creator_id)
                    VALUES (%(tree_id)s, %(name)s, %(description)s, %(nodes)s, %(team_id)s, %(creator_id)s)
                """, {
                    'tree_id': tree['tree_id'],
                    'name': tree['name'],
                    'description': tree.get('description', ''),
                    'nodes': json.dumps(tree.get('nodes', [])),
                    'team_id': team_id,
                    'creator_id': creator_id
                })
            except UniqueViolation:
                # Update existing tree
                cur.execute("""
                    UPDATE navigation_trees 
                    SET name = %(name)s, description = %(description)s, nodes = %(nodes)s, updated_at = NOW()
                    WHERE tree_id = %(tree_id)s AND team_id = %(team_id)s
                """, {
                    'tree_id': tree['tree_id'],
                    'name': tree['name'],
                    'description': tree.get('description', ''),
                    'nodes': json.dumps(tree.get('nodes', [])),
                    'team_id': team_id
                })
            conn.commit()

def save_campaign(campaign: Dict, client: SupabaseClient, team_id: str, creator_id: str = None) -> None:
    """Save campaign to Supabase campaigns table."""
    campaign['campaign_id'] = campaign.get('campaign_id', str(uuid4()))
    
    with client.get_connection() as conn:
        with conn.cursor() as cur:
            try:
                cur.execute("""
                    INSERT INTO campaigns (campaign_id, name, description, test_case_ids, tree_id, 
                                         prioritization_enabled, team_id, creator_id)
                    VALUES (%(campaign_id)s, %(name)s, %(description)s, %(test_case_ids)s, 
                           %(tree_id)s, %(prioritization_enabled)s, %(team_id)s, %(creator_id)s)
                """, {
                    'campaign_id': campaign['campaign_id'],
                    'name': campaign['name'],
                    'description': campaign.get('description', ''),
                    'test_case_ids': campaign.get('test_case_ids', []),
                    'tree_id': campaign.get('tree_id'),
                    'prioritization_enabled': campaign.get('prioritization_enabled', False),
                    'team_id': team_id,
                    'creator_id': creator_id
                })
            except UniqueViolation:
                # Update existing campaign
                cur.execute("""
                    UPDATE campaigns 
                    SET name = %(name)s, description = %(description)s, test_case_ids = %(test_case_ids)s,
                        tree_id = %(tree_id)s, prioritization_enabled = %(prioritization_enabled)s, 
                        updated_at = NOW()
                    WHERE campaign_id = %(campaign_id)s AND team_id = %(team_id)s
                """, {
                    'campaign_id': campaign['campaign_id'],
                    'name': campaign['name'],
                    'description': campaign.get('description', ''),
                    'test_case_ids': campaign.get('test_case_ids', []),
                    'tree_id': campaign.get('tree_id'),
                    'prioritization_enabled': campaign.get('prioritization_enabled', False),
                    'team_id': team_id
                })
            conn.commit()

def save_result(test_id: str, name: str, test_type: str, node: str, outcome: str, 
               duration: float, steps: List[Dict], client: SupabaseClient, team_id: str) -> None:
    """Save test result to Supabase test_executions table."""
    with client.get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO test_executions (test_id, name, test_type, node, outcome, 
                                           duration, steps, team_id)
                VALUES (%(test_id)s, %(name)s, %(test_type)s, %(node)s, %(outcome)s, 
                       %(duration)s, %(steps)s, %(team_id)s)
            """, {
                'test_id': test_id,
                'name': name,
                'test_type': test_type,
                'node': node,
                'outcome': outcome,
                'duration': duration,
                'steps': json.dumps(steps),
                'team_id': team_id
            })
            conn.commit()

def get_test_case(test_id: str, client: SupabaseClient, team_id: str) -> Optional[Dict]:
    """Retrieve test case by test_id from Supabase."""
    with client.get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT test_id, name, test_type, start_node, steps, created_at, updated_at
                FROM test_cases 
                WHERE test_id = %s AND team_id = %s
            """, (test_id, team_id))
            result = cur.fetchone()
            if result:
                result = dict(result)
                result['steps'] = json.loads(result['steps']) if result['steps'] else []
                return result
            return None

def get_tree(tree_id: str, client: SupabaseClient, team_id: str) -> Optional[Dict]:
    """Retrieve navigation tree by tree_id from Supabase."""
    with client.get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT tree_id, name, description, nodes, created_at, updated_at
                FROM navigation_trees 
                WHERE tree_id = %s AND team_id = %s
            """, (tree_id, team_id))
            result = cur.fetchone()
            if result:
                result = dict(result)
                result['nodes'] = json.loads(result['nodes']) if result['nodes'] else []
                return result
            return None

def get_campaign(campaign_id: str, client: SupabaseClient, team_id: str) -> Optional[Dict]:
    """Retrieve campaign by campaign_id from Supabase."""
    with client.get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT campaign_id, name, description, test_case_ids, tree_id, 
                       prioritization_enabled, created_at, updated_at
                FROM campaigns 
                WHERE campaign_id = %s AND team_id = %s
            """, (campaign_id, team_id))
            result = cur.fetchone()
            if result:
                return dict(result)
            return None

def get_all_test_cases(client: SupabaseClient, team_id: str) -> List[Dict]:
    """Retrieve all test cases for a team from Supabase."""
    with client.get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT test_id, name, test_type, start_node, steps, created_at, updated_at
                FROM test_cases 
                WHERE team_id = %s
                ORDER BY created_at DESC
            """, (team_id,))
            results = cur.fetchall()
            test_cases = []
            for result in results:
                result = dict(result)
                result['steps'] = json.loads(result['steps']) if result['steps'] else []
                test_cases.append(result)
            return test_cases

def get_all_trees(client: SupabaseClient, team_id: str) -> List[Dict]:
    """Retrieve all navigation trees for a team from Supabase."""
    with client.get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT tree_id, name, description, nodes, created_at, updated_at
                FROM navigation_trees 
                WHERE team_id = %s
                ORDER BY created_at DESC
            """, (team_id,))
            results = cur.fetchall()
            trees = []
            for result in results:
                result = dict(result)
                result['nodes'] = json.loads(result['nodes']) if result['nodes'] else []
                trees.append(result)
            return trees

def get_all_campaigns(client: SupabaseClient, team_id: str) -> List[Dict]:
    """Retrieve all campaigns for a team from Supabase."""
    with client.get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT campaign_id, name, description, test_case_ids, tree_id, 
                       prioritization_enabled, created_at, updated_at
                FROM campaigns 
                WHERE team_id = %s
                ORDER BY created_at DESC
            """, (team_id,))
            results = cur.fetchall()
            return [dict(result) for result in results]

def delete_test_case(test_id: str, client: SupabaseClient, team_id: str) -> bool:
    """Delete test case from Supabase."""
    with client.get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                DELETE FROM test_cases 
                WHERE test_id = %s AND team_id = %s
            """, (test_id, team_id))
            conn.commit()
            return cur.rowcount > 0

def delete_tree(tree_id: str, client: SupabaseClient, team_id: str) -> bool:
    """Delete navigation tree from Supabase."""
    with client.get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                DELETE FROM navigation_trees 
                WHERE tree_id = %s AND team_id = %s
            """, (tree_id, team_id))
            conn.commit()
            return cur.rowcount > 0

def delete_campaign(campaign_id: str, client: SupabaseClient, team_id: str) -> bool:
    """Delete campaign from Supabase."""
    with client.get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                DELETE FROM campaigns 
                WHERE campaign_id = %s AND team_id = %s
            """, (campaign_id, team_id))
            conn.commit()
            return cur.rowcount > 0

def get_failure_rates(client: SupabaseClient, team_id: str) -> Dict[str, float]:
    """Compute failure rates per node from Supabase test_executions."""
    with client.get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    node,
                    COUNT(*) as total,
                    COUNT(CASE WHEN outcome = 'fail' THEN 1 END) as failures,
                    CASE 
                        WHEN COUNT(*) > 0 THEN 
                            COUNT(CASE WHEN outcome = 'fail' THEN 1 END)::float / COUNT(*)::float
                        ELSE 0.0 
                    END as failure_rate
                FROM test_executions 
                WHERE team_id = %s
                GROUP BY node
            """, (team_id,))
            results = cur.fetchall()
            return {result['node']: result['failure_rate'] for result in results} 