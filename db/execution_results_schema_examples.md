# Execution Results Schema Examples

## `get_team_execution_stats` Function

### Purpose

This function provides a **team dashboard summary** showing execution patterns and success rates across different categories and initiators.

### What it returns

```sql
-- Example output for a team over the last 7 days:
execution_category | initiator_type | total_executions | successful_executions | failed_executions | success_rate
------------------|----------------|------------------|----------------------|------------------|-------------
verification      | node           | 150              | 135                   | 15               | 0.900
verification      | edge           | 75               | 60                    | 15               | 0.800
verification      | editor         | 25               | 20                    | 5                | 0.800
action           | edge           | 200              | 180                   | 20               | 0.900
action           | batch          | 50               | 45                    | 5                | 0.900
navigation       | standalone     | 10               | 8                     | 2                | 0.800
```

### Real-world interpretation:

1. **Node Verifications**: 150 verifications run from node panels, 90% success rate
2. **Edge Verifications**: 75 verifications run from edge panels, 80% success rate
3. **Editor Verifications**: 25 standalone tests from verification editor, 80% success rate
4. **Edge Actions**: 200 actions executed from edge flows, 90% success rate
5. **Batch Actions**: 50 actions from automated batches, 90% success rate
6. **Navigation**: 10 navigation operations, 80% success rate

### Business insights:

- **Node verifications are most reliable** (90% vs 80% for edges/editor)
- **Actions are more reliable than verifications** (90% vs 80-90%)
- **Edge-based executions** dominate the workload (275 total)
- **Batch processing** is highly reliable (90% success)

### Use cases:

1. **Team Performance Dashboard**: Show which testing approaches work best
2. **Reliability Monitoring**: Identify which execution types need improvement
3. **Resource Planning**: See where teams spend most testing effort
4. **Quality Metrics**: Track improvement over time

## Parameters Field Examples

### Verification Parameters:

```json
{
  "confidence_threshold": 0.8,
  "region": { "x": 100, "y": 200, "width": 300, "height": 150 },
  "match_template": "exact",
  "timeout_ms": 5000,
  "retry_count": 3
}
```

### Action Parameters:

```json
{
  "coordinates": { "x": 250, "y": 400 },
  "duration_ms": 1000,
  "force": 0.8,
  "wait_after_ms": 2000,
  "element_selector": "#login-button"
}
```

### Navigation Parameters:

```json
{
  "target_screen": "dashboard",
  "navigation_path": ["home", "menu", "dashboard"],
  "timeout_ms": 10000,
  "verify_arrival": true
}
```
