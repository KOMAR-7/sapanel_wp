# AWS IAM Security & Role Design: RESTROCONNECT

> [!IMPORTANT]
> **Least Privilege Mandate**:
> - NEVER grant `AdministratorAccess` to application runtime roles.
> - NEVER use AWS root credentials for application execution.
> - NEVER commit or hardcode IAM access keys (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`).
> - When deployed on AWS ECS/Fargate, the application MUST use **IAM Roles for ECS Tasks**.

---

## 1. Role Architecture Overview

```
                      [AWS ECS Fargate Task / EC2]
                                   │
               ┌───────────────────┴───────────────────┐
               ▼                                       ▼
  [ECS Task Execution Role]                    [ECS Task Role]
(Image Pull & CloudWatch Logs)             (Application Permissions)
                                                       │
                 ┌─────────────────────────────┬───────┴─────────────────────────────┐
                 ▼                             ▼                                     ▼
 [RESTROCONNECT-ControlPlane-Role]  [RESTROCONNECT-Backend-Role]        [RESTROCONNECT-MonitoringRole]
  - Secrets Manager (Tenant DBs)     - S3 Tenant Assets                   - CloudWatch Read-Only
  - Describe ECS Services            - ElastiCache Access                 - Read RDS Performance Insights
  - RDS Health Metadata Only         - CloudWatch Log Streaming           - CloudTrail Audit Read
```

---

## 2. Conceptual IAM Roles

### Role 1: `RESTROCONNECT-ControlPlane-Role`
- **Purpose**: Runtime role for the SuperAdmin Control Plane Next.js backend when running on ECS Fargate.
- **Assumed By**: ECS Task Service (`ecs-tasks.amazonaws.com`).
- **Permissions**:
  - `secretsmanager:GetSecretValue` on ARNs matching `arn:aws:secretsmanager:ap-south-1:<account-id>:secret:restroconnect/*`
  - `secretsmanager:DescribeSecret`
  - `ecs:DescribeServices`, `ecs:DescribeTasks` on the platform ECS cluster
  - `rds:DescribeDBInstances` (metadata only, no database mutation privileges)
  - `cloudwatch:GetMetricData`

#### Example Least-Privilege IAM Policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowSecretsManagerRead",
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:ap-south-1:*:secret:restroconnect/*"
    },
    {
      "Sid": "AllowECSInspection",
      "Effect": "Allow",
      "Action": [
        "ecs:DescribeServices",
        "ecs:DescribeTasks",
        "ecs:ListTasks"
      ],
      "Resource": "*"
    },
    {
      "Sid": "AllowRdsMetadataRead",
      "Effect": "Allow",
      "Action": [
        "rds:DescribeDBInstances",
        "rds:DescribeDBClusters"
      ],
      "Resource": "*"
    }
  ]
}
```

---

### Role 2: `RESTROCONNECT-Backend-Role`
- **Purpose**: Runtime role for restaurant tenant backend services (ordering bot, customer storefront, staff POS).
- **Assumed By**: ECS Tasks executing tenant backend containers.
- **Permissions**:
  - `s3:GetObject`, `s3:PutObject` on `arn:aws:s3:::restroconnect-tenant-assets-ap-south-1/*`
  - `secretsmanager:GetSecretValue` ONLY for the assigned tenant's database and Meta secrets:
    `arn:aws:secretsmanager:ap-south-1:*:secret:restroconnect/tenants/${aws:PrincipalTag/TenantId}/*`
  - CloudWatch Logs emission: `logs:CreateLogStream`, `logs:PutLogEvents`.

---

### Role 3: `RESTROCONNECT-DeploymentRole`
- **Purpose**: CI/CD deployment role (e.g., GitHub Actions, AWS CodePipeline) for deploying updates to ECS and RDS.
- **Assumed By**: OpenID Connect (OIDC) federated role or AWS CodePipeline.
- **Permissions**:
  - `ecr:GetAuthorizationToken`, `ecr:BatchCheckLayerAvailability`, `ecr:PutImage`
  - `ecs:UpdateService`, `ecs:RegisterTaskDefinition`
  - **Forbidden**: No general database read/write access; no ability to alter IAM permissions or billing accounts.

---

### Role 4: `RESTROCONNECT-ReadOnlyMonitoringRole`
- **Purpose**: For observability systems, health checks, and read-only audit dashboards.
- **Assumed By**: Platform Viewer accounts and automated synthetic monitors.
- **Permissions**:
  - `cloudwatch:DescribeAlarms`, `cloudwatch:GetMetricData`
  - `cloudtrail:LookupEvents`
  - `health:DescribeEvents`, `health:DescribeEventDetails`
  - Strictly read-only; no ability to create, update, or terminate resources.

---

## 3. ECS Task Trust Relationship

Every ECS Task Role must include a trust relationship allowing ECS tasks to assume the role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

---

## 4. Credential Handling Protocols

1. **Local Development**:
   - Application runs with `AWS_ENABLED=false` and relies on `LocalSecretProvider` (`env:` references).
   - Zero local AWS keys are required.
2. **Staging / Production (AWS)**:
   - AWS SDK automatically discovers task credentials via AWS Container Credentials environment variables.
   - Access keys are NOT configured in environment files.
3. **Control Plane Security**:
   - Audit logs automatically redact any strings containing `password`, `secret`, `token`, `accessKey`, or `AWS_SECRET_ACCESS_KEY`.
