-- Create facilities table
CREATE TABLE IF NOT EXISTS facilities (
    id SERIAL PRIMARY KEY,
    cemetery_id INTEGER NOT NULL REFERENCES cemeteries(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    facility_type VARCHAR(100) NOT NULL, -- chapel, office, restroom, parking, gate, etc.
    description TEXT,
    map_coordinates JSONB NOT NULL, -- Array of [lat, lng] for polygon or single point
    latitude DECIMAL(10, 8), -- Center point latitude
    longitude DECIMAL(11, 8), -- Center point longitude
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_facilities_cemetery ON facilities(cemetery_id);
CREATE INDEX IF NOT EXISTS idx_facilities_type ON facilities(facility_type);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_facilities_updated_at 
    BEFORE UPDATE ON facilities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add some comments for documentation
COMMENT ON TABLE facilities IS 'Stores cemetery facility locations and information';
COMMENT ON COLUMN facilities.facility_type IS 'Type of facility: chapel, office, restroom, parking, gate, crematorium, columbarium, garden, pond, fountain, etc.';
COMMENT ON COLUMN facilities.map_coordinates IS 'GeoJSON-like array of coordinates for polygon or point marker';
