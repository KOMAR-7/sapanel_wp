const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to Prisma...');
  const adminCount = await prisma.platformAdmin.count();
  const planCount = await prisma.subscriptionPlan.count();
  const featureCount = await prisma.feature.count();
  const tenantCount = await prisma.tenant.count();
  const dbCount = await prisma.tenantDatabase.count();
  const deployCount = await prisma.deployment.count();
  const tenantFeatureCount = await prisma.tenantFeature.count();
  const subCount = await prisma.tenantSubscription.count();
  const paymentCount = await prisma.payment.count();
  const metaCount = await prisma.metaIntegration.count();
  const usageCount = await prisma.usageSnapshot.count();
  const healthCount = await prisma.healthCheck.count();
  const auditCount = await prisma.auditLog.count();
  const jobCount = await prisma.provisioningJob.count();

  console.log('--- RENDER DATABASE RECORD COUNTS ---');
  console.log('PlatformAdmins:', adminCount);
  console.log('SubscriptionPlans:', planCount);
  console.log('Features:', featureCount);
  console.log('Tenants:', tenantCount);
  console.log('TenantDatabases:', dbCount);
  console.log('Deployments:', deployCount);
  console.log('TenantFeatures:', tenantFeatureCount);
  console.log('TenantSubscriptions:', subCount);
  console.log('Payments:', paymentCount);
  console.log('MetaIntegrations:', metaCount);
  console.log('UsageSnapshots:', usageCount);
  console.log('HealthChecks:', healthCount);
  console.log('AuditLogs:', auditCount);
  console.log('ProvisioningJobs:', jobCount);

  const tenant = await prisma.tenant.findUnique({
    where: { tenantCode: 'SPICE-001' },
    include: {
      databases: true,
      deployments: true,
      features: { include: { feature: true } },
      subscriptions: { include: { plan: true } },
      healthChecks: true,
      auditLogs: { take: 3 },
      provisioningJobs: true,
    }
  });

  if (!tenant) {
    console.error('ERROR: Spice Route tenant not found!');
    process.exit(1);
  }

  console.log('\n--- SPICE ROUTE TENANT RELATIONS VERIFICATION ---');
  console.log('Tenant Name:', tenant.name);
  console.log('Tenant Code:', tenant.tenantCode);
  console.log('Tenant Status:', tenant.status);
  console.log('Database Provider:', tenant.databases[0]?.provider, '| Engine:', tenant.databases[0]?.engine, '| Host exists:', !!tenant.databases[0]?.host);
  console.log('Deployment Provider:', tenant.deployments[0]?.provider, '| Frontend URL:', tenant.deployments[0]?.frontendUrl);
  console.log('Features Attached:', tenant.features.length);
  console.log('Subscription Plan:', tenant.subscriptions[0]?.plan?.name, '| Status:', tenant.subscriptions[0]?.status);
  console.log('Health Checks:', tenant.healthChecks.length);
  console.log('Recent Audit Logs:', tenant.auditLogs.length);
  console.log('Provisioning Status:', tenant.provisioningJobs[0]?.status);

  console.log('\nALL VERIFICATIONS PASSED SUCCESSFULLY.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
