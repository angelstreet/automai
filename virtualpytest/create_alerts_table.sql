-- Create alerts table for incident monitoring
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_name TEXT NOT NULL,
  device_name TEXT NOT NULL,
  device_model TEXT NOT NULL,
  incident_type TEXT NOT NULL CHECK (incident_type IN ('blackscreen', 'freeze', 'errors', 'audio_loss')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
  consecutive_count INTEGER NOT NULL DEFAULT 1 CHECK (consecutive_count > 0),
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ NULL,
  metadata JSONB NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_host_device ON alerts(host_name, device_name);
CREATE INDEX IF NOT EXISTS idx_alerts_incident_type ON alerts(incident_type);
CREATE INDEX IF NOT EXISTS idx_alerts_start_time ON alerts(start_time DESC);

-- Add RLS (Row Level Security) - Allow all operations for now
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (no team restriction)
CREATE POLICY "Allow all operations on alerts" ON alerts
  FOR ALL USING (true);

-- Add comments for documentation
COMMENT ON TABLE alerts IS 'Stores monitoring incidents from HDMI capture analysis';
COMMENT ON COLUMN alerts.incident_type IS 'Type of incident: blackscreen, freeze, errors, or audio_loss';
COMMENT ON COLUMN alerts.status IS 'Current status: active or resolved';
COMMENT ON COLUMN alerts.consecutive_count IS 'Number of consecutive detections that triggered this alert';
COMMENT ON COLUMN alerts.start_time IS 'When the incident was first detected';
COMMENT ON COLUMN alerts.end_time IS 'When the incident was resolved (NULL if still active)';
COMMENT ON COLUMN alerts.metadata IS 'Additional context about the incident (analysis results, file paths, etc.)';

-- Example query to check active alerts
-- SELECT * FROM alerts WHERE status = 'active' ORDER BY start_time DESC;

-- Example query to get alert history for a host
-- SELECT * FROM alerts WHERE host_name = 'sunri-pi1' ORDER BY start_time DESC LIMIT 50; 