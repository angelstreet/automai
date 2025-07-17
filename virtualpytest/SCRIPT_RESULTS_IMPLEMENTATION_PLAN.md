# Script Results & HTML Report Implementation Plan

## 1. Database Schema: `script_results` Table

### Primary Fields

- `id` (uuid, primary key, auto-generated)
- `team_id` (uuid, not null) - for RLS
- `script_name` (text, not null) - name of validation script (e.g., "validation.py")
- `script_type` (text, not null) - type like "validation", "regression", "smoke_test"
- `userinterface_name` (text, nullable) - target UI being tested
- `host_name` (text, not null) - execution host
- `device_name` (text, not null) - device name for clarity

### Execution Metadata

- `success` (boolean, not null) - overall script success
- `execution_time_ms` (integer, nullable) - total execution time
- `started_at` (timestamptz, not null) - script start time
- `completed_at` (timestamptz, not null) - script completion time

### Report & Control Fields

- `html_report_r2_path` (text, nullable) - R2 path to HTML report
- `html_report_r2_url` (text, nullable) - public URL to HTML report
- `discard` (boolean, default false) - flag for false positives
- `error_msg` (text, nullable) - error message as plain text
- `metadata` (jsonb, nullable) - additional script-specific data

### Timestamps

- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### RLS Policy

**Policy Name:** "Team members can access script results"
**Rule:** Same pattern as execution_results table

```sql
((auth.uid() IS NULL) OR (auth.role() = 'service_role'::text) OR (team_id IN (SELECT team_members.team_id FROM team_members WHERE team_members.profile_id = auth.uid())))
```

## 2. Database Library Layer: `script_results_db.py`

### Location

`virtualpytest/src/lib/supabase/script_results_db.py`

### Core Functions

- `record_script_execution_start()` - Insert initial record when script starts
- `update_script_execution_result()` - Update with final results and report URLs
- `get_script_results()` - Retrieve results with filtering (team_id, script_name, script_type)
- `get_script_history()` - Get execution history for a script
- `mark_script_discarded()` - Mark script as discarded (false positive)
- `delete_script_result()` - Clean up old results

### Pattern

Follow same structure as `execution_results_db.py`:

- Use `get_supabase_client()` from `src.utils.supabase_utils`
- Include team_id validation in all operations
- Comprehensive error handling with try/catch
- Detailed logging with `[@db:script_results:function_name]` format

## 3. Report Generation: `report_utils.py`

### Location

`virtualpytest/src/utils/report_utils.py`

### Core Functions

- `generate_validation_report()` - Main report generation function
- `create_html_template()` - Generate HTML structure with embedded CSS/JS
- `capture_validation_screenshots()` - Screenshot capture utilities
- `embed_validation_images()` - Process and embed screenshots in report
- `create_step_results_section()` - Generate step-by-step results
- `add_execution_metrics()` - Include timing and success metrics

### Screenshot Strategy

**Capture Points:**

1. **Beginning** - Initial state screenshot
2. **After Each Step** - Post-action screenshot showing result
3. **End** - Final state screenshot

**Implementation:**

- Use thumbnail generation pattern from `RecHostPreview.tsx`
- Generate timestamped screenshots using existing host screenshot APIs
- Store screenshots with descriptive names: `step_{n}_{timestamp}.jpg`
- Initial: `initial_state_{timestamp}.jpg`
- Final: `final_state_{timestamp}.jpg`

### Report Structure

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Validation Report - {script_name}</title>
    <style>
      /* Embedded CSS */
    </style>
  </head>
  <body>
    <!-- Executive Summary -->
    <section class="summary">
      <h1>Validation Report</h1>
      <div class="metrics">Pass/Fail, Timing, Device Info</div>
    </section>

    <!-- Step Results -->
    <section class="steps">
      <h2>Step-by-Step Results</h2>
      <!-- Each step with screenshot and result -->
    </section>

    <!-- Error Analysis (if any) -->
    <section class="errors">
      <h2>Error Details</h2>
    </section>

    <!-- Metadata -->
    <section class="metadata">
      <h2>Execution Environment</h2>
    </section>
  </body>
</html>
```

## 4. R2 Storage Enhancement

### Extend Existing File

Enhance `virtualpytest/src/utils/cloudflare_utils.py` with new functions:

### New Functions to Add

- `upload_script_report()` - Upload complete report with screenshots
- `upload_validation_screenshots()` - Upload validation step screenshots
- `get_script_report_folder_url()` - Get base URL for script report folder

### Folder Structure

```
script-reports/
  ├── {device_model}/
      ├── {script_name}_{date}_{timestamp}/
          ├── report.html
          ├── initial_state_{timestamp}.jpg
          ├── step_1_{timestamp}.jpg
          ├── step_2_{timestamp}.jpg
          ├── ...
          └── final_state_{timestamp}.jpg
```

**Example:**

```
script-reports/android_mobile/validation_20250117_134500/report.html
script-reports/android_mobile/validation_20250117_134500/initial_state_20250117134500.jpg
script-reports/android_mobile/validation_20250117_134500/step_1_20250117134502.jpg
```

### URL Building Integration

Use `build_url_utils.py` functions:

- `buildCloudImageUrl()` for screenshot URLs in reports
- Create new `buildScriptReportUrl()` function for report URLs

## 5. Validation Script Integration

### Enhanced `validation.py` Flow

#### 1. Script Initialization

```python
# Record script start
script_result_id = record_script_execution_start(
    team_id=team_id,
    script_name="validation.py",
    script_type="validation",
    userinterface_name=userinterface_name,
    host_name=host.get('host_name'),
    device_name=selected_device.device_name
)

# Capture initial state
initial_screenshot = capture_validation_screenshot(host, selected_device, "initial_state")
```

#### 2. During Validation Steps

```python
for i, step in enumerate(validation_sequence):
    # Execute step
    result = execute_navigation_step_directly(host, selected_device, step, team_id)

    # Capture post-step screenshot
    step_screenshot = capture_validation_screenshot(host, selected_device, f"step_{i+1}")

    # Store step result and screenshot path
    step_results.append({
        'step_number': i+1,
        'success': result['success'],
        'screenshot_path': step_screenshot,
        'message': result.get('message', '')
    })
```

#### 3. Script Completion

```python
# Capture final state
final_screenshot = capture_validation_screenshot(host, selected_device, "final_state")

# Generate HTML report
report_data = {
    'script_name': 'validation.py',
    'device_info': selected_device,
    'host_info': host,
    'execution_time': total_execution_time,
    'success': overall_success,
    'step_results': step_results,
    'screenshots': {
        'initial': initial_screenshot,
        'steps': [step['screenshot_path'] for step in step_results],
        'final': final_screenshot
    }
}

html_content = generate_validation_report(report_data)

# Upload to R2
upload_result = upload_script_report(
    html_content=html_content,
    screenshots=all_screenshot_paths,
    device_model=selected_device.device_model,
    script_name="validation",
    timestamp=execution_timestamp
)

# Update database with final results
update_script_execution_result(
    script_result_id=script_result_id,
    success=overall_success,
    execution_time_ms=total_execution_time,
    html_report_r2_path=upload_result['report_path'],
    html_report_r2_url=upload_result['report_url'],
    error_msg=error_message if not overall_success else None
)
```

## 6. Screenshot Capture Integration

### New Function in `script_utils.py`

```python
def capture_validation_screenshot(host, device, step_name: str) -> str:
    """
    Capture screenshot for validation reporting
    Uses same thumbnail generation pattern as RecHostPreview

    Returns:
        Local path to captured screenshot
    """
```

### Screenshot Naming Convention

- `initial_state_{timestamp}.jpg`
- `step_{number}_{timestamp}.jpg`
- `final_state_{timestamp}.jpg`

### Integration with Existing Screenshot System

- Leverage existing host screenshot APIs
- Use same timestamp format as `RecHostPreview.tsx`
- Store in temporary local directory during script execution
- Upload to R2 as part of report generation

## 7. Implementation Phases

### Phase 1: Database & Core Library

1. Create `script_results` table with RLS policy
2. Implement `script_results_db.py` with all CRUD operations
3. Add functions to `cloudflare_utils.py` for script reports

### Phase 2: Report Generation

1. Create `report_utils.py` with HTML generation
2. Implement screenshot capture in `script_utils.py`
3. Add URL building functions to `build_url_utils.py`

### Phase 3: Validation Script Integration

1. Enhance `validation.py` with report generation hooks
2. Add screenshot capture at all required points
3. Integrate R2 upload and database recording

### Phase 4: Testing & Optimization

1. Test complete flow with sample validation runs
2. Optimize report styling and layout
3. Add error handling and recovery mechanisms

## 8. Error Handling & Recovery

### Database Operations

- All database operations include comprehensive error handling
- Failed uploads should not crash validation execution
- Partial report generation should still record basic results

### Screenshot Failures

- Continue validation even if screenshot capture fails
- Include placeholder in report for missing screenshots
- Log screenshot failures for debugging

### R2 Upload Failures

- Store local report files as backup
- Retry upload mechanism with exponential backoff
- Update database with local paths if R2 upload fails

## 9. Future Enhancements

### Report Features

- Interactive screenshot zoom/pan
- Step timing visualization
- Comparison with previous runs
- Export options (PDF, etc.)

### Integration Points

- Link to navigation tree visualization
- Integration with CI/CD pipelines
- Slack/email notifications with report links
- Dashboard view of all script results
