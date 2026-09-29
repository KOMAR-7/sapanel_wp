# AWS Migration Architecture & Phases: RESTROCONNECT

> [!IMPORTANT]
> **CURRENT STEP = AWS FOUNDATION ONLY (Step 6)**
> DO NOT migrate the application yet.
> DO NOT migrate the tenant database yet.
> DO NOT create production ECS / RDS / Redis / S3 infrastructure.
> All production resources remain in their verified state: Tenant #1 (`Spice Route`) is active on Render PostgreSQL and Vercel.

---

## 1. Architectural Evolution

### Current Architecture (Step 6 Verified State)
```
SuperAdmin Control Plane (Local / Hosted Node.js)
    ↓
Control Plane PostgreSQL (localhost:5432 / Dedicated PostgreSQL)
    ↓
Tenant #1 Active Deployment
    ├── Database: Render PostgreSQL (Singapore / ap-southeast-1)
    └── Frontend: Vercel Edge Serverless (https://wp-admin-five.vercel.app/)
```

### Future Architecture (AWS Production Target in Mumbai `ap-south-1`)
```
                          [Cloudflare CDN & DDoS Protection]
                                         │
                                         ▼
                            [AWS Application Load Balancer]
                                         │
                      ┌──────────────────┴──────────────────┐
                      ▼                                     ▼
             [ECS Fargate Tasks]                   [ECS Fargate Tasks]
          RESTROCONNECT Control Plane            RESTROCONNECT Tenant Apps
                      │                                     │
       ┌──────────────┴──────────────┐       ┌──────────────┴──────────────┐
       ▼                             ▼       ▼                             ▼
 [RDS PostgreSQL]             [ElastiCache] [Tenant RDS DBs]          [AWS S3]
(Control Plane DB)               (Redis)     (ap-south-1 Mumbai)   (Media & Assets)
```

---

## 2. Target Region & Multi-AZ Topology

- **AWS Region**: `ap-south-1` (Mumbai, India)
- **Availability Zones**: Multi-AZ deployment across `ap-south-1a`, `ap-south-1b`, and `ap-south-1c`
- **Subnet Architecture**:
  - Public Subnets: Internet Gateway, Application Load Balancers
  - Private App Subnets: ECS Fargate container tasks, NAT Gateways
  - Isolated DB Subnets: RDS PostgreSQL and ElastiCache Redis (no direct internet ingress)

---

## 3. Pluggable Infrastructure Provider Readiness

The codebase includes pluggable interfaces in `src/providers/` designed specifically for seamless future migration:

1. **`SecretProvider`** (`src/providers/secrets/secrets.provider.ts`):
   - Supports `LocalSecretProvider` for development.
   - Prepared for `AwsSecretsManagerProvider` with standard hierarchy:
     - `aws/secretsmanager/restroconnect/platform/control-plane`
     - `aws/secretsmanager/restroconnect/tenants/<tenant-id>/database`
     - `aws/secretsmanager/restroconnect/tenants/<tenant-id>/meta`
     - `aws/secretsmanager/restroconnect/infrastructure/deployment`
   - Zero raw credentials or database passwords stored in Control Plane DB.

2. **`DatabaseProvider`** (`src/providers/database/database.provider.ts` & `src/providers/aws/aws-database.provider.ts`):
   - Operates uniformly across Render PostgreSQL, AWS RDS PostgreSQL, and AWS Aurora PostgreSQL.
   - Validates schema (23 core tables) and performs latency health checks before any traffic cutover.

3. **`InfrastructureProvider`** (`src/providers/infrastructure/infrastructure.provider.ts` & `src/providers/aws/aws-infrastructure.provider.ts`):
   - Returns honest states (`NOT_CONFIGURED` / `Not Provisioned`) without fake metrics.
   - Structured to query AWS ECS and CloudWatch APIs once enabled.

4. **`DeploymentProvider`** (`src/providers/deployment/deployment.provider.ts` & `src/providers/aws/aws-deployment.provider.ts`):
   - Supports `VERCEL`, `AWS`, `RENDER`, and `OTHER`.
   - Tenant #1 remains registered as `VERCEL`.

5. **`MetricsProvider`** (`src/providers/metrics/metrics.provider.ts` & `src/providers/aws/aws-metrics.provider.ts`):
   - Aggregates operational usage without simulating fictitious CloudWatch metrics.

---

## 4. Planned Migration Phases (Phases A through J)

| Phase | Milestone | Description | Readiness Status |
|---|---|---|---|
| **Phase A** | **AWS Account & Security** | AWS account creation, root MFA, IAM roles, least privilege policies, CloudTrail logging | **Step 6 Foundation Ready** |
| **Phase B** | **SuperAdmin Deployment** | Deploy Control Plane Next.js app to ECS Fargate behind ALB | Documented & Abstracted |
| **Phase C** | **Tenant Backend Migration** | Containerize tenant backend services for ECS execution | Documented |
| **Phase D** | **RDS Migration** | Replicate Render PostgreSQL to AWS RDS in `ap-south-1` via DMS/pg_dump; update secret reference | Zero-Downtime Secret Cutover Ready |
| **Phase E** | **Redis (ElastiCache)** | Deploy ElastiCache Redis cluster in private subnet; transition cache layer | Cache Provider Ready |
| **Phase F** | **S3 Media Storage** | Setup tenant asset buckets (`restroconnect-tenant-assets-ap-south-1`) with CloudFront CDN | S3 Interface Prepared |
| **Phase G** | **Cloudflare & Domain Cutover** | Point tenant DNS & SSL through Cloudflare to AWS ALB | Architecture Defined |
| **Phase H** | **ECS/Fargate Scaling** | Configure target tracking auto-scaling based on CPU/RAM and order volume | Deployment Abstraction Ready |
| **Phase I** | **CloudWatch & Alarms** | Setup CloudWatch synthetic canaries, composite alarms, and SNS alerts | Metrics Interface Prepared |
| **Phase J** | **Backup & Disaster Recovery** | Setup automated AWS Backup policies, cross-region snapshots, and RTO/RPO targets | Plan Documented |

---

## 5. Zero-Downtime Database Cutover Procedure (Phase D Detail)

When Phase D is executed:

1. **Pre-Sync**: Replicate Render PostgreSQL to AWS RDS PostgreSQL via `pg_dump` or AWS DMS continuous replication.
2. **Schema Verification**: SuperAdmin runs automated schema validation against RDS endpoint.
3. **Secret Reference Update**: Update `TenantDatabase.secretReference` from `env:FIRST_TENANT_DATABASE_URL` to `aws/secretsmanager/restroconnect/tenants/<tenant-id>/database`.
4. **Instant Switchover**: The `UnifiedSecretResolver` begins resolving the new RDS endpoint on subsequent requests without requiring code redeployment.
5. **Rollback Safety**: If any anomaly is detected, revert `secretReference` to Render PostgreSQL immediately.
