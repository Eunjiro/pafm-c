# Reservation & Expiration Features - Admin Guide

## Overview
The cemetery management system now includes:
- **Plot Reservations**: Reserve plots for future use
- **5-Year Burial Period**: All burials expire after 5 years
- **Expiration Tracking**: Automatic tracking and renewal system
- **Admin-Only Features**: All features restricted to admin users

## Database Setup

Run the migration to add new columns and triggers:

```bash
npm run db:migrate:reservation
```

### What Gets Added:
- **grave_plots**: `reserved_by`, `reserved_date`, `reservation_expiry`, `reservation_notes`
- **burials**: `expiration_date`, `renewal_date`, `is_expired`
- Indexes for performance
- Automatic triggers for plot status updates

## API Endpoints

### 1. Plot Reservation

#### Reserve a Plot
```
POST /api/plots/reserve
{
  "plot_id": 123,
  "reserved_by": "John Doe",
  "reservation_notes": "Family plot reservation",
  "reservation_days": 30  // Optional, defaults to 30 days
}
```

#### Cancel Reservation
```
DELETE /api/plots/reserve?plot_id=123
```

#### Get All Reserved Plots
```
GET /api/plots/reserve?cemetery_id=1
GET /api/plots/reserve?cemetery_id=1&check_expired=true  // Also cleans up expired reservations
```

**Response includes:**
- All reservation details
- `days_until_expiry` - Days remaining before reservation expires
- Sorted by expiration date

### 2. Burial Expiration

#### Create Burial (Auto-calculates Expiration)
```
POST /api/burials
{
  "plot_id": 123,
  "deceased_id": 456,
  "burial_date": "2025-01-29",
  "layer": 1,
  "notes": "Optional notes"
}
```
**Automatically sets:** `expiration_date` = burial_date + 5 years

#### Get Burials (With Expiration Info)
```
GET /api/burials?plot_id=123
GET /api/burials?cemetery_id=1
```

**Response includes:**
- `is_expired` - Boolean flag
- `days_until_expiration` - Days until/past expiration
- `expiration_date` - The actual expiration date

#### Get Expired/Expiring Burials
```
GET /api/burials/renew?cemetery_id=1              // All expired burials
GET /api/burials/renew?expiring=true              // Expiring within 90 days
GET /api/burials/renew?cemetery_id=1&expiring=true
```

### 3. Burial Renewal

#### Renew a Burial Period
```
POST /api/burials/renew
{
  "burial_id": 789,
  "years": 5  // Optional, defaults to 5 years (max 10)
}
```

**Logic:**
- If expired: Renews from today + years
- If not expired: Extends from current expiration + years
- Updates `renewal_date` to current date
- Sets `is_expired` to false

## Plot Status Flow

```
available → reserved → occupied
     ↑         ↓
     └─────────┘
   (reservation expires or cancelled)
```

**Status Values:**
- `available` - Plot is free for reservation/use
- `reserved` - Plot is reserved (temporary hold)
- `occupied` - Plot has an active burial
- `unavailable` - Plot cannot be used (damaged, etc.)

## Automatic Features

### 1. Plot Status on Burial
When a burial is created, the plot status automatically updates to `occupied` via database trigger.

### 2. Expiration Calculation
When creating a burial with a `burial_date`, the system automatically calculates:
```
expiration_date = burial_date + 5 years
```

### 3. Reservation Expiry Check
Call the endpoint with `check_expired=true` to automatically cancel expired reservations:
```
GET /api/plots/reserve?check_expired=true
```

## Admin Dashboard Integration

### Display Expiration Status
```typescript
// In your burial listing component
{burial.is_expired ? (
  <span className="text-red-600">EXPIRED</span>
) : burial.days_until_expiration < 90 ? (
  <span className="text-yellow-600">
    Expires in {burial.days_until_expiration} days
  </span>
) : (
  <span className="text-green-600">Active</span>
)}
```

### Renewal Button
```typescript
async function renewBurial(burialId: number) {
  const response = await fetch('/api/burials/renew', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ burial_id: burialId, years: 5 })
  });
  
  if (response.ok) {
    alert('Burial renewed successfully');
    // Refresh data
  }
}
```

### Reservation Form
```typescript
async function reservePlot(plotId: number, name: string) {
  const response = await fetch('/api/plots/reserve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      plot_id: plotId,
      reserved_by: name,
      reservation_days: 30
    })
  });
  
  if (response.ok) {
    alert('Plot reserved successfully');
  }
}
```

## Security Notes

All these endpoints require authentication via the JWT middleware. Only admin users should have access.

**Middleware Protection:**
- All `/api/*` routes except `/api/auth/login` are protected
- JWT token must be present in `auth-token` cookie
- Rate limiting applies to all endpoints

## Database Maintenance

### Check Expired Burials
Run this periodically (could be a cron job):
```sql
SELECT check_burial_expiration();
```

### Manual Expiration Update
```sql
UPDATE burials
SET is_expired = TRUE
WHERE expiration_date < CURRENT_DATE AND is_expired = FALSE;
```

### View Expiration Report
```sql
SELECT 
  b.id,
  d.first_name || ' ' || d.last_name as deceased_name,
  gp.plot_number,
  b.burial_date,
  b.expiration_date,
  b.is_expired,
  EXTRACT(DAYS FROM (b.expiration_date - CURRENT_DATE)) as days_remaining
FROM burials b
JOIN deceased_persons d ON b.deceased_id = d.id
JOIN grave_plots gp ON b.plot_id = gp.id
WHERE b.expiration_date IS NOT NULL
ORDER BY b.expiration_date ASC;
```

## Example Workflows

### Workflow 1: Reserve and Bury
1. Customer wants to reserve a plot
   ```
   POST /api/plots/reserve
   { "plot_id": 1, "reserved_by": "Smith Family" }
   ```
2. Plot status becomes `reserved`
3. When ready to bury:
   ```
   POST /api/burials
   { "plot_id": 1, "deceased_id": 100, "burial_date": "2025-01-29" }
   ```
4. Plot status automatically becomes `occupied`
5. Expiration date automatically set to `2030-01-29` (5 years)

### Workflow 2: Renewal
1. View expiring burials:
   ```
   GET /api/burials/renew?expiring=true
   ```
2. Select burial to renew
3. Renew for 5 more years:
   ```
   POST /api/burials/renew
   { "burial_id": 50, "years": 5 }
   ```
4. Expiration date extends 5 years from previous expiration

### Workflow 3: Cancel Reservation
1. View all reservations:
   ```
   GET /api/plots/reserve?cemetery_id=1
   ```
2. Cancel specific reservation:
   ```
   DELETE /api/plots/reserve?plot_id=5
   ```
3. Plot returns to `available` status

## Troubleshooting

### Issue: Expiration not calculating
**Solution:** Ensure `burial_date` is provided when creating burial

### Issue: Reservation won't cancel
**Check:** 
- Plot status must be `reserved`
- Use correct plot_id

### Issue: Can't reserve occupied plot
**This is correct behavior** - only `available` plots can be reserved

## Next Steps

Consider adding:
- Email notifications for expiring burials (30/60/90 days before)
- Automated reservation expiry cleanup (cron job)
- Payment tracking for renewals
- Grace period handling for expired burials
- Bulk renewal operations
