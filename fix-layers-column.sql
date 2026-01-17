-- Fix layers column issue: remove old 'layer' column, keep 'layers'

-- First, copy data from layer to layers if layers is null
UPDATE grave_plots 
SET layers = COALESCE(layers, layer, 1) 
WHERE layers IS NULL OR layer IS NOT NULL;

-- Drop the old 'layer' column (singular)
ALTER TABLE grave_plots 
DROP COLUMN IF EXISTS layer;

-- Ensure layers has proper constraints
ALTER TABLE grave_plots 
ALTER COLUMN layers SET NOT NULL,
ALTER COLUMN layers SET DEFAULT 1;

-- Ensure the check constraint exists
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
