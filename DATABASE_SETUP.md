# PostgreSQL Setup for Secure Login

## Prerequisites

1. **Install PostgreSQL**: Download from [postgresql.org](https://www.postgresql.org/download/)
2. **Install pgAdmin**: Included with PostgreSQL installer or download separately

## Setup Steps

### 1. Create Database

Open pgAdmin and:
1. Connect to your PostgreSQL server (default: localhost)
2. Right-click "Databases" → "Create" → "Database"
3. Name it `pafm_db`
4. Click "Save"

Alternatively, use psql command:
```bash
psql -U postgres
CREATE DATABASE pafm_db;
\q
```

### 2. Configure Environment Variables

Create `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your PostgreSQL credentials:
```env
JWT_SECRET=your-secure-random-string-here
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/pafm_db
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your_password
PGDATABASE=pafm_db
NODE_ENV=development
```

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Test Database Connection

```bash
npm run db:test
```

Expected output:
```
✅ Database connection successful!
📋 Tables found: (none yet)
```

### 4. Run Database Migration

Create the users and login_attempts tables:

```bash
npm run db:migrate
```

Expected output:
```
✅ Database schema created successfully!
📋 Tables in database: [ 'users', 'login_attempts' ]
```

### 5. Seed Test Users

```bash
npm run db:seed
```

Expected output:
```
✅ Created user: admin@example.com
✅ Created user: user@example.com
✅ Created user: john.doe@example.com

📝 Test credentials:
   Email: admin@example.com
   Password: Admin123!
   ...
```

### 6. Start the Application

```bash
npm run dev
```

Visit `http://localhost:3000/login` and login with any seeded user.

## Plot Coordinates System

The system uses a dual-coordinate approach for grave plots to support both precise mapping and efficient search:

### Coordinate Fields

1. **`map_coordinates` (JSONB)**: Polygon coordinates defining the exact plot boundaries
   - Format: Array of [latitude, longitude] pairs, e.g., `[[lat1, lng1], [lat2, lng2], ...]`
   - Used for: Drawing plots on the map, visual boundaries

2. **`latitude` & `longitude` (DECIMAL)**: Center point coordinates
   - Format: Single lat/lng pair representing the plot's center
   - Automatically calculated from polygon boundaries
   - Used for: Grave locator feature, search, and quick positioning

### How It Works

When creating a plot:
1. User draws a polygon on the map (sets `map_coordinates`)
2. System automatically calculates the center point
3. Both polygon and center coordinates are saved
4. Grave locator uses center coordinates to quickly zoom to the plot location

### Update Existing Plots

If you have existing plots without center coordinates, run:

```bash
npx tsx scripts/update-plot-coordinates.ts
```

This script will:
- Find all plots with `map_coordinates` but missing `latitude`/`longitude`
- Calculate center points from polygon coordinates
- Update the database automatically

## Database Schema

### users table
```sql
- id: SERIAL PRIMARY KEY
- email: VARCHAR(255) UNIQUE NOT NULL
- password_hash: VARCHAR(255) NOT NULL
- name: VARCHAR(255) NOT NULL
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- last_login: TIMESTAMP
- is_active: BOOLEAN
```

### login_attempts table
```sql
- id: SERIAL PRIMARY KEY
- ip_address: VARCHAR(45) NOT NULL
- attempt_time: TIMESTAMP
- success: BOOLEAN
```

## Verify in pgAdmin

1. Open pgAdmin
2. Navigate to: Servers → PostgreSQL → Databases → pafm_db → Schemas → public → Tables
3. Right-click `users` → View/Edit Data → All Rows
4. You should see the seeded users

## Troubleshooting

### Connection refused
- Ensure PostgreSQL service is running
- Check port 5432 is not blocked
- Verify credentials in `.env.local`

### Authentication failed
- Check your PostgreSQL user password
- Try: `psql -U postgres -d pafm_db` to verify credentials

### Tables not found
- Run migration: `npm run db:migrate`
- Check schema.sql was executed properly

### Permission denied
- Ensure PostgreSQL user has proper privileges
- Grant privileges: `GRANT ALL PRIVILEGES ON DATABASE pafm_db TO postgres;`

## Production Notes

1. Use connection pooling (already implemented)
2. Set strong JWT_SECRET
3. Use SSL for database connections
4. Implement backup strategy
5. Set up database monitoring
6. Configure proper user roles and permissions
7. Enable PostgreSQL logging
8. Regular security updates

## Available npm Scripts

- `npm run db:test` - Test database connection
- `npm run db:migrate` - Create/update database schema
- `npm run db:seed` - Seed test users
- `npm run dev` - Start development server

## Navigation Features (OpenRouteService)

The grave locator includes AI-powered navigation using OpenRouteService API:

### Setup

1. Get a free API key from [OpenRouteService](https://openrouteservice.org/dev/#/signup)
2. Add to your `.env.local`:
   ```
   NEXT_PUBLIC_OPENROUTESERVICE_API_KEY=your-api-key-here
   ```

### Features

- **Real-time Directions**: Get turn-by-turn directions from your location to any grave
- **Multiple Travel Modes**: Choose between walking, driving, or cycling
- **Route Visualization**: See your route on the map with distance and time estimates
- **Step-by-step Instructions**: Detailed navigation instructions for each turn

### Usage

1. Navigate to the Grave Locator page for any cemetery
2. Search for a deceased person
3. Click "Get Directions" button
4. Allow location access when prompted
5. Select your preferred travel mode (walking/driving/cycling)
6. View route on map and follow turn-by-turn directions

The system automatically:
- Calculates optimal routes using OpenRouteService AI
- Shows distance and estimated travel time
- Displays your current location with a blue marker
- Draws the route on the map with a dashed blue line
- Highlights the destination grave with a pulsing red marker
