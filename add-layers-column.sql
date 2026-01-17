-- Add layers column to grave_plots table
ALTER TABLE grave_plots 
ADD COLUMN IF NOT EXISTS layers INTEGER DEFAULT 1 NOT NULL;

-- Add check constraint to ensure layers is positive
ALTER TABLE grave_plots 
ADD CONSTRAINT layers_positive CHECK (layers > 0);

-- Add comment to explain the column
COMMENT ON COLUMN grave_plots.layers IS 'Number of burial layers available in this plot (e.g., 1 for single level, 2 for double-decker, etc.)';
