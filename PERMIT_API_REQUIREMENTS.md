# Cemetery System - External Permit API Requirements

## Endpoint
```
POST https://pafm-cemetery-system.vercel.app/api/external/permits
```

## Authentication
```
Authorization: Bearer pk_dec7b8a49db514e873ed6be76d9c7b9fe727320c9a25beeda71736192c222c53
```

## Required Headers
```
Content-Type: application/json
Authorization: Bearer <API_KEY>
```

## Request Body Structure

### ✅ REQUIRED FIELDS

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `permit_id` | string | Unique permit identifier | `"PERMIT-2026-001"` |
| `permit_type` | enum | Must be one of: `"burial"`, `"exhumation"`, `"niche"`, `"entrance"` | `"burial"` |
| `deceased_first_name` | string | First name of deceased | `"Juan"` |
| `deceased_last_name` | string | Last name of deceased | `"Dela Cruz"` |
| `date_of_death` | string | ISO 8601 date string | `"2026-02-10"` or `"2026-02-10T14:30:00Z"` |
| `applicant_name` | string | Full name of applicant | `"Maria Dela Cruz"` |
| `permit_approved_at` | string | ISO 8601 timestamp when permit was approved | `"2026-02-11T10:00:00Z"` |

### 📋 OPTIONAL FIELDS

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `deceased_middle_name` | string | Middle name | `"Santos"` |
| `deceased_suffix` | string | Suffix (Jr., Sr., III) | `"Jr."` |
| `date_of_birth` | string | ISO 8601 date | `"1950-01-15"` |
| `gender` | string | Gender | `"male"` or `"female"` |
| `applicant_email` | string (email) | **Must be valid email format** | `"maria@example.com"` |
| `applicant_phone` | string | Phone number | `"+63 912 345 6789"` |
| `relationship_to_deceased` | string | Relationship | `"Daughter"` |
| `preferred_cemetery_id` | number | Cemetery ID from system | `1` |
| `preferred_plot_id` | number | Plot ID from system | `10` |
| `preferred_section` | string | Section name | `"Section A"` |
| `preferred_layer` | number | Layer number | `1` |
| `permit_expiry_date` | string | ISO 8601 timestamp | `"2026-03-11T10:00:00Z"` |
| `permit_document_url` | string (URL) | **Must be valid URL format** | `"https://example.com/permit.pdf"` |
| `metadata` | object | Additional key-value data | `{"notes": "Special request"}` |

## Example Valid Request

```json
{
  "permit_id": "PERMIT-2026-00123",
  "permit_type": "burial",
  "deceased_first_name": "Juan",
  "deceased_middle_name": "Cruz",
  "deceased_last_name": "Dela Cruz",
  "date_of_birth": "1950-01-15",
  "date_of_death": "2026-02-10",
  "gender": "male",
  "applicant_name": "Maria Dela Cruz",
  "applicant_email": "maria@example.com",
  "applicant_phone": "+63 912 345 6789",
  "relationship_to_deceased": "Daughter",
  "preferred_section": "Section A",
  "preferred_layer": 1,
  "permit_approved_at": "2026-02-11T10:00:00.000Z",
  "permit_expiry_date": "2026-03-11T10:00:00.000Z",
  "permit_document_url": "https://permit-system.example.com/permits/123.pdf",
  "metadata": {
    "notes": "Family plot request",
    "priority": "normal"
  }
}
```

## Common Validation Errors

### ❌ Invalid Email Format
```json
// WRONG:
"applicant_email": "not-an-email"

// CORRECT:
"applicant_email": "user@example.com"
// OR omit the field entirely if no email
```

### ❌ Invalid URL Format
```json
// WRONG:
"permit_document_url": "not-a-url"

// CORRECT:
"permit_document_url": "https://example.com/document.pdf"
// OR omit the field entirely if no URL
```

### ❌ Invalid permit_type
```json
// WRONG:
"permit_type": "regular"

// CORRECT (must be one of these):
"permit_type": "burial"
"permit_type": "exhumation"
"permit_type": "niche"
"permit_type": "entrance"
```

### ❌ Missing Required Fields
```json
// WRONG (missing required fields):
{
  "permit_id": "PERMIT-123",
  "deceased_first_name": "Juan"
}

// CORRECT (includes ALL required fields):
{
  "permit_id": "PERMIT-123",
  "permit_type": "burial",
  "deceased_first_name": "Juan",
  "deceased_last_name": "Dela Cruz",
  "date_of_death": "2026-02-10",
  "applicant_name": "Maria Dela Cruz",
  "permit_approved_at": "2026-02-11T10:00:00Z"
}
```

## Success Response (201 Created)
```json
{
  "message": "Permit received successfully",
  "permit": {
    "id": 1,
    "permit_id": "PERMIT-2026-00123",
    "status": "pending",
    "created_at": "2026-02-11T14:30:00.000Z"
  }
}
```

## Error Response (400 Bad Request)
```json
{
  "error": "Validation failed",
  "details": [
    {
      "code": "invalid_string",
      "message": "Invalid email",
      "path": ["applicant_email"]
    }
  ]
}
```

## Quick Checklist for Permit System

Before sending a permit, verify:

- [ ] `Authorization` header includes the API key
- [ ] `Content-Type` is `application/json`
- [ ] All 7 required fields are present
- [ ] `permit_type` is one of: burial, exhumation, niche, entrance
- [ ] `applicant_email` is either a valid email OR not included
- [ ] `permit_document_url` is either a valid URL OR not included
- [ ] Date strings are in ISO 8601 format (YYYY-MM-DD or full timestamp)
- [ ] `permit_id` is unique (not previously submitted)

## Testing the API

Use this curl command to test:

```bash
curl -X POST https://pafm-cemetery-system.vercel.app/api/external/permits \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer pk_dec7b8a49db514e873ed6be76d9c7b9fe727320c9a25beeda71736192c222c53" \
  -d '{
    "permit_id": "TEST-'$(date +%s)'",
    "permit_type": "burial",
    "deceased_first_name": "Juan",
    "deceased_last_name": "Dela Cruz",
    "date_of_death": "2026-02-10",
    "applicant_name": "Maria Dela Cruz",
    "permit_approved_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'
```
