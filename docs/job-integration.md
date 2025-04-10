Below is a detailed Markdown file summarizing your Next.js app setup for managing SSH script execution (manual and periodic) on Linux/Windows hosts, using Vercel, Supabase, Upstash, and Render. It includes the database schema, workflow diagram with user scenario, tech stack, and instructions for pushing jobs to Upstash. As requested, it’s formatted for download, avoids RLS policies, uses table-safe strings, excludes prior conversation details, and adds a user scenario after the workflow description for clarity.

---

# SSH Script Execution System

This document outlines a system for a Next.js app deployed on Vercel to manage SSH script execution on remote Linux/Windows hosts, supporting manual and periodic runs with a GitHub Actions-inspired configuration. It uses Supabase for storage, Upstash for queuing, and Render for execution.

## Tech Stack
| Component         | Technology         | Purpose                          | Free Tier Limits             |
|-------------------|--------------------|----------------------------------|------------------------------|
| Frontend/API      | Next.js (Vercel)   | UI and job triggering            | 100 GB-hours/month          |
| Config Storage    | Supabase           | Stores configs and job results   | 500MB, 200k requests/month  |
| Job Queue         | Upstash Redis      | Queues jobs (Vercel-integrated)  | 10k commands/day, 256MB     |
| Execution Worker  | Render             | Runs SSH scripts (3min)          | 750 hours/month             |

## Database Schema (Supabase)

### Table: `configs`
Stores user-defined configurations.

| Column       | Type                     | Description                                      |
|--------------|--------------------------|--------------------------------------------------|
| `id`         | UUID                     | Primary key (default: `uuid_generate_v4()`)      |
| `user_id`    | UUID                     | References `auth.users(id)`                      |
| `name`       | TEXT                     | Config name (e.g., "Test")                       |
| `config_json`| JSONB                    | YAML-like JSON config                            |
| `created_at` | TIMESTAMP WITH TIME ZONE | Creation timestamp (default: `CURRENT_TIMESTAMP`)|
| `updated_at` | TIMESTAMP WITH TIME ZONE | Update timestamp (default: `CURRENT_TIMESTAMP`)  |

- **Example `config_json`**:
  ```json
  {
    "name": "Test",
    "host": "77.56.53.130",
    "username": "sunri",
    "ssh_key": "secret_key_ref",
    "os": "windows",
    "repository": "https://github.com/user/repo.git",
    "steps": [
      {"run": "whoami"},
      {"run": "python install_tizen_native_app.py ${{ inputs.ip }} ${{ inputs.filepath }}"}
    ],
    "inputs": {
      "ip": "192.168.1.84",
      "filepath": "tizen_native/preprod-tizennative-weakssl-5.18.11604-17858.tpk"
    },
    "schedule": "0 */1 * * *"
  }
  ```
- **Indexes**: `idx_configs_user_id` on `user_id`.

### Table: `jobs`
Stores execution results.

| Column       | Type                     | Description                                      |
|--------------|--------------------------|--------------------------------------------------|
| `id`         | UUID                     | Primary key (default: `uuid_generate_v4()`)      |
| `config_id`  | UUID                     | References `configs(id)`                         |
| `user_id`    | UUID                     | References `auth.users(id)`                      |
| `status`     | TEXT                     | Job state (`queued`, `running`, `success`, `failed`) |
| `output`     | JSONB                    | Script output (e.g., `{"stdout": "...", "stderr": ""}`) |
| `created_at` | TIMESTAMP WITH TIME ZONE | Creation timestamp (default: `CURRENT_TIMESTAMP`)|
| `updated_at` | TIMESTAMP WITH TIME ZONE | Update timestamp (default: `CURRENT_TIMESTAMP`)  |

- **Indexes**: `idx_jobs_config_id` on `config_id`, `idx_jobs_user_id` on `user_id`.

### Trigger for `updated_at`
Updates `updated_at` on row changes.

| Table       | Trigger Name                | Function                  |
|-------------|-----------------------------|---------------------------|
| `configs`   | `update_configs_updated_at` | `update_updated_at()`     |
| `jobs`      | `update_jobs_updated_at`    | `update_updated_at()`     |

- **Function**:
  ```sql
  CREATE OR REPLACE FUNCTION update_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  ```

## Workflow Diagram
```
[User] --> [Next.js (Vercel)]
  |         |
  |         +--> /api/save-config --> [Supabase] (configs, jobs)
  |         |
  +--> UI --> /api/run --> [Upstash Redis] (jobs_queue)
                        |
                        v
[Render Worker] --> Poll Queue --> Fetch Config --> Execute SSH --> Update Jobs
```

- **Description**:
  - Users save configs to Supabase via a Next.js API.
  - Manual or scheduled runs queue jobs to Upstash Redis.
  - A Render worker polls the queue, fetches configs from Supabase, executes scripts on the target host, and stores results in Supabase.
  - The UI polls job results for display.

- **User Scenario**:
  - Alice logs into the app, creates a config named "Test" specifying a Windows host, script steps (e.g., run `python install_tizen_native_app.py`), and inputs (e.g., `ip: "192.168.1.84"`). She sets a schedule to run hourly.
  - Later, she selects "Test" from a dropdown and clicks "Run Now" with a new IP. The app queues the job, and within minutes, she sees the script’s output (e.g., success or error logs) in the UI.

## Pushing Jobs to Upstash

### Setup
1. **Integrate Upstash with Vercel**:
   - Go to Vercel Dashboard → Integrations → Upstash → Add Integration.
   - Select your project; Vercel auto-sets env vars: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

2. **Install Upstash Client**:
   - In your Next.js project:
     ```bash
     npm install @upstash/redis
     ```

3. **Next.js API to Queue Jobs**:
   - **Endpoint**: `/api/run`
   - **Logic**:
     - Authenticate user (via Supabase Auth).
     - Validate request: Ensure `config_id` exists in Supabase `configs` for the user.
     - Push job to Upstash Redis queue (`jobs_queue`) as a JSON string: `{ "config_id": "<id>", "input_overrides": { "ip": "...", "filepath": "..." } }`.
     - Return success response.
   - **Queue Command**: Use `LPUSH` to add jobs to `jobs_queue`.

4. **Execution**:
   - Render worker polls Upstash with `RPOP` (or `BLPOP` for blocking), parses job JSON, fetches config from Supabase, builds and runs the SSH script, and updates `jobs` table.

### Notes
- **Queue Structure**: Redis list `jobs_queue` stores jobs as JSON strings.
- **Limits**: Upstash free tier (10k commands/day) supports ~100-200 jobs daily (push + pop).
- **Error Handling**: Retry on queue failure, log errors to Supabase `jobs`.
- **Security**: Validate `config_id` ownership and sanitize `input_overrides`.

This setup ensures a simple, scalable system for SSH script execution with manual and periodic runs.

--- 

**Download Instructions**: Copy the above text into a file named `ssh_execution_system.md` to save locally.