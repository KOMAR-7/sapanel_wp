# RESTROCONNECT Architecture Specification

## 1. System Overview

RESTROCONNECT is designed around a strict decoupling between the **Platform Control Plane** and **Tenant Data Planes**.

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
     ├── Health Probing Engine               │    └── Dedicated PostgreSQL / Schema
     ├── In-Memory & Redis Cache             │
     └── Provider Abstractions               └── Restaurant #N (Future Tenant)
```

---

## 2. Control Plane vs. Tenant Data Plane

| Dimension | Platform Control Plane | Tenant Data Plane |
|---|---|---|
| **Audience** | RESTROCONNECT Platform Owners, Admins, Support | Restaurant Staff, Customers, Delivery Drivers |
| **Database** | Render PostgreSQL (Dedicated `super_admin_restroconnect`) | Dedicated PostgreSQL per tenant (Render / AWS RDS) |
| **Data Scope** | Tenant metadata, secrets references, licenses, audit trail | Menu items, orders, carts, customers, WhatsApp sessions |
| **Security Boundary** | High-security internal access, RBAC enforced, IP-logged | Scoped strictly to the specific restaurant |
| **Isolation Mode** | Centralized governance | `DEDICATED_DATABASE`, `SHARED_DATABASE`, `SHARED_CLUSTER` |

---

## 3. Database Isolation Strategy

To support enterprise compliance and data sovereignty, RESTROCONNECT supports three database isolation modes via the `isolationMode` enum:

1. **`DEDICATED_DATABASE`** *(Default for Restaurant #1 - Spice Route)*:
   - Completely independent PostgreSQL instance/database.
   - Separate credentials stored in AWS Secrets Manager / environment references.
   - Outage or maintenance in one tenant database has **zero effect** on other restaurants.

2. **`SHARED_DATABASE`**:
   - Multiple restaurants in one PostgreSQL database partitioned logically by tenant ID.
   - Ideal for low-cost starter restaurants.

3. **`SHARED_CLUSTER`**:
   - Shared RDS instance with isolated databases per tenant.

---

## 4. Tenant Routing & Resolution

When an incoming web or API request reaches the edge:
```
subdomain.restroconnect.com
            │
            ▼
    [TenantResolver]
    (lib/tenant/tenant-resolver.ts)
            │
            ├── Check Cache (`tenant:resolved:{subdomain}`)
            ├── If Miss: Query Control Plane DB for Tenant, Deployment, Features
            │
            ├── Status Gate:
            │     ├── ACTIVE -> Route to Tenant Database & Storefront
            │     ├── GRACE_PERIOD -> Allow access with warning
            │     └── SUSPENDED / EXPIRED -> Deny access safely (retain all data)
            │
            └── Enforce Zero-Secret Exposure
```

---

## 5. Security & Zero-Secret Exposure

1. **No Database Passwords in Control Plane DB**:
   - The Control Plane only stores a `secretReference` (e.g. `env:FIRST_TENANT_DATABASE_URL` or `aws/secretsmanager/restroconnect/tenants/<id>/database`).
2. **No Secret Payloads to Client**:
   - All API responses sanitize hostnames, phone IDs, and strip connection strings.
3. **Audit Log Sanitization**:
   - The audit logger intercepts all state mutations and redacts passwords, tokens, and database URLs before persisting.
4. **RBAC Guard**:
   - Middleware enforces permissions server-side on every API call. Frontend hiding is never the sole security measure.

---

## 6. Cache Layer & Anti-Stampede Architecture

The platform uses a dedicated `CacheService` abstraction:
- **Local / Development**: In-Memory sliding-window cache.
- **Production AWS**: AWS ElastiCache (Redis).
- **Request Deduplication**:
  - Simultaneous requests for identical cache keys share an in-flight Promise, completely preventing the "thundering herd" problem on tenant databases.
- **Mutation Invalidation**:
  - Updating a tenant, toggling a feature, or changing a plan immediately invalidates all relevant cache prefixes (`tenant:<id>:*`).
