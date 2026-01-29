# PAFM-C: Cemetery & Grave Management System

Admin-only cemetery management system with interactive mapping, AI-powered grave locator, and comprehensive burial tracking.

## Features

- 🗺️ **Interactive Cemetery Mapping** - Plot grave locations using React Leaflet with drawing tools
- 🤖 **AI-Powered Search** - Natural language search for deceased persons using OpenAI
- 📍 **Turn-by-Turn Navigation** - OpenRouteService integration for grave location navigation
- 📋 **Comprehensive Records** - Track deceased persons, burials, relatives, and facilities
- 🔒 **Secure Authentication** - JWT-based auth with rate limiting
- ⏰ **Burial Expiration Tracking** - 5-year burial periods with automatic expiration alerts
- 📅 **Plot Reservations** - Reserve plots for future use with expiry management
- 🔄 **Renewal System** - Easy burial period renewal with admin controls

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- OpenAI API key (optional, for AI search)

### Installation

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with your database and API keys

# Setup database
npm run db:test              # Test connection
npm run db:migrate           # Create users tables
npm run db:migrate:cemetery  # Create cemetery tables
npm run db:migrate:reservation # Add reservation & expiration features
npm run db:seed              # Seed test user (admin@example.com / Admin123!)

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and login with `admin@example.com` / `Admin123!`

## New Features: Reservations & Expiration

### 5-Year Burial Period
All burials automatically expire after 5 years. The system:
- Calculates expiration dates automatically
- Tracks days until expiration
- Flags expired burials
- Supports renewal for additional years

### Plot Reservations
Reserve plots for future use with:
- Customizable reservation periods
- Automatic expiry cleanup
- Reservation notes and tracking
- Status management (available/reserved/occupied)

**See [RESERVATION_GUIDE.md](RESERVATION_GUIDE.md) for complete documentation.**

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout

### Cemeteries
- `GET /api/cemeteries` - List all cemeteries
- `POST /api/cemeteries` - Create cemetery
- `GET /api/cemeteries/:id` - Get cemetery details
- `PUT /api/cemeteries/:id` - Update cemetery
- `DELETE /api/cemeteries/:id` - Delete cemetery

### Plots
- `GET /api/plots?cemetery_id=1` - List plots
- `POST /api/plots` - Create plot
- `PUT /api/plots/:id` - Update plot
- `DELETE /api/plots/:id` - Delete plot

### Plot Reservations (NEW)
- `POST /api/plots/reserve` - Reserve a plot
- `DELETE /api/plots/reserve?plot_id=1` - Cancel reservation
- `GET /api/plots/reserve?cemetery_id=1` - List reserved plots

### Burials
- `GET /api/burials?plot_id=1` - List burials (with expiration info)
- `POST /api/burials` - Create burial (auto-calculates expiration)
- `GET /api/burials/:id` - Get burial details
- `PUT /api/burials/:id` - Update burial
- `DELETE /api/burials/:id` - Delete burial

### Burial Renewal (NEW)
- `POST /api/burials/renew` - Renew burial period
- `GET /api/burials/renew?expiring=true` - Get expiring burials (90 days)
- `GET /api/burials/renew?cemetery_id=1` - Get expired burials

### Deceased Persons
- `GET /api/deceased` - List deceased persons
- `POST /api/deceased` - Create deceased person record
- `GET /api/deceased/search?q=name` - Search deceased
- `GET /api/deceased/ai-search?q=natural language` - AI-powered search

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with pg driver
- **Mapping**: React Leaflet + Leaflet Draw
- **Navigation**: OpenRouteService API
- **AI**: OpenAI GPT-3.5
- **Auth**: JWT (jose library) + bcryptjs
- **Validation**: Zod
- **Rate Limiting**: rate-limiter-flexible

## Database Scripts

```bash
npm run db:test                  # Test database connection
npm run db:migrate               # Create users/auth tables
npm run db:migrate:cemetery      # Create cemetery tables
npm run db:migrate:reservation   # Add reservation & expiration features
npm run db:seed                  # Seed test users
npm run db:clear-attempts        # Clear login rate limits
```

## Environment Variables

Required in `.env.local`:

```env
# Database (choose one method)
# Method 1: Individual variables
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your_password
PGDATABASE=cemetery_db

# Method 2: Connection string (for Vercel/cloud)
POSTGRES_URL=postgresql://user:pass@host:5432/db

# Authentication
JWT_SECRET=your_secret_key_here

# Optional: AI Search
OPENAI_API_KEY=sk-...

# Optional: Navigation
OPENROUTE_API_KEY=your_key
```

Generate JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Project Structure

```
app/
  ├── api/              # API route handlers
  │   ├── auth/         # Authentication endpoints
  │   ├── burials/      # Burial management + renewal
  │   ├── cemeteries/   # Cemetery management
  │   ├── deceased/     # Deceased person records + AI search
  │   ├── plots/        # Plot management + reservations
  │   └── directions/   # Navigation/routing
  ├── dashboard/        # Admin dashboard pages
  └── login/           # Login page
components/            # React components (maps, navbar)
lib/                   # Utilities (db, validation, AI)
database/             # SQL schema files
scripts/              # Database migration scripts
```

## Key Features Detail

### Interactive Mapping
- Draw cemetery boundaries as polygons
- Mark individual grave plots with coordinates
- Visual plot status indicators
- Click plots for detailed information

### AI-Powered Search
Supports natural language queries:
- "Where is Maria Santos buried?"
- "Find my grandmother who died in 1985"
- "Search for Jose Rizal the national hero"

Falls back to basic keyword search if OpenAI key not configured.

### Turn-by-Turn Navigation
- Get walking/driving directions to graves
- Uses OpenRouteService for routing
- Displays route on map with step-by-step instructions

### Burial Expiration System
- Automatic 5-year expiration calculation
- Visual indicators for expiring/expired burials
- Easy renewal process with admin controls
- Expiration notifications (90/60/30 days)

## Security

- JWT-based authentication with httpOnly cookies
- Rate limiting (10 login attempts per 15 minutes per IP)
- Parameterized SQL queries to prevent injection
- Security headers (HSTS, X-Frame-Options, CSP)
- Admin-only access to all features

## Development

```bash
npm run dev     # Development server (hot reload)
npm run build   # Production build
npm run start   # Start production server
npm run lint    # Run ESLint
```

## Documentation

- [DATABASE_SETUP.md](DATABASE_SETUP.md) - Database configuration guide
- [RESERVATION_GUIDE.md](RESERVATION_GUIDE.md) - Reservation & expiration features
- [SECURITY.md](SECURITY.md) - Security best practices
- [.github/copilot-instructions.md](.github/copilot-instructions.md) - AI coding guide

## License

Private project - All rights reserved

## Support

For issues or questions, contact the development team.
