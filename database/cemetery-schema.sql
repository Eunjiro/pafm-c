-- Cemetery and Grave Mapping System Schema

-- Cemeteries table
CREATE TABLE IF NOT EXISTS cemeteries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    description TEXT,
    total_area DECIMAL(10, 2), -- in square meters or acres
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    established_year INTEGER,
    map_coordinates JSONB, -- Store polygon/boundary coordinates
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cemetery sections/blocks
CREATE TABLE IF NOT EXISTS cemetery_sections (
    id SERIAL PRIMARY KEY,
    cemetery_id INTEGER NOT NULL REFERENCES cemeteries(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    section_code VARCHAR(50),
    description TEXT,
    map_coordinates JSONB, -- Store polygon/boundary coordinates
    total_plots INTEGER DEFAULT 0,
    available_plots INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Grave plots
CREATE TABLE IF NOT EXISTS grave_plots (
    id SERIAL PRIMARY KEY,
    cemetery_id INTEGER NOT NULL REFERENCES cemeteries(id) ON DELETE CASCADE,
    section_id INTEGER REFERENCES cemetery_sections(id) ON DELETE SET NULL,
    plot_number VARCHAR(50) NOT NULL,
    plot_type VARCHAR(50), -- single, double, family, cremation, etc.
    status VARCHAR(50) DEFAULT 'available', -- available, occupied, reserved, unavailable
    size_length DECIMAL(5, 2), -- in meters or feet
    size_width DECIMAL(5, 2),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    map_coordinates JSONB, -- Exact position on map (x, y or lat/lng)
    price DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cemetery_id, plot_number)
);

-- Deceased persons
CREATE TABLE IF NOT EXISTS deceased_persons (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    maiden_name VARCHAR(100),
    date_of_birth DATE,
    date_of_death DATE,
    age_at_death INTEGER,
    gender VARCHAR(20),
    nationality VARCHAR(100),
    occupation VARCHAR(255),
    biography TEXT,
    photo_url VARCHAR(500),
    epitaph TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Burials (linking deceased to plots)
CREATE TABLE IF NOT EXISTS burials (
    id SERIAL PRIMARY KEY,
    plot_id INTEGER NOT NULL REFERENCES grave_plots(id) ON DELETE CASCADE,
    deceased_id INTEGER NOT NULL REFERENCES deceased_persons(id) ON DELETE CASCADE,
    burial_date DATE,
    burial_type VARCHAR(50), -- burial, cremation, etc.
    position_in_plot VARCHAR(50), -- top, bottom, left, right (for shared plots)
    is_primary BOOLEAN DEFAULT TRUE, -- primary occupant of the plot
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Next of kin / relatives
CREATE TABLE IF NOT EXISTS relatives (
    id SERIAL PRIMARY KEY,
    deceased_id INTEGER NOT NULL REFERENCES deceased_persons(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    relationship VARCHAR(100), -- spouse, child, parent, sibling, etc.
    contact_phone VARCHAR(50),
    contact_email VARCHAR(255),
    address TEXT,
    is_primary_contact BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cemeteries_active ON cemeteries(is_active);
CREATE INDEX IF NOT EXISTS idx_cemetery_sections_cemetery ON cemetery_sections(cemetery_id);
CREATE INDEX IF NOT EXISTS idx_grave_plots_cemetery ON grave_plots(cemetery_id);
CREATE INDEX IF NOT EXISTS idx_grave_plots_section ON grave_plots(section_id);
CREATE INDEX IF NOT EXISTS idx_grave_plots_status ON grave_plots(status);
CREATE INDEX IF NOT EXISTS idx_grave_plots_plot_number ON grave_plots(plot_number);
CREATE INDEX IF NOT EXISTS idx_deceased_name ON deceased_persons(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_deceased_death_date ON deceased_persons(date_of_death);
CREATE INDEX IF NOT EXISTS idx_burials_plot ON burials(plot_id);
CREATE INDEX IF NOT EXISTS idx_burials_deceased ON burials(deceased_id);
CREATE INDEX IF NOT EXISTS idx_relatives_deceased ON relatives(deceased_id);

-- Create triggers for updated_at
CREATE TRIGGER update_cemeteries_updated_at 
    BEFORE UPDATE ON cemeteries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cemetery_sections_updated_at 
    BEFORE UPDATE ON cemetery_sections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grave_plots_updated_at 
    BEFORE UPDATE ON grave_plots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deceased_persons_updated_at 
    BEFORE UPDATE ON deceased_persons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_burials_updated_at 
    BEFORE UPDATE ON burials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_relatives_updated_at 
    BEFORE UPDATE ON relatives
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
