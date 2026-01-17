-- Add layer column to grave_plots table
ALTER TABLE grave_plots ADD COLUMN IF NOT EXISTS layer INTEGER NOT NULL DEFAULT 1;

-- Add layer column to burials table
ALTER TABLE burials ADD COLUMN IF NOT EXISTS layer INTEGER NOT NULL DEFAULT 1;

-- Add notes column to burials table
ALTER TABLE burials ADD COLUMN IF NOT EXISTS notes TEXT;

-- Fix foreign key to point to deceased table instead of deceased_persons
ALTER TABLE burials DROP CONSTRAINT IF EXISTS burials_deceased_id_fkey;
ALTER TABLE burials ADD CONSTRAINT burials_deceased_id_fkey 
  FOREIGN KEY (deceased_id) REFERENCES deceased(id) ON DELETE CASCADE;

-- Add comments for clarity
COMMENT ON COLUMN grave_plots.layer IS 'Number of burial layers this plot can hold (e.g., 2 = ground + second level)';
COMMENT ON COLUMN burials.layer IS 'The layer number in the plot (1 = ground level, 2 = second level, etc.)';
COMMENT ON COLUMN burials.notes IS 'Additional notes or information about the burial';
