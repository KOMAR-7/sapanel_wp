# RESTROCONNECT Platform SuperAdmin — Tenant #1 Onboarding Guide

This document details the architecture, security practices, and operational procedures for onboarding **Tenant #1 ("Spice Route")** into the RESTROCONNECT Platform Control Plane.

---

## 1. How to Configure Tenant Database

The existing restaurant application operates on an external PostgreSQL instance hosted on **Render (Singapore region)**. The database is already populated with live operational data.

### Configuration Properties:
- **Provider**: `RENDER`
- **Engine**: `POSTGRESQL`
- **Region**: `Singapore` (ap-southeast-1)
- **Environment**: `production`
- **Host**: `dpg-daham96q1p3s73bb17vg-a.singapore-postgres.render.com`
- **Port**: `5432`
- **Database Name**: `restpro_db_render`
- **Username**: `restpro_db_render_user`
- **Isolation Mode**: `DEDICATED_DATABASE`

The Control Plane registers this existing database as an isolated data store for Tenant #1.

---

## 2. How Database Secrets are Handled

### Zero-Credential Architecture:
1. **Never store plaintext passwords**: The Control Plane database (`TenantDatabase` model) does **NOT** contain a password column or full connection string.
2. **Never expose passwords to frontend**: All API responses strip passwords, tokens, and direct URLs.
3. **Secret References**: The Control Plane stores a `secretReference` string:
   - Local/Development: `env:FIRST_TENANT_DATABASE_URL` (resolved from `.env.local` / `.env` on the server).
   - Production (Phase 2): `aws/secretsmanager/tenants/{tenantId}/database` (resolved via AWS Secrets Manager SDK).
4. **Injection & SSRF Prevention**: The server strictly rejects client attempts to supply raw `postgresql://...` connection strings. Only pre-configured, authorized secret identifiers are permitted.

---

## 3. How to Test Database Connection

The onboarding wizard and restaurant detail page provide an active **"Test Connection"** action.

### Flow:
```
Frontend (User clicks "Test Connection")
    ↓
POST /api/admin/tenants/database/test
    ↓
Server checks PlatformAdmin JWT & permission (databases:test)
    ↓
Server resolves secretReference (e.g. env:FIRST_TENANT_DATABASE_URL)
    ↓
Server establishes SSL connection with 8000ms timeout
    ↓
Executes: SELECT 1; and SELECT version();
    ↓
Measures real connection latency (ms)
    ↓
Closes connection immediately (prevents connection leaks)
    ↓
Returns sanitized response:
{
  "success": true,
  "data": {
    "status": "CONNECTED",
    "latencyMs": 42,
    "provider": "RENDER",
    "engine": "POSTGRESQL",
    "region": "Singapore",
    "pgVersion": "PostgreSQL 18.6...",
    "host": "dpg-••••.singapore-postgres.render.com"
  }
}
```

If the connection fails:
- Raw database error details are logged server-side (`console.error`).
- A sanitized error is returned to client:
  ```json
  {
    "success": false,
    "error": {
      "code": "TENANT_DATABASE_UNAVAILABLE",
      "message": "Unable to connect to the tenant database."
    }
  }
  ```

---

## 4. How Database Discovery Works

Clicking **"Discover Restaurant"** (`POST /api/admin/tenants/database/discover`) safely queries the tenant database to read basic establishment metadata without copying operational data:

1. **Strictly Read-Only**: Uses `SELECT` queries only with a 10s query timeout. Never runs `INSERT`, `UPDATE`, `DELETE`, `ALTER`, or `DROP`.
2. **Discovered Restaurant Data**:
   - `Restaurant.name` &rarr; `Spice Route`
   - `Restaurant.slug` &rarr; `spice-route`
   - `Restaurant.phone` &rarr; `9876543210`
   - `Restaurant.email` &rarr; `hello@spiceroute.com`
   - `Restaurant.city` &rarr; `Mumbai`
   - `Restaurant.state` &rarr; `Maharashtra`
   - `Restaurant.address` &rarr; `123 Food Street`
   - `Restaurant.pincode` &rarr; `400001`
   - `User (Owner)` &rarr; `Restaurant Owner` (`admin@spiceroute.com` / `9999999999`)
3. **Discovered Aggregate Counts (Live Real Metrics)**:
   - Active Branches (`COUNT(*) FROM "Branch"`) &rarr; 1
   - Menu Categories (`COUNT(*) FROM "MenuCategory"`) &rarr; 5
   - Menu Items (`COUNT(*) FROM "MenuItem"`) &rarr; 30
   - Registered Customers (`COUNT(*) FROM "Customer"`) &rarr; 16
   - Total Orders Processed (`COUNT(*) FROM "Order"`) &rarr; 52
4. **UI Integration**: Clicking **"Apply Discovered Details to Wizard"** automatically populates Step 1 and Step 2 of the wizard, displaying the badge:
   `✓ Imported from tenant database`.

---

## 5. How Schema Validation Works

Clicking **"Validate Schema"** (`POST /api/admin/tenants/database/validate`) verifies the tenant database schema:

1. Queries PostgreSQL catalog:
   ```sql
   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
   ```
2. Checks presence of core minimum required tables:
   - `Restaurant`
   - `Branch`
   - `User`
   - `Customer`
   - `MenuCategory`
   - `MenuItem`
   - `Order`
   - `OrderItem`
   - `WhatsAppCart`
3. Checks extended tenant models (23 tables verified on Render):
   - `CustomerAddress`, `CustomerNote`, `CustomerActivity`
   - `MenuItemVariant`, `MenuItemAddon`, `OrderStatusHistory`
   - `WhatsAppMessageReceipt`, `WhatsAppCartItem`, `PointsLedger`
   - `CustomerCampaignTemplate`, `CustomerCampaign`, `CampaignReceipt`
   - `PushSubscription`, `CategoryItemSelection`
4. Returns status:
   - `VALID`: All 9 core minimum tables present (23 total found).
   - `PARTIAL`: Some core tables present, minor extensions missing.
   - `OUTDATED`: Critical tables missing.
   - `UNKNOWN`: No expected tables found.
5. **No Automated Migrations**: Schema validation never runs Prisma migrations, DDL, or write queries. It is strictly an observational health check.

---

## 6. How Tenant Registration Works

When clicking **"Register Restaurant"** on Step 8 of the wizard:

### Transaction Sequence:
1. **Server-Side Authorization**: Validates PlatformAdmin session and `tenants:create` permission.
2. **Uniqueness Verification**: Checks uniqueness of `tenantCode`, `slug`, and `subdomain` against Control Plane DB.
3. **Database Pre-flight**: Verifies database connectivity and validates schema.
4. **Determine Initial Status**:
   - If database connected and schema valid: `ACTIVE`.
   - If database connection failed: `PROVISIONING`.
5. **Create Tenant Record**:
   - `Tenant` model created with unique code `SPICE-001`, slug `spice-route`, owner details, address, and isolation mode `DEDICATED_DATABASE`.
6. **Create TenantDatabase Record**:
   - Associated with `Tenant.id`.
   - Stores masked host, port, databaseName, username, `secretReference: "env:FIRST_TENANT_DATABASE_URL"`, `status: "CONNECTED"`, `schemaStatus: "VALID"`, `pgVersion`, and `lastLatencyMs`.
7. **Create Deployment Record**:
   - Provider: `VERCEL`
   - Frontend URL: `https://wp-admin-five.vercel.app/`
   - Status: `ACTIVE`
8. **Create TenantSubscription & Payment**:
   - Plan: `Professional` (₹7,999/mo)
   - Initial payment record with status `PAID`.
9. **Create TenantFeature Records**:
   - Attaches platform features (`WHATSAPP_ORDERING`, `LOYALTY`, `CAMPAIGNS`, `MULTI_BRANCH`, etc.).
10. **Create HealthCheck Records**:
    - Initial component health check for `DATABASE` and `FRONTEND`.
11. **Create ProvisioningJob Record**:
    - Type: `CREATE_TENANT`, Status: `SUCCESS`, Progress: 100%.
12. **Create AuditLog Records**:
    - Writes `CREATE_TENANT`, `ADD_DATABASE`, and `HEALTH_CHECK` audit records with sanitized values.
13. **Cache Invalidation**:
    - Invalidates Redis/in-memory cache for the tenant ID and slug.

---

## 7. How Deployment Metadata is Stored

Deployment records (`Deployment` model) store pointers to the tenant's user-facing services:
- `provider`: Hosting provider (`VERCEL` for current frontend, `OTHER` for backend).
- `frontendUrl`: `https://wp-admin-five.vercel.app/`
- `backendUrl`: Null / empty string (if integrated with Next.js frontend).
- `region`: `Singapore`
- `status`: `ACTIVE`

When migrating to AWS (Phase 2), ECS cluster ARNs, task definitions, and Application Load Balancer target group ARNs will populate this model without disrupting tenant application data.

---

## 8. Troubleshooting Database Connection Failure

If `POST /api/admin/tenants/database/test` returns `TENANT_DATABASE_UNAVAILABLE`:

1. **Verify Environment Variable**:
   Ensure `FIRST_TENANT_DATABASE_URL` is set in `.env` / `.env.local`:
   ```bash
   FIRST_TENANT_DATABASE_URL="<configured-locally>"
   ```
2. **Check Render Database Suspension**:
   Free/starter Render PostgreSQL instances suspend after periods of inactivity. Log into Render dashboard and verify instance status is `Available`.
3. **Verify SSL Configuration**:
   Render PostgreSQL requires SSL (`sslmode=require` or Node `pg` option `ssl: { rejectUnauthorized: false }`). The control plane provider enables this automatically.
4. **Check IP Whitelist**:
   If Render instance has IP access restrictions enabled, add the Control Plane host's public IP address.
5. **Inspect Server Logs**:
   Server-side detailed errors are output to terminal logs:
   `[Tenant DB Test Failed] { provider: 'RENDER', error: '...' }`

---

## 9. How to Rotate Database Credentials

1. **Update Secret in Secret Provider**:
   - In Development: Update `FIRST_TENANT_DATABASE_URL` in `.env.local` with the new password/connection string.
   - In Production (Phase 2): Call AWS Secrets Manager `PutSecretValue` or use AWS Secrets Manager automatic rotation Lambda.
2. **Zero Code Changes**:
   Because `TenantDatabase` stores `secretReference: "env:FIRST_TENANT_DATABASE_URL"` or `"aws/secretsmanager/tenants/{id}/db"`, the reference string remains identical.
3. **Verify Health**:
   In SuperAdmin panel, navigate to `/admin/restaurants/[tenantId]`, click the **Database** tab, and click **"Test Connection"** to verify that the rotated credentials work seamlessly.

---

## 10. Security Considerations

- **Strict Access Control**: Only Platform Admins with `databases:test` and `tenants:create` permissions can execute database health tests or register tenants.
- **SSRF / Host Control**: Arbitrary clients cannot supply custom database connection strings to probe internal networks. All connection targets must be managed secret references.
- **Credential Redaction in Audit Logs**: Every audit log snapshot passes through `sanitizeAuditSnapshot()`, stripping fields containing `password`, `token`, `secret`, or `connectionString`.
- **Read-Only Tenant Operations**: Discovery and schema validation run strictly read-only queries with a 8000ms query timeout to prevent hanging connections.
- **Zero Tenant Data Replication**: Customer orders, customer personal data, and menu items remain strictly inside the tenant PostgreSQL instance and are never duplicated into the Control Plane database.
- **Lifecycle & Control Center Hardening**: For tenant status transitions, suspension, reactivation, validity extension, and plan changes, see [docs/tenant-lifecycle.md](tenant-lifecycle.md).

