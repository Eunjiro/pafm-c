-- Add layers column to grave_plots (how many burial layers each plot can hold)
ALTER TABLE grave_plots 
ADD COLUMN IF NOT EXISTS layers INTEGER DEFAULT 1 NOT NULL;

-- Add check constraint to ensure layers is positive
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'layers_positive' 
        AND conrelid = 'grave_plots'::regclass
    ) THEN
        ALTER TABLE grave_plots 
        ADD CONSTRAINT layers_positive CHECK (layers > 0);
    END IF;
END $$;

-- Add layer column to burials (which specific layer this burial occupies)
ALTER TABLE burials 
ADD COLUMN IF NOT EXISTS layer INTEGER NOT NULL DEFAULT 1;

-- Add check constraint to ensure layer is positive
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'burials_layer_positive' 
        AND conrelid = 'burials'::regclass
    ) THEN
        ALTER TABLE burials 
        ADD CONSTRAINT burials_layer_positive CHECK (layer > 0);
    END IF;
END $$;

-- Add notes column to burials if it doesn't exist
ALTER TABLE burials 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comments for clarity
COMMENT ON COLUMN grave_plots.layers IS 'Number of burial layers available in this plot (e.g., 1 for single level, 2 for double-decker, etc.)';
COMMENT ON COLUMN burials.layer IS 'The specific layer number this burial occupies (1 = ground level, 2 = second level, etc.)';
COMMENT ON COLUMN burials.notes IS 'Additional notes or information about the burial';
