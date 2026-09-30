const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function exportAll() {
  console.log('Exporting all local Control Plane data...');
  const data = {};

  data.platformAdmin = await prisma.platformAdmin.findMany();
  data.subscriptionPlan = await prisma.subscriptionPlan.findMany();
  data.feature = await prisma.feature.findMany();
  data.tenant = await prisma.tenant.findMany();
  data.tenantDatabase = await prisma.tenantDatabase.findMany();
  data.deployment = await prisma.deployment.findMany();
  data.serverResource = await prisma.serverResource.findMany();
  data.tenantFeature = await prisma.tenantFeature.findMany();
  data.tenantSubscription = await prisma.tenantSubscription.findMany();
  data.payment = await prisma.payment.findMany();
  data.domain = await prisma.domain.findMany();
  data.metaIntegration = await prisma.metaIntegration.findMany();
  data.usageSnapshot = await prisma.usageSnapshot.findMany();
  data.healthCheck = await prisma.healthCheck.findMany();
  data.auditLog = await prisma.auditLog.findMany();
  data.supportTicket = await prisma.supportTicket.findMany();
  data.provisioningJob = await prisma.provisioningJob.findMany();

  const backupPath = path.join(__dirname, 'control_plane_backup.json');
  fs.writeFileSync(backupPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Backup saved to ${backupPath}`);
  for (const [k, v] of Object.entries(data)) {
    console.log(`  ${k}: ${v.length} records`);
  }
}

exportAll()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
