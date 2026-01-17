CREATE TABLE IF NOT EXISTS deceased (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  date_of_birth DATE,
  date_of_death DATE NOT NULL,
  place_of_birth VARCHAR(200),
  place_of_death VARCHAR(200),
  cause_of_death TEXT,
  gender VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
