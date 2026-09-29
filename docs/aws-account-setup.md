# AWS Account Setup Guide for RESTROCONNECT Platform

> [!NOTE]
> This guide provides step-by-step, beginner-friendly instructions for creating and hardening an AWS Account for the RESTROCONNECT platform.
> **DO NOT** use automated scripts to create accounts. Follow these best practices manually in the AWS Console.

---

## Step 1: Create AWS Account

1. Navigate to [https://aws.amazon.com](https://aws.amazon.com) and click **"Create an AWS Account"**.
2. Enter the official platform administrator email address (e.g., `aws-admin@restroconnect.com`).
3. Set a strong password (minimum 20 characters with upper/lower letters, symbols, and numbers).
4. Provide the company/organization contact details and payment method for billing verification.

---

## Step 2: Enable Multi-Factor Authentication (MFA) on Root Account

1. Sign in as the **Root User** using your root email and password.
2. In the top-right navigation bar, click your account name and select **Security Credentials**.
3. Under **Multi-factor authentication (MFA)**, click **Assign MFA Device**.
4. Device name: `Root-Hardware-Key` or `Root-Authenticator-App` (e.g., Google Authenticator, 1Password, or YubiKey).
5. Scan the QR code, enter two consecutive 6-digit codes, and click **Add MFA**.
6. **Save emergency backup codes** in a secure offline vault.

---

## Step 3: Lock Away Root Credentials

- **Rule**: NEVER use the root user for daily development, administration, or API access.
- **NEVER** generate access keys (AWS Access Key ID / Secret Access Key) for the root account.
- If root access keys already exist, delete them immediately under **Security Credentials > Access Keys**.

---

## Step 4: Configure Administrative IAM Access

1. Open the **IAM (Identity and Access Management)** Console.
2. Best Practice: Set up **AWS IAM Identity Center** (formerly AWS SSO) or create an administrative IAM user:
   - User name: `restro-admin`
   - Access type: AWS Management Console access only
   - Attach permission policy: `AdministratorAccess` (restricted to human administrators, NOT applications).
   - Require MFA upon first login.
3. Sign out of the root user and sign in using your new administrative account.

---

## Step 5: Select AWS Region (Mumbai `ap-south-1`)

1. In the top navigation bar, click the region selector dropdown.
2. Select **Asia Pacific (Mumbai) `ap-south-1`**.
3. All platform databases, compute instances, cache nodes, and secrets must reside in `ap-south-1` to minimize latency for Indian restaurants and comply with local data sovereignty guidelines.

---

## Step 6: Configure Billing Alerts & Cost Protection

1. In the search bar, navigate to **Billing and Cost Management**.
2. Click **Billing Preferences** (or **Preferences**):
   - Check: **Receive Free Tier Usage Alerts**.
   - Check: **Receive Billing Alerts**.
   - Enter notification email: `billing@restroconnect.com`.
3. Under **Budgets**, click **Create budget**:
   - Budget type: **Cost budget - Monthly**.
   - Budget name: `RESTROCONNECT-Monthly-Budget`.
   - Amount: Set an initial limit (e.g., `$20.00` during testing or `$100.00` for staging).
   - Set alert thresholds:
     - 80% of budgeted amount (Actual) -> Send Email.
     - 100% of budgeted amount (Actual) -> Send Email.
     - 100% of budgeted amount (Forecasted) -> Send Email.

---

## Step 7: Configure AWS CloudTrail for Security Auditing

1. Search for and open **CloudTrail**.
2. Click **Create trail**:
   - Trail name: `restroconnect-audit-trail`.
   - Storage location: Create a new S3 bucket named `restroconnect-cloudtrail-logs-[account-id]`.
   - Enable **Log file SSE-KMS encryption**.
   - Multi-region trail: **Yes** (to detect any unexpected global resource provisioning).
   - CloudWatch Logs: Optional for Phase A; can be attached in Phase I.
3. Click **Create trail**.

---

## Step 8: Prepare Secrets Manager

1. Open **AWS Secrets Manager** in `ap-south-1`.
2. Verify the Secrets Manager service is accessible.
3. The platform uses standard hierarchical paths:
   ```
   restroconnect/platform/control-plane
   restroconnect/tenants/<tenant-id>/database
   restroconnect/tenants/<tenant-id>/meta
   restroconnect/infrastructure/deployment
   ```
4. Note: Secrets will be populated per-tenant during Phase D database migrations.

---

## Step 9: Record AWS Account ID in Environment

1. Copy your 12-digit AWS Account ID from the top right user menu (e.g., `123456789012`).
2. Add it to your server-side environment:
   ```bash
   AWS_REGION=ap-south-1
   AWS_ACCOUNT_ID=123456789012
   ```
3. Remember: The SuperAdmin server validates that the account ID is strictly 12 numeric digits and never exposes it to frontend clients.

---

## Step 10: Verification Checklist

- [x] Root user MFA enabled
- [x] Root access keys deleted / absent
- [x] Administrative IAM user/role created with MFA
- [x] Default region set to Mumbai (`ap-south-1`)
- [x] Billing alerts and budget configured
- [x] CloudTrail enabled for multi-region audit logging
- [x] AWS Account ID recorded in server environment
