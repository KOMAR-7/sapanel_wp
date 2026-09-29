# AWS Billing, Cost Safety & Resource Tagging: RESTROCONNECT

> [!CAUTION]
> **Cost Integrity Guarantee**:
> - RESTROCONNECT SuperAdmin **never** assumes billing APIs are active.
> - The application **never** displays simulated or fake AWS cost numbers.
> - The platform owner must configure AWS Billing Budgets and Cost Alerts manually in the AWS Console.

---

## 1. AWS Free Tier Limitations & Operational Guidelines

When preparing or deploying foundation resources in `ap-south-1` (Mumbai), be mindful of Free Tier quotas:

| Service | Free Tier Allowance (First 12 Months) | Post-Free Tier / Overage Impact |
|---|---|---|
| **Amazon RDS** | 750 hours/month of `db.t3.micro` or `db.t4g.micro` Single-AZ + 20 GB SSD storage | Hourly billing applies (~$0.018/hr for t4g.micro); Multi-AZ is billed at 2x rate |
| **Amazon S3** | 5 GB standard storage, 20,000 GET, 2,000 PUT requests | ~$0.023 per GB/month in `ap-south-1` |
| **AWS Secrets Manager** | 30-day free trial per secret | **$0.40 per secret/month** + $0.05 per 10,000 API calls |
| **CloudWatch** | 10 custom metrics, 10 alarms, 5 GB log ingestion | $0.30 per custom metric/month; $0.50 per GB ingested |
| **NAT Gateway** | *No Free Tier* (~$0.045/hour + $0.045/GB data processed) | ~$32/month per NAT Gateway |

> [!TIP]
> To maintain zero/low cost during staging:
> - Use single-AZ `db.t4g.micro` RDS for non-production environments.
> - Use VPC Endpoints for S3 and Secrets Manager to avoid NAT Gateway data processing fees.
> - Rely on local In-Memory caching until live tenant scale necessitates AWS ElastiCache.

---

## 2. AWS Budgets & Anomaly Detection Setup

Platform administrators must establish cost safety controls via the AWS Billing Console:

### Step A: Configure AWS Budgets
1. Open the **AWS Budgets** console.
2. Select **Create budget > Zero spend budget** (for trial accounts) or **Monthly cost budget** (e.g. `$25.00`).
3. Set early-warning email notifications:
   - Alert 1: 50% of budget reached (Actual)
   - Alert 2: 85% of budget reached (Actual)
   - Alert 3: 100% of budget forecasted before month end
4. Target recipient: `finance@restroconnect.com`, `admin@restroconnect.com`.

### Step B: Enable AWS Cost Anomaly Detection
1. Open **Cost Management > Cost Anomaly Detection**.
2. Create a monitor for **All AWS Services**.
3. Set alert frequency to **Immediate (Daily summary)** with an anomaly threshold (e.g. spend variance > `$10.00`).

---

## 3. Unexpected Resource Protection

To avoid accidental billing surges:
1. **No Rogue Regions**: Restrict all provisioning strictly to `ap-south-1` (Mumbai) using SCP (Service Control Policies) or IAM condition keys:
   ```json
   {
     "Condition": {
       "StringNotEquals": {
         "aws:RequestedRegion": "ap-south-1"
       }
     }
   }
   ```
2. **NAT Gateway Caution**: Do not provision unnecessary NAT Gateways in multiple AZs during early staging.
3. **Aurora Serverless v2 Scaling Limits**: If using Aurora PostgreSQL, set minimum ACU to `0.5` and maximum ACU to `2.0` during development.

---

## 4. Resource Tagging Standard

All future AWS resources provisioned for RESTROCONNECT must adhere to this standardized tagging structure to enable granular cost allocation and multi-tenant billing attribution.

### Mandatory Resource Tags:

| Tag Key | Example Value | Description |
|---|---|---|
| `Project` | `RESTROCONNECT` | Unified project identifier |
| `Environment` | `production` / `staging` / `development` | Deployment tier |
| `ManagedBy` | `RESTROCONNECT` | Infrastructure orchestrator |
| `TenantId` | `tenant-spice-001` or `shared` | Specific tenant ID or `shared` for platform control plane |
| `TenantCode` | `SPICE-001` or `PLATFORM` | Human-readable tenant tracking code |
| `ResourceType` | `RDS` / `ECS_SERVICE` / `ELASTICACHE` / `S3` | Architecture layer classification |

### Example Tag Application (Conceptual AWS CLI):
```bash
aws resourcegroupstaggingapi tag-resources \
  --resource-arn-list "arn:aws:rds:ap-south-1:123456789012:db:restro-spice-001" \
  --tags Project=RESTROCONNECT,Environment=production,ManagedBy=RESTROCONNECT,TenantId=tenant-spice-001,TenantCode=SPICE-001,ResourceType=RDS
```

> [!NOTE]
> Do NOT apply tags to resources that do not exist yet. This document establishes the tagging standard for upcoming migration phases.
