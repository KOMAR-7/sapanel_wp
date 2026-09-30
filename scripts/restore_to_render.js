const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function restore() {
  const backupFile = path.join(__dirname, 'control_plane_backup.json');
  if (!fs.existsSync(backupFile)) {
    throw new Error('Backup file not found at ' + backupFile);
  }

  const data = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  console.log('Restoring data to Render PostgreSQL (restroconnect_control_plane schema)...');

  // 1. PlatformAdmin
  for (const item of data.platformAdmin) {
    await prisma.platformAdmin.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    });
  }
  console.log(`✓ Restored ${data.platformAdmin.length} PlatformAdmin records`);

  // 2. SubscriptionPlan
  for (const item of data.subscriptionPlan) {
    await prisma.subscriptionPlan.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    });
  }
  console.log(`✓ Restored ${data.subscriptionPlan.length} SubscriptionPlan records`);

  // 3. Feature
  for (const item of data.feature) {
    await prisma.feature.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    });
  }
  console.log(`✓ Restored ${data.feature.length} Feature records`);

  // 4. Tenant
  for (const item of data.tenant) {
    await prisma.tenant.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    });
  }
  console.log(`✓ Restored ${data.tenant.length} Tenant records`);

  // 5. TenantDatabase
  for (const item of data.tenantDatabase) {
    await prisma.tenantDatabase.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    });
  }
  console.log(`✓ Restored ${data.tenantDatabase.length} TenantDatabase records`);

  // 6. Deployment
  for (const item of data.deployment) {
    await prisma.deployment.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    });
  }
  console.log(`✓ Restored ${data.deployment.length} Deployment records`);

  // 7. TenantFeature
  for (const item of data.tenantFeature) {
    await prisma.tenantFeature.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    });
  }
  console.log(`✓ Restored ${data.tenantFeature.length} TenantFeature records`);

  // 8. TenantSubscription
  for (const item of data.tenantSubscription) {
    await prisma.tenantSubscription.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    });
  }
  console.log(`✓ Restored ${data.tenantSubscription.length} TenantSubscription records`);

  // 9. Payment
  for (const item of data.payment) {
    await prisma.payment.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    });
  }
  console.log(`✓ Restored ${data.payment.length} Payment records`);

  // 10. MetaIntegration
  for (const item of data.metaIntegration) {
    await prisma.metaIntegration.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    });
  }
  console.log(`✓ Restored ${data.metaIntegration.length} MetaIntegration records`);

  // 11. UsageSnapshot
  for (const item of data.usageSnapshot) {
    await prisma.usageSnapshot.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    });
  }
  console.log(`✓ Restored ${data.usageSnapshot.length} UsageSnapshot records`);

  // 12. HealthCheck
  for (const item of data.healthCheck) {
    await prisma.healthCheck.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    });
  }
  console.log(`✓ Restored ${data.healthCheck.length} HealthCheck records`);

  // 13. AuditLog
  for (const item of data.auditLog) {
    await prisma.auditLog.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    });
  }
  console.log(`✓ Restored ${data.auditLog.length} AuditLog records`);

  // 14. ProvisioningJob
  for (const item of data.provisioningJob) {
    await prisma.provisioningJob.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    });
  }
  console.log(`✓ Restored ${data.provisioningJob.length} ProvisioningJob records`);

  console.log('\n--- DATA MIGRATION TO RENDER CONTROL PLANE COMPLETE ---');
}

restore()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
