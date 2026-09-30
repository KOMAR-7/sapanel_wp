# RESTROCONNECT Platform SuperAdmin — Tenant Lifecycle & Control Center Hardening (Step 5)

This document specifies the operational lifecycle, state machine transitions, administrative control center actions, audit trail requirements, and security policies governing tenant organizations in the RESTROCONNECT Platform Control Plane.

---

## 1. Tenant Statuses & Lifecycle State Machine

The Control Plane enforces a strict finite state machine for all tenant accounts. Arbitrary status modifications from the frontend are rejected at the API layer.

### Status Definitions:
| Status | Meaning | Operations Permitted | Customer Ordering |
| :--- | :--- | :--- | :--- |
| **`PENDING`** | Tenant registration initiated; awaiting provisioning | No | No |
| **`PROVISIONING`** | Database schema validation, feature attachments, DNS allocation | Read-only | No |
| **`ACTIVE`** | Fully onboarded, healthy infrastructure, valid subscription | Yes | Yes |
| **`GRACE_PERIOD`** | Validity elapsed within 7-day grace window | Limited | Warning / Grace |
| **`SUSPENDED`** | Administratively locked (non-payment, investigation) | Management only | Blocked |
| **`EXPIRED`** | Subscription validity expired past 7 days | Management only | Blocked |
| **`CANCELLED`** | Customer terminated service; awaiting archival | Read-only | Blocked |
| **`ARCHIVED`** | Permanently decommissioned; operational history preserved | Read-only historical | Blocked |

### Allowed State Transitions:
```
PENDING
    ↓
PROVISIONING
    ↓
ACTIVE ───→ SUSPENDED ───→ ACTIVE
  │   └───→ GRACE_PERIOD ──→ EXPIRED ──→ ARCHIVED
  │                              ↓
  └───────→ CANCELLED ───────────┘
```

- **`PENDING`** &rarr; `PROVISIONING`, `CANCELLED`
- **`PROVISIONING`** &rarr; `ACTIVE`, `PENDING`, `CANCELLED`
- **`ACTIVE`** &rarr; `SUSPENDED`, `GRACE_PERIOD`, `CANCELLED`, `EXPIRED`
- **`GRACE_PERIOD`** &rarr; `ACTIVE`, `EXPIRED`, `SUSPENDED`, `CANCELLED`
- **`SUSPENDED`** &rarr; `ACTIVE`, `CANCELLED`, `ARCHIVED`
- **`EXPIRED`** &rarr; `ACTIVE`, `CANCELLED`, `ARCHIVED`
- **`CANCELLED`** &rarr; `ARCHIVED`
- **`ARCHIVED`** &rarr; **Terminal state** (`ARCHIVED` cannot normally reactivate)

---

## 2. Centralized Tenant Access Policy (`getTenantAccessStatus`)

To prevent inconsistent status determinations across UI pages and API endpoints, access status is resolved centrally via `src/lib/tenant/tenant-policy.ts`:

```typescript
import { getTenantAccessStatus } from '@/lib/tenant/tenant-policy';

const accessStatus = getTenantAccessStatus(tenant);
```

### Policy Rules:
1. Terminal or administrative flags take immediate precedence (`ARCHIVED`, `CANCELLED`, `SUSPENDED`).
2. Server calculates `daysRemaining` using UTC epoch timestamps.
3. If `daysRemaining < -7` days past expiry &rarr; `EXPIRED`.
4. If `daysRemaining < 0` days (overdue 0 to 7 days) &rarr; `GRACE_PERIOD`.
5. Otherwise &rarr; `ACTIVE`.

---

## 3. Suspension Workflow

### Endpoint:
`POST /api/admin/tenants/[id]/suspend`

### Security & Validations:
- Requires authentication with `PLATFORM_SUPER_ADMIN` or `PLATFORM_ADMIN` (`tenants:update` permission).
- Confirmation required in UI: Admin must type the tenant code (e.g. `SPICE-001`) or restaurant name before proceeding.
- Validates transition `assertValidStatusTransition(existing.status, 'SUSPENDED')`.
- **Zero data loss**: Does NOT delete database, deployment, subscription, payments, features, or audit logs.
- Emits structured `SUSPEND_TENANT` audit record.
- Invalidates caches: `tenant:{id}`, `tenant:{id}:health`, `tenant:{id}:subscription`, `tenant:{id}:features`.

---

## 4. Reactivation Workflow

### Endpoint:
`POST /api/admin/tenants/[id]/reactivate`

### Preconditions & Validations:
- Requires permission: `tenants:update`.
- Transition assertion: Verifies status can transition to `ACTIVE` (strictly rejects `ARCHIVED` tenants).
- **Health Precondition Ping**: Before reactivating, the system tests database reachability via `databaseProvider.testConnection(secretReference)`. If the database is marked `DISCONNECTED`, `ARCHIVED`, or fails connection, reactivation is blocked until the underlying infrastructure is resolved.
- Emits structured `REACTIVATE_TENANT` audit record.
- Invalidates caches: `tenant:{id}`, `tenant:{id}:health`, `tenant:{id}:subscription`.

---

## 5. Subscription Validity Extension

### Endpoint:
`POST /api/admin/tenants/[id]/subscription/extend`

### Parameters:
- `additionalDays` (e.g. `30`, `60`, `90`, `365`), OR
- `newEndDate` (ISO date string in the future)

### Logic:
- Validates that the new date is strictly in the future.
- Updates `Tenant.validUntil` and `TenantSubscription.endDate`.
- If tenant was `EXPIRED` or in `GRACE_PERIOD`, restores status to `ACTIVE`.
- Historical payment records remain untouched.
- Emits `EXTEND_VALIDITY` audit log with previous and new dates.
- Invalidates `tenant:{id}:subscription` and `tenant:{id}`.

---

## 6. Subscription Plan Management

### Endpoint:
`PATCH /api/admin/tenants/[id]/subscription`

### Validations:
- Plan must exist in the `SubscriptionPlan` catalog (`Starter`, `Professional`, `Enterprise`).
- Prevents invented plans or fabricated pricing.
- Updates `TenantSubscription` tier reference without altering historical payment records.
- Emits `CHANGE_PLAN` audit record.
- Invalidates `tenant:{id}:subscription` and `tenant:{id}:features`.

---

## 7. Feature Toggle Management

### Endpoints:
- `GET /api/admin/tenants/[id]/features`
- `PATCH /api/admin/tenants/[id]/features/[featureId]`

### Controls:
- Accepts `action: 'ENABLE' | 'DISABLE'` or `enabled: true | false`.
- Resolves features by UUID, key (e.g. `WHATSAPP_ORDERING`), or feature mapping ID.
- Confirmation modal in Control Center UI before toggling critical ordering functionality.
- Emits `ENABLE_FEATURE` or `DISABLE_FEATURE` audit record.
- Invalidates `tenant:{id}:features`.

---

## 8. Payment Recording

### Endpoint:
`POST /api/admin/tenants/[id]/payments`

### Rules:
- Inputs: `amount`, `currency`, `paymentMethod`, `transactionReference`, `status`, `paidAt`, `dueDate`, `notes`.
- Supported statuses: `PENDING`, `PAID`, `FAILED`, `REFUNDED`, `CANCELLED`.
- **No auto-marking PAID**: Payments default to `PENDING` unless explicitly flagged as `PAID`.
- No fake payment records.
- Historical payment records are immutable.
- Emits `RECORD_PAYMENT` audit log.

---

## 9. Non-Intrusive Health Probing

### Probes:
- **Database**: Issues `SELECT 1;` followed by metadata inspection. Zero schema migrations or DDL commands are executed during health checks.
- **Frontend**: Probes HTTP status and latency of the CDN edge storefront.
- **WhatsApp**: Verifies Meta Cloud API credentials without storing plaintext tokens.
- Health records are persisted in `HealthCheck` table.
- Emits `HEALTH_CHECK` audit record and invalidates `tenant:{id}:health`.

---

## 10. Audit Logging & Sanitization Standard

Every critical lifecycle mutation produces an immutable record in `AuditLog`:
- `adminId` & `tenantId`
- `action` (`SUSPEND_TENANT`, `REACTIVATE_TENANT`, `EXTEND_VALIDITY`, `CHANGE_PLAN`, `ENABLE_FEATURE`, `DISABLE_FEATURE`, `RECORD_PAYMENT`, `HEALTH_CHECK`, `UPDATE_TENANT`, `ARCHIVE_TENANT`)
- `resourceType` (`TENANT`, `SUBSCRIPTION`, `FEATURE`, `PAYMENT`, `DATABASE`, `HEALTH`)
- `oldValue` & `newValue` (JSON snapshots)
- `ipAddress` & `userAgent`
- `createdAt`

### Redaction Rules:
The audit logger recursively sanitizes all JSON snapshots using `sanitizeAuditSnapshot`:
- `password`, `passwordHash`, `token`, `secret`, `connectionString`, `DATABASE_URL`, `FIRST_TENANT_DATABASE_URL`, `accessToken`, `apiKey`, `credential` are automatically replaced with `[REDACTED_SECRET]`.

---

## 11. Role-Based Access Control (RBAC) Matrix

| Action | `PLATFORM_SUPER_ADMIN` | `PLATFORM_ADMIN` | `PLATFORM_SUPPORT` | `PLATFORM_VIEWER` |
| :--- | :---: | :---: | :---: | :---: |
| View Tenants & Health | ✅ | ✅ | ✅ | ✅ |
| Update Tenant Profile | ✅ | ✅ | ❌ | ❌ |
| Suspend Tenant | ✅ | ✅ | ❌ | ❌ |
| Reactivate Tenant | ✅ | ✅ | ❌ | ❌ |
| Extend Validity | ✅ | ✅ | ❌ | ❌ |
| Change Plan | ✅ | ✅ | ❌ | ❌ |
| Toggle Features | ✅ | ✅ | ❌ | ❌ |
| Record Payments | ✅ | ✅ | ❌ | ❌ |
| Test Database Health | ✅ | ✅ | ✅ | ❌ |
| Soft-Archive Tenant | ✅ | ❌ | ❌ | ❌ |

---

## 12. Cross-Tenant Protection

All control plane API routes resolve the authenticated administrator session and enforce tenant isolation:
- Database connections are resolved strictly per tenant ID using managed secret references.
- Requests originating from or targeting Tenant A cannot access, query, or mutate Tenant B databases or configuration.

---

## 13. Security Cleanup & Credential Rotation Notice

> [!IMPORTANT]
> **Credential Rotation Requirement**:
> In accordance with Step 5 security cleanup, all credentials previously used in initial development setups or early verification must be **rotated immediately** in live staging and production environments.
> All repository files, configuration templates, and documentation use `<configured-locally>` placeholders.
