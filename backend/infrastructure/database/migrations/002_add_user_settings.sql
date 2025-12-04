-- Add user_settings table for storing user preferences and API tokens
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    llm_provider VARCHAR(20) DEFAULT 'llama' CHECK (llm_provider IN ('gpt4', 'llama')),
    openai_api_key TEXT,
    llama_endpoint VARCHAR(255) DEFAULT 'http://localhost:11434',
    default_task_duration INTEGER DEFAULT 60,
    enable_auto_subtasks BOOLEAN DEFAULT false,
    enable_auto_priority BOOLEAN DEFAULT true,
    enable_auto_tags BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster lookups
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
