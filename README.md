# RESTROCONNECT Platform Control Plane

> **Multi-Tenant SaaS Control Plane for Centralized Governance, Isolated Tenant Databases, Licensing, Infrastructure, and Meta WhatsApp Ordering Orchestration.**

---

## 1. Project Overview

**RESTROCONNECT** is an enterprise multi-tenant restaurant management and direct-ordering SaaS platform. 

This repository houses the **Platform-Level SuperAdmin Control Plane**. It is strictly separate from individual restaurant/tenant storefront applications. While each restaurant operates on its own dedicated data plane (such as Render PostgreSQL or AWS RDS), the SuperAdmin Control Plane governs tenant lifecycles, database registries, deployments, subscriptions, feature gates, Meta Cloud API integrations, and health monitoring.

---

## 2. Architecture

```
                           RESTROCONNECT Platform
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
     Platform Control Plane                   Tenant Data Planes
  (SuperAdmin Panel & DB)               (Isolated Restaurant Databases)
                 │                                       │
     ├── PlatformAdmin (RBAC)                ├── Restaurant #1 (Spice Route)
     ├── Tenant Registry                     │    ├── Dedicated PostgreSQL (Render)
     ├── Database Registry                   │    ├── Edge Storefront (Vercel)
     ├── Deployment Registry                 │    └── Meta Cloud API Integration
     ├── Subscriptions & Payments            │
     ├── Feature Flag Governance             ├── Restaurant #2 (Future Tenant)
     ├── Health Probing Engine               │    └── Dedicated PostgreSQL / RDS
     ├── In-Memory & Redis Cache             │
     └── Provider Abstractions               └── Restaurant #N (Future Tenant)
```

---

## 3. Control Plane vs. Tenant Application

| Dimension | Platform Control Plane (This App) | Tenant Application |
|---|---|---|
| **Audience** | RESTROCONNECT Platform Owners, Admins, Support | Restaurant Staff, Delivery Drivers, Diners |
| **Database** | `restroconnect_control_plane` (PostgreSQL) | Isolated Tenant PostgreSQL (e.g. Render / AWS RDS) |
| **Key Models** | `Tenant`, `TenantDatabase`, `Deployment`, `SubscriptionPlan`, `Feature`, `Payment`, `AuditLog` | `Restaurant`, `Branch`, `Order`, `MenuItem`, `Customer`, `WhatsAppCart`, `PointsLedger` |
| **Data Scope** | Platform metadata, secret references, licensing terms | Real-time menus, active carts, customer PII, POS orders |
| **Credentials** | Never stores raw passwords in DB or frontend payloads | Isolated database credentials stored in secret references |

---

## 4. Folder Structure

```
src/
  app/
    admin/
      dashboard/               # Executive KPI dashboard
      restaurants/             # Restaurant list, search, filters
        new/                   # 8-Step "Add Restaurant" Wizard
        [id]/                  # 12-Tab Tenant Control Center
      subscriptions/           # Platform plans and subscription assignments
      payments/                # Manual payment ledger and revenue metrics
      features/                # Global feature flag catalog
      deployments/             # Application deployment tracking & probing
      databases/               # Database registry & latency monitors
      infrastructure/          # System resource topology & AWS specs
      whatsapp/                # Meta Cloud API & Commerce Catalog
      usage/                   # Real-time tenant operational metrics
      health/                  # System-wide health checks
      support/                 # Support ticket escalation
      audit-logs/              # Cryptographic audit trail
      settings/                # SuperAdmin settings & RBAC
    api/admin/...              # Protected control-plane REST APIs
    login/                     # SuperAdmin authentication page
    layout.tsx                 # Root layout & design tokens
    globals.css                # Enterprise Dark CSS design system
  components/
    admin/                     # Sidebar, Header, AdminLayout, DependencyGraph
    modals/                    # ConfirmModal (typed safety confirmations)
    status/                    # StatusBadge (semantic status pills)
  lib/
    auth/                      # JWT (jose), session cookies, RBAC, rate-limiting
    cache/                     # CacheService (TTL, prefix invalidation, stampede deduplication)
    db/                        # Prisma singleton
    tenant/                    # TenantResolver & isolated TenantDatabaseClient
    security/                  # Data masking & audit log sanitization
    logging/                   # AuditLogger
    api/                       # Standard response & error handling helpers
  services/                    # Domain logic (tenants, databases, subscriptions, payments, etc.)
  providers/                   # Provider abstractions (Database, Secrets, Infrastructure, Deployments)
prisma/
  schema.prisma                # Control plane database schema (17 entities)
  seed.js                      # Seeds PlatformAdmin, Plans, Features, and discovers Tenant #1
tests/                         # Automated test suite (RBAC, cache, isolation, security)
docs/
  architecture.md              # System architecture specification
  onboarding-first-restaurant.md# Step-by-step onboarding walkthrough
  aws-migration.md             # AWS ECS, RDS, and Secrets Manager Phase 2 roadmap
```

---

## 5. Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (Strict typing)
- **Database**: PostgreSQL (`restroconnect_control_plane`)
- **ORM**: Prisma ORM 5
- **Authentication**: JWT with `jose`, HTTP-only secure cookies, and bcrypt password hashing
- **Styling**: Vanilla CSS with custom tokens and dark control plane aesthetics
- **Icons**: Lucide React
- **Cache**: In-Memory sliding window with stampede protection (AWS ElastiCache Redis ready)
- **Testing**: Node.js built-in test runner (`node --test`)

---

## 6. Environment Variables

Create `.env` using `.env.example`:

```ini
# Application Port & URL
PORT=3005
NEXT_PUBLIC_APP_URL="http://localhost:3005"
NODE_ENV="development"

# Control Plane Database (PostgreSQL)
CONTROL_PLANE_DATABASE_URL="postgresql://username:password@localhost:5432/restroconnect_control_plane?schema=public"

# Platform SuperAdmin Credentials
SUPERADMIN_NAME="Platform SuperAdmin"
SUPERADMIN_EMAIL="admin@restroconnect.com"
SUPERADMIN_PASSWORD="<configure-secure-password>"
AUTH_SECRET="<generate-random-32-char-secret>"

# Initial Tenant #1 Reference (Spice Route on Render)
FIRST_TENANT_DATABASE_URL="<configured-locally-via-env>"
FIRST_TENANT_FRONTEND_URL="https://wp-admin-five.vercel.app/"
FIRST_TENANT_BACKEND_URL=""

# Optional Redis Cache (AWS ElastiCache in production)
# REDIS_URL=redis://localhost:6379

# AWS Phase 2 Integration (Mumbai)
AWS_REGION="ap-south-1"
```

---

## 7. Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Push Control Plane schema to PostgreSQL
npx prisma db push

# 3. Seed SuperAdmin, plans, features, and discover Tenant #1
npm run db:seed

# 4. Start Development Server on port 3005
npm run dev
```

Visit `http://localhost:3005` and log in with:
- **Email**: `admin@restroconnect.com`
- **Password**: `<configured-locally>` (configured via `SUPERADMIN_PASSWORD` in `.env`)

---

## 8. Database Setup

The SuperAdmin Control Plane requires its own dedicated PostgreSQL database.
Locally, ensure PostgreSQL is running on port `5432`:
```sql
CREATE DATABASE restroconnect_control_plane;
```
Set `CONTROL_PLANE_DATABASE_URL` in `.env`.

---

## 9. Prisma Setup

```bash
# Generate Prisma Client
npm run db:generate

# Push changes to database
npm run db:push
```

---

## 10. Control-Plane Migrations

For production deployments:
```bash
npx prisma migrate dev --name init_control_plane
```

---

## 11. Tenant Database Connection

Tenant connection details are managed via secret references. The SuperAdmin resolves the connection string through `SecretProvider` without ever sending passwords to the frontend or committing them to git.

To safely test connectivity:
1. Navigate to **Restaurants** &rarr; **Spice Route** &rarr; **Database**.
2. Click **"Test Connection"**.
3. The backend executes `SELECT 1;` and reports status and latency in milliseconds.

---

## 12. Secret Management

- **Local/Development**: Secrets are referenced via `env:VARIABLE_NAME`.
- **Production AWS**: Secrets are referenced via `aws/secretsmanager/restroconnect/tenants/<tenant-id>/database`.
- The `UnifiedSecretResolver` automatically detects the reference format and routes to the appropriate secret backend.

---

## 13. Authentication

- **Session**: Signed JWTs using `jose` with HS256.
- **Cookies**: `HttpOnly`, `SameSite=Lax`, and `Secure` (in production).
- **Protection**: Brute-force rate limiting blocks rapid repeated login failures.
- **Auditing**: Every login and logout event writes a cryptographic audit log record with client IP and User-Agent.

---

## 14. Role-Based Access Control (RBAC)

Explicit roles enforced via server-side middleware (`src/lib/auth/rbac.ts`):

- **`PLATFORM_SUPER_ADMIN`**: Full platform authority across all tenants, infrastructure, and settings.
- **`PLATFORM_ADMIN`**: Manage tenants, features, subscriptions, databases, and view logs.
- **`PLATFORM_SUPPORT`**: Read tenant statuses, inspect diagnostics, execute health probes, and manage support tickets.
- **`PLATFORM_VIEWER`**: Strictly read-only observational audits.

---

## 15. Tenant Onboarding

Use the 8-Step Wizard (`/admin/restaurants/new`):
1. **Restaurant Info**: Basic contact and location.
2. **Tenant Config**: Tenant Code, Slug, Subdomain.
3. **Database Reference**: Host, port, db name, and secret reference.
4. **Frontend App**: Reference Vercel URL.
5. **Backend API**: Optional dedicated API endpoint.
6. **Subscription**: Plan tier and billing cycle.
7. **Features**: Granular feature activation.
8. **Review & Register**: Validates and registers tenant.

---

## 16. Database Health Checks

The backend executes non-destructive diagnostic probes:
- Latency measurement (`SELECT 1;`)
- PostgreSQL version detection (`SELECT version();`)
- Schema table presence verification
- Returns `CONNECTED` or `UNHEALTHY` with zero secret exposure.

---

## 17. Cache Architecture

- **Abstraction**: `CacheService` (`src/lib/cache/cache-service.ts`)
- **TTL**:
  - Tenant metadata: 5–15 min
  - Feature flags: 1–5 min
  - Subscription status: 1–5 min
  - Health summaries: 30–60 sec
- **Deduplication**: In-flight concurrent requests for the same key are merged into a single Promise to eliminate DB stampedes.
- **Invalidation**: Mutations immediately invoke `cacheService.deleteByPrefix("tenant:<id>:")`.

---

## 18. API Documentation

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/admin/auth/login` | Authenticate SuperAdmin |
| `POST` | `/api/admin/auth/logout` | Invalidate admin session |
| `GET` | `/api/admin/dashboard` | Platform metrics & active alerts |
| `GET` | `/api/admin/tenants` | List tenants with search and filters |
| `POST` | `/api/admin/tenants` | Onboard new restaurant tenant |
| `GET` | `/api/admin/tenants/:id` | Detailed tenant profile & relations |
| `PATCH` | `/api/admin/tenants/:id` | Update tenant details |
| `POST` | `/api/admin/tenants/:id/suspend` | Suspend tenant access (retains data) |
| `POST` | `/api/admin/tenants/:id/reactivate` | Reactivate suspended tenant |
| `POST` | `/api/admin/tenants/:id/extend-validity` | Extend license validity by N days |
| `POST` | `/api/admin/tenants/:id/database/test` | Execute database health check |
| `POST` | `/api/admin/tenants/:id/database/validate` | Verify tenant schema tables |
| `POST` | `/api/admin/tenants/:id/database/discover` | Discover live stats from tenant DB |
| `GET` | `/api/admin/tenants/:id/features` | List tenant feature toggles |
| `PATCH` | `/api/admin/tenants/:id/features` | Enable/disable tenant feature |
| `GET` | `/api/admin/tenants/:id/subscription` | Tenant subscription details |
| `PATCH` | `/api/admin/tenants/:id/subscription` | Change subscription plan |
| `POST` | `/api/admin/tenants/:id/payments` | Record manual subscription payment |
| `POST` | `/api/admin/tenants/:id/health` | Run on-demand diagnostic probes |
| `GET` | `/api/admin/tenants/:id/dependencies` | Topology failure impact analysis |
| `GET` | `/api/admin/infrastructure` | System resource view |
| `GET` | `/api/admin/audit-logs` | Cryptographic audit trail |

---

## 19. Security

1. **Strict Tenant Isolation**: Tenant operations strictly resolve `tenantId` server-side before executing any queries.
2. **Zero-Secret Exposure**: No database passwords, JWT secrets, or Meta tokens are returned in API payloads.
3. **Data Masking**: Hostnames, Phone Number IDs, and tokens are masked.
4. **Sanitized Audit Logs**: Interceptors sanitize all state snapshots to redact sensitive fields before saving.
5. **Confirmation Modals**: Destructive operations (suspending tenants, disabling WhatsApp ordering) require explicit confirmation dialogs.

---

## 20. AWS Migration Plan (Phase 2)

See [`docs/aws-migration.md`](docs/aws-migration.md) for full instructions on migrating to:
- AWS ECS Fargate
- AWS RDS PostgreSQL Multi-AZ
- AWS Secrets Manager
- AWS ElastiCache Redis
- AWS CloudWatch Metrics

---

## 21. Deployment

Build and run production bundle:
```bash
npm run build
npm start
```

---

## 22. Troubleshooting

- **Database Health Check Reports FAILED**: Verify `FIRST_TENANT_DATABASE_URL` in `.env` and ensure Render PostgreSQL is allowing inbound SSL connections.
- **Rate Limit Triggered**: Wait 60 seconds or invoke `resetRateLimit(key)` in development.
- **Cache Invalidation**: Restart server or call `cacheService.clear()` in tests.

---

## 23. How to Add a New Restaurant

Use the 8-Step Wizard (`/admin/restaurants/new`) or invoke `POST /api/admin/tenants`.

---

## 24. How to Disable a Restaurant

Open the restaurant detail page (`/admin/restaurants/[id]`) and click **"Suspend"**. Enter the restaurant name to confirm. All data is retained, but application access is blocked.

---

## 25. How to Extend Subscription

Open the restaurant detail page &rarr; **Subscription** tab &rarr; Click **"Extend Validity (+30 Days)"**.

---

## 26. How to Enable Features

Open the restaurant detail page &rarr; **Features** tab &rarr; Toggle the desired feature switch.

---

## 27. How to Rotate Secrets

1. Update the credential in your secret store (AWS Secrets Manager or `.env`).
2. Update the `secretReference` in the Database tab if the reference key changed.
3. Click **"Test Connection"** to verify.

---

## 28. Backup Strategy

- **Control Plane**: Nightly automated PostgreSQL pg_dump snapshots.
- **Tenant Databases**: Dedicated automated backups on Render / AWS RDS automated snapshots with 30-day retention.

---

## 29. Disaster Recovery Notes

Since all tenant databases are isolated:
- Failure in Restaurant A's database has **0% impact** on Restaurant B.
- Control plane database failure does not interrupt active customer ordering on running tenant storefronts.

---

---

## 30. Step 5 — Tenant Lifecycle & Control Center Hardening

The Control Plane implements full tenant lifecycle management with strict state transition safety:
- **Centralized Access Policy**: `getTenantAccessStatus(tenant)` evaluates real subscription validity and grace periods.
- **Allowed Transitions**: `PENDING -> PROVISIONING -> ACTIVE`, `ACTIVE -> SUSPENDED`, `SUSPENDED -> ACTIVE`, `ACTIVE -> EXPIRED / CANCELLED`, and `CANCELLED -> ARCHIVED`.
- **Hard-Delete Protection**: The dangerous hard-delete has been replaced with soft `ARCHIVED` status to permanently preserve operational history and database metadata.
- **Lifecycle Operations**:
  - `POST /api/admin/tenants/[id]/suspend`: Requires typed confirmation (`tenantCode`), sets `SUSPENDED`, preserves all data.
  - `POST /api/admin/tenants/[id]/reactivate`: Pre-flight database ping, prevents reactivating `ARCHIVED` tenants, restores `ACTIVE`.
  - `POST /api/admin/tenants/[id]/subscription/extend`: Extends validity by days or target date.
  - `PATCH /api/admin/tenants/[id]/subscription`: Real catalog plan switching with price integrity.
  - `PATCH /api/admin/tenants/[id]/features/[featureId]`: Enables/disables capabilities with critical feature warnings.
  - `POST /api/admin/tenants/[id]/payments`: Records billing with strict status handling (`PENDING`, `PAID`, `FAILED`, `REFUNDED`, `CANCELLED`).
  - `POST /api/admin/tenants/[id]/health`: Safe non-intrusive health checks (`SELECT 1`).
- **Audit Logging**: Every action generates an immutable audit record with automatic secret redaction (`[REDACTED_SECRET]`).
- Detailed documentation: See [docs/tenant-lifecycle.md](docs/tenant-lifecycle.md).

---

---

## 31. Step 6 — AWS Foundation & Infrastructure Preparation

The Control Plane has been hardened with a dedicated **AWS Foundation Layer** in preparation for future cloud scaling without altering the live production systems:

- **Target Region**: `ap-south-1` (Mumbai) across all configurations.
- **Zero-Migration Guarantee**: Tenant #1 (`Spice Route`) remains 100% active on Render PostgreSQL and Vercel. No production resources have been prematurely created.
- **Centralized AWS Configuration Module** (`src/lib/aws/config.ts`):
  - Validates `AWS_REGION` (defaults safely to `ap-south-1`).
  - Validates `AWS_ACCOUNT_ID` format (12-digit numeric constraint).
  - Server-only: Strips credentials and account ID from client-facing exports.
  - Safe fallbacks: If AWS credentials are missing, the application operates normally with `enabled: false`.
- **Honest Infrastructure States**:
  - The `/admin/infrastructure` dashboard displays explicit states:
    - **AWS Status**: `Not Connected`
    - **Region**: `ap-south-1` (Mumbai)
    - **ECS Containers**: `Not Provisioned`
    - **RDS PostgreSQL**: `Not Provisioned`
    - **ElastiCache Redis**: `Not Provisioned`
    - **S3 Storage**: `Not Provisioned`
    - **CloudWatch**: `Not Connected`
  - **Zero Fake Metrics**: RESTROCONNECT strictly avoids simulated CPU, RAM, or latency metrics.
- **Pluggable Provider Abstractions**:
  - `AwsInfrastructureProvider`: Reports unprovisioned cloud resources safely.
  - `AwsDatabaseProvider`: Prepares for future RDS/Aurora PostgreSQL migrations.
  - `AwsDeploymentProvider`: Handles future ECS / Fargate rolling deployments.
  - `AwsMetricsProvider`: Integrates with future CloudWatch alarms.
  - `AwsSecretsManagerProvider`: Standardizes tenant secret paths (`aws/secretsmanager/restroconnect/tenants/<tenant-id>/database`).
- **Comprehensive Documentation Suite**:
  - [AWS Account Setup Guide](docs/aws-account-setup.md): Beginner-friendly MFA, Mumbai region, and root protection.
  - [AWS IAM Security Design](docs/aws-iam.md): Least-privilege conceptual roles (`RESTROCONNECT-ControlPlane-Role`, `RESTROCONNECT-Backend-Role`, `RESTROCONNECT-DeploymentRole`, `RESTROCONNECT-ReadOnlyMonitoringRole`).
  - [AWS Billing & Cost Safety](docs/aws-billing.md): Free tier limits, budget alarms, anomaly detection, and standard resource tagging.
  - [AWS Migration Architecture](docs/aws-migration.md): Detailed 10-phase roadmap (Phases A through J) and zero-downtime cutover plan.
- **Verification**: 56/56 automated tests passing with clean TypeScript compilation.

---

## 32. Step 7 — AWS Setup & Project-Side Verification

Step 7 manual AWS account-level security and project-side verification have been fully performed:
- **AWS Account Security Confirmed**: Root MFA enforced, root access keys absent, `Omar_Dev` IAM user configured with console access & MFA, `ap-south-1` region selected, monthly budget active, Cost Anomaly Detection active, CloudTrail active, and Secrets Manager verified.
- **Project-Side Verification Complete**:
  - `npm test`: 56/56 passing tests across RBAC, database health, tenant isolation, lifecycle, and AWS foundation.
  - `npx tsc --noEmit`: 0 TypeScript errors.
  - Local dev server: Active on `http://localhost:3005`.
  - SuperAdmin login: Verified with session cookie issue and audit trail logging.
  - Infrastructure overview: Explicit honest states verified with zero fake hardware metrics.
  - Tenant #1 (`Spice Route`): Intact and actively serving traffic from Render PostgreSQL and Vercel.
  - Security scan: 0 real AWS credentials across code, configuration, API responses, audit logs, or Prisma DB.
- **Detailed Documentation**: See [docs/step7-verification.md](docs/step7-verification.md).

---


## 33. Known Limitations & Roadmap


- AWS automated provisioning is scheduled for subsequent phases (Phases B through J).
- Payment recording is currently manual; automated payment gateway webhooks will be integrated in Phase 2.

---

## Required Configuration From Platform Owner

To configure and run the RESTROCONNECT Control Plane in production, provide:

### For Local / Staging Development:
1. `CONTROL_PLANE_DATABASE_URL`: Connection string for PostgreSQL control plane database.
2. `AUTH_SECRET`: 32+ character random string for signing JWT tokens.
3. `SUPERADMIN_EMAIL`: Email for initial platform superadmin account.
4. `SUPERADMIN_PASSWORD`: Strong password for superadmin.
5. `FIRST_TENANT_DATABASE_URL`: Connection string for existing Render PostgreSQL database.
6. `FIRST_TENANT_FRONTEND_URL`: URL of the existing Vercel storefront.

### For AWS Production Later:
1. `AWS_REGION=ap-south-1` (Mumbai)
2. `AWS_ACCOUNT_ID="123456789012"`
3. AWS IAM Task Role ARNs for ECS and Secrets Manager access
4. RDS PostgreSQL Endpoint for Control Plane DB
5. ElastiCache Redis Endpoint
6. ACM SSL Certificates & Route53 / Cloudflare DNS records.

