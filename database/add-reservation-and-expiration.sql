-- Add reservation and expiration features to cemetery management system

-- Add reservation columns to grave_plots
ALTER TABLE grave_plots 
ADD COLUMN IF NOT EXISTS reserved_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS reserved_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reservation_expiry TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reservation_notes TEXT;

-- Add expiration date to burials (5 years from burial date)
ALTER TABLE burials
ADD COLUMN IF NOT EXISTS expiration_date DATE,
ADD COLUMN IF NOT EXISTS renewal_date DATE,
ADD COLUMN IF NOT EXISTS is_expired BOOLEAN DEFAULT FALSE;

-- Create index for faster queries on expiration
CREATE INDEX IF NOT EXISTS idx_burials_expiration_date ON burials(expiration_date);
CREATE INDEX IF NOT EXISTS idx_burials_is_expired ON burials(is_expired);
CREATE INDEX IF NOT EXISTS idx_plots_status ON grave_plots(status);
CREATE INDEX IF NOT EXISTS idx_plots_reserved_by ON grave_plots(reserved_by);

-- Update existing burials to set expiration_date (5 years from burial_date)
UPDATE burials 
SET expiration_date = burial_date + INTERVAL '5 years'
WHERE burial_date IS NOT NULL AND expiration_date IS NULL;

-- Update is_expired flag for existing burials
UPDATE burials
SET is_expired = TRUE
WHERE expiration_date IS NOT NULL AND expiration_date < CURRENT_DATE;

-- Create function to automatically update plot status when burial is added
CREATE OR REPLACE FUNCTION update_plot_status_on_burial()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE grave_plots
    SET status = 'occupied',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.plot_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic plot status update
DROP TRIGGER IF EXISTS trigger_update_plot_status ON burials;
CREATE TRIGGER trigger_update_plot_status
AFTER INSERT ON burials
FOR EACH ROW
EXECUTE FUNCTION update_plot_status_on_burial();

-- Create function to check and update expired burials
CREATE OR REPLACE FUNCTION check_burial_expiration()
RETURNS void AS $$
BEGIN
    UPDATE burials
    SET is_expired = TRUE
    WHERE expiration_date IS NOT NULL 
    AND expiration_date < CURRENT_DATE 
    AND is_expired = FALSE;
END;
$$ LANGUAGE plpgsql;

-- Comment documentation
COMMENT ON COLUMN grave_plots.reserved_by IS 'Name or identifier of person who reserved the plot';
COMMENT ON COLUMN grave_plots.reserved_date IS 'Date when the plot was reserved';
COMMENT ON COLUMN grave_plots.reservation_expiry IS 'Date when the reservation expires';
COMMENT ON COLUMN burials.expiration_date IS 'Date when burial period expires (5 years from burial date)';
COMMENT ON COLUMN burials.renewal_date IS 'Date when burial period was last renewed';
COMMENT ON COLUMN burials.is_expired IS 'Flag indicating if burial period has expired';
