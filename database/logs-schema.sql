-- System Activity Logs Table
CREATE TABLE IF NOT EXISTS system_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  description TEXT,
  resource_type VARCHAR(50),
  resource_id INTEGER,
  ip_address VARCHAR(45),
  user_agent TEXT,
  status VARCHAR(20) DEFAULT 'success',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_action ON system_logs(action);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_resource ON system_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_logs_status ON system_logs(status);

-- Add some comments
COMMENT ON TABLE system_logs IS 'Tracks all system activities and user actions';
COMMENT ON COLUMN system_logs.action IS 'Type of action performed (e.g., login, create, update, delete)';
COMMENT ON COLUMN system_logs.resource_type IS 'Type of resource affected (e.g., cemetery, plot, burial)';
COMMENT ON COLUMN system_logs.status IS 'Status of the action (success, error, warning)';
