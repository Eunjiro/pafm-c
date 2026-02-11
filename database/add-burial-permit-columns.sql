-- Add missing columns to burials table for permit integration

ALTER TABLE burials 
ADD COLUMN IF NOT EXISTS layer INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS permit_number VARCHAR(100);

-- Add index for permit lookups
CREATE INDEX IF NOT EXISTS idx_burials_permit_number ON burials(permit_number);

-- Add comment
COMMENT ON COLUMN burials.layer IS 'Layer number in multi-layer plots (1 = bottom/first layer)';
COMMENT ON COLUMN burials.permit_number IS 'Reference to the burial permit number from permit system';
