-- Pending Permits Table
-- Stores approved burial permits from the permit system awaiting plot assignment

CREATE TABLE IF NOT EXISTS pending_permits (
  id SERIAL PRIMARY KEY,
  permit_id VARCHAR(100) UNIQUE NOT NULL,
  permit_type VARCHAR(50) NOT NULL, -- 'burial', 'exhumation', 'niche', 'entrance'
  
  -- Deceased person information
  deceased_first_name VARCHAR(100) NOT NULL,
  deceased_middle_name VARCHAR(100),
  deceased_last_name VARCHAR(100) NOT NULL,
  deceased_suffix VARCHAR(20),
  date_of_birth DATE,
  date_of_death DATE NOT NULL,
  gender VARCHAR(20),
  
  -- Applicant/Contact information
  applicant_name VARCHAR(255) NOT NULL,
  applicant_email VARCHAR(255),
  applicant_phone VARCHAR(50),
  relationship_to_deceased VARCHAR(100),
  
  -- Plot preference from permit application
  preferred_cemetery_id INTEGER REFERENCES cemeteries(id),
  preferred_plot_id INTEGER REFERENCES grave_plots(id),
  preferred_section VARCHAR(100),
  preferred_layer INTEGER,
  
  -- Permit details
  permit_approved_at TIMESTAMP NOT NULL,
  permit_expiry_date DATE,
  permit_document_url TEXT,
  
  -- Assignment status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'assigned', 'rejected', 'expired'
  assigned_plot_id INTEGER REFERENCES grave_plots(id),
  assigned_by INTEGER REFERENCES users(id),
  assigned_at TIMESTAMP,
  burial_id INTEGER REFERENCES burials(id),
  
  -- Admin notes
  admin_notes TEXT,
  rejection_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Additional data from permit system (JSON for flexibility)
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pending_permits_permit_id ON pending_permits(permit_id);
CREATE INDEX IF NOT EXISTS idx_pending_permits_status ON pending_permits(status);
CREATE INDEX IF NOT EXISTS idx_pending_permits_cemetery ON pending_permits(preferred_cemetery_id);
CREATE INDEX IF NOT EXISTS idx_pending_permits_created ON pending_permits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pending_permits_assigned_plot ON pending_permits(assigned_plot_id);

-- API Keys Table for external system authentication
CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  key_name VARCHAR(100) NOT NULL,
  api_key VARCHAR(255) UNIQUE NOT NULL,
  system_name VARCHAR(100) NOT NULL, -- 'permit_system', etc.
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{"read": true, "write": false}'::jsonb,
  last_used_at TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  
  -- IP whitelist
  allowed_ips TEXT[]
);

-- Indexes for API keys
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(api_key);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pending_permits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_pending_permits_updated_at ON pending_permits;
CREATE TRIGGER trigger_pending_permits_updated_at
  BEFORE UPDATE ON pending_permits
  FOR EACH ROW
  EXECUTE FUNCTION update_pending_permits_updated_at();

-- Comments for documentation
COMMENT ON TABLE pending_permits IS 'Stores approved burial permits from external permit system awaiting cemetery plot assignment';
COMMENT ON TABLE api_keys IS 'API keys for external system authentication and authorization';
COMMENT ON COLUMN pending_permits.permit_id IS 'Unique permit ID from the external permit system';
COMMENT ON COLUMN pending_permits.status IS 'pending: awaiting assignment, assigned: burial assigned, rejected: request denied, expired: permit expired';
COMMENT ON COLUMN api_keys.permissions IS 'JSON structure defining read/write permissions for the API key';
