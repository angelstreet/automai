-- Device Models Table Schema for Supabase
-- This table stores device models for test automation

-- Create the device_models table
CREATE TABLE IF NOT EXISTS device_models (
    id UUID PRIMARY KEY,
    team_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    types JSONB NOT NULL DEFAULT '[]'::jsonb,
    controllers JSONB NOT NULL DEFAULT '{
        "remote": "",
        "av": "",
        "network": "",
        "power": ""
    }'::jsonb,
    version VARCHAR(100),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Add constraints
    CONSTRAINT device_models_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT device_models_types_is_array CHECK (jsonb_typeof(types) = 'array'),
    CONSTRAINT device_models_controllers_is_object CHECK (jsonb_typeof(controllers) = 'object'),
    
    -- Unique constraint for name within team
    CONSTRAINT device_models_name_team_unique UNIQUE (team_id, name)
);

-- Enable Row Level Security
ALTER TABLE device_models ENABLE ROW LEVEL SECURITY;

-- Create one policy for all operations
CREATE POLICY "device_models_policy" ON device_models
    FOR ALL
    USING (
        (auth.uid() IS NULL) OR 
        (auth.role() = 'service_role'::text) OR 
        (team_id IN (
            SELECT team_members.team_id
            FROM team_members
            WHERE (team_members.profile_id = auth.uid())
        ))
    )
    WITH CHECK (
        (auth.uid() IS NULL) OR 
        (auth.role() = 'service_role'::text) OR 
        (team_id IN (
            SELECT team_members.team_id
            FROM team_members
            WHERE (team_members.profile_id = auth.uid())
        ))
    );

-- Sample data for testing (optional)
-- INSERT INTO device_models (team_id, name, types, controllers, version, description) VALUES
-- (
--     '7fdeb4bb-3639-4ec3-959f-b54769a219ce'::uuid,
--     'Samsung Galaxy S21',
--     '["Android Phone", "Android Tablet"]'::jsonb,
--     '{
--         "remote": "real_android_mobile",
--         "av": "",
--         "network": "",
--         "power": "mock"
--     }'::jsonb,
--     'Android 12',
--     'High-end Android device for testing'
-- );

-- Grant necessary permissions (adjust as needed)
-- GRANT ALL ON device_models TO authenticated;
-- GRANT ALL ON device_models TO service_role; 