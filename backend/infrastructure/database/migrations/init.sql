
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7),
    icon VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'todo', 'in_progress', 'done', 'cancelled')),
    priority VARCHAR(10) DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta', 'urgente', 'low', 'medium', 'high', 'urgent')),
    due_date TIMESTAMP WITH TIME ZONE,
    estimated_duration INTEGER,
    actual_duration INTEGER,
    completed_at TIMESTAMP WITH TIME ZONE,
    tags TEXT[],
    metadata JSONB,
    natural_language_input TEXT,
    gpt_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gpt_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    input_hash VARCHAR(64) UNIQUE NOT NULL,
    input_text TEXT NOT NULL,
    output JSONB NOT NULL,
    model VARCHAR(50),
    tokens_used INTEGER,
    cost DECIMAL(10, 6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    access_count INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_gpt_cache_hash ON gpt_cache(input_hash);
