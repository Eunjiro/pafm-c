# PAFM-C: Cemetery & Grave Management System - AI Coding Instructions

## Architecture Overview

**Tech Stack**: Next.js 16 (App Router), TypeScript, PostgreSQL, React Leaflet, Zod validation, JWT auth, OpenAI  
**Purpose**: Admin-only cemetery management system with interactive mapping, AI-powered grave locator, and navigation features

### Key Components
- **API Routes** (`app/api/*`): RESTful endpoints following Next.js 16 route handlers pattern (GET/POST/PUT/DELETE exports)
- **Database Layer** (`lib/db.ts`): PostgreSQL pool with helper functions `query()` and `queryOne()` 
- **Authentication** (`middleware.ts`): JWT-based with rate limiting (10 attempts/15min per IP)
- **Map Components**: React Leaflet with draw controls for cemetery boundaries and grave plot polygons
- **AI Search** (`lib/ai-search.ts`): OpenAI-powered natural language query parsing for deceased person search

## Database Architecture

**Core Tables**: users, login_attempts, cemeteries, cemetery_sections, grave_plots, deceased_persons, burials, relatives, facilities

**Key Patterns**:
- Coordinates stored as JSONB: `map_coordinates` field for polygons (array of [lat, lng] pairs)
- Grave plots use dual coordinate system: `map_coordinates` (JSONB polygon) OR `latitude`/`longitude` columns
- Always use parameterized queries via `query()` helper from `@/lib/db`

**Migration Scripts**: Run via `tsx scripts/*.ts` (see `package.json` scripts section)

## Critical Conventions

### 1. API Route Structure
```typescript
// All API routes export async functions: GET, POST, PUT, DELETE
export async function GET(request: NextRequest) {
  const data = await query('SELECT * FROM table');
  return NextResponse.json({ data });
}
```

### 2. Validation Pattern
Use Zod schemas defined inline or in `lib/validation.ts`:
```typescript
const schema = z.object({
  email: z.string().email().transform(e => e.toLowerCase().trim()),
  // ... other fields
});
const validated = schema.parse(body);
```

### 3. Authentication Flow
- `middleware.ts` verifies JWT token in cookie `auth-token` for all non-public routes
- Login endpoint at `/api/auth/login` uses bcrypt + JWT with rate limiting
- Rate limiter uses `rate-limiter-flexible` library + database logging in `login_attempts` table

### 4. Map Coordinate Handling
**Cemetery boundaries**: Array of [lat, lng] pairs stored in `map_coordinates` JSONB  
**Grave plots**: Can use either:
- JSONB polygon in `map_coordinates` field
- Individual `latitude`/`longitude` columns

When rendering maps, always check both coordinate formats:
```typescript
if (plot.latitude && plot.longitude) {
  // Use lat/lng columns
} else if (Array.isArray(plot.map_coordinates)) {
  // Use JSONB polygon
}
```

### 5. Client-Side Mapping
- Use `dynamic import` with `{ ssr: false }` for Leaflet components (prevents SSR errors)
- Fix Leaflet icon URLs manually (see `components/CemeteryMap.tsx` lines 11-15)
- OpenRouteService integration proxied through `/api/directions` to avoid CORS

## Developer Workflows

### Database Setup
```bash
npm run db:test           # Test connection
npm run db:migrate        # Create users/login_attempts tables
npm run db:migrate:cemetery  # Create cemetery tables
npm run db:seed           # Seed test users (admin@example.com / Admin123!)
npm run db:clear-attempts # Clear rate limit attempts
```

### Development
```bash
npm run dev    # Start dev server on :3000
npm run build  # Production build
npm run lint   # ESLint check
```

### Environment Setup
Required in `.env.local`:
- `JWT_SECRET` (generate via `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`)
- `DATABASE_URL` or individual PG* vars (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE)
- Optional: `POSTGRES_URL` for Vercel/cloud deployments (enables SSL)
- Optional: `OPENAI_API_KEY` for AI-powered search (falls back to basic parsing without it)

## Security Patterns

1. **Rate Limiting**: Login attempts tracked both in-memory (`rate-limiter-flexible`) and database (`login_attempts` table)
2. **SQL Injection Prevention**: Always use parameterized queries via `query(sql, [params])`
3. **Auth Cookie**: JWT stored in httpOnly cookie `auth-token`
4. **Security Headers**: Set in middleware (HSTS, X-Frame-Options, CSP via Permissions-Policy)

## Common Gotchas

- **Leaflet SSR**: Always use `dynamic(() => import(...), { ssr: false })` for map components
- **Coordinate Systems**: Check both JSONB and lat/lng columns when querying plots
- **Database Pool**: Don't create new Pool instances - import from `lib/db.ts`
- **Route Handlers**: Must export named functions (GET/POST/PUT/DELETE), not default exports
- **Type Safety**: Cemetery/Plot interfaces often have optional coordinates - always null-check
AI-Powered Natural Language Search

The system uses OpenAI GPT-3.5 to parse natural language queries and extract structured search parameters.

**Example Queries**:
- "Where is Maria Santos buried?"
- "Find my grandmother who died in 1985"
- "Juan dela Cruz, born 1950"
- "Search for Jose Rizal the national hero"

**Implementation**: 
- API endpoint: `/api/deceased/ai-search?q=<query>&cemetery_id=<optional>`
- AI service: `lib/ai-search.ts` with `parseNaturalLanguageQuery()` function
- Fallback: If `OPENAI_API_KEY` not set, uses regex-based basic parsing
- Query params: Add `&ai=false` to disable AI and use basic keyword search

**AI extracts**: Names (first/middle/last), dates (birth/death), years, age, gender, occupation, relationships

## File Locations for Common Tasks

- **Add API endpoint**: `app/api/[resource]/route.ts` (follow existing CRUD patterns)
- **Database schema**: `database/*.sql` (run via `tsx scripts/migrate-*.ts`)
- **Add validation**: `lib/validation.ts` (use Zod schemas)
- **Map features**: `components/*Map.tsx` (CemeteryMap, GraveLocatorMap, PlotMap)
- **Auth logic**: `middleware.ts` and `app/api/auth/*/route.ts`
- **AI search**: `lib/ai-search.ts` and `app/api/deceased/ai-searchp, GraveLocatorMap, PlotMap)
- **Auth logic**: `middleware.ts` and `app/api/auth/*/route.ts`
