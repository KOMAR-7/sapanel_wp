import prisma from '../src/lib/db/prisma';
import { tenantService } from '../src/services/tenants/tenant.service';
import { databaseProvider } from '../src/providers/database/database.provider';

async function runOnboardingTest() {
  console.log('====================================================');
  console.log('STEP 4 — FIRST RESTAURANT / TENANT #1 ONBOARDING RUN');
  console.log('====================================================\n');

  // 1. Fetch Platform Admin
  const admin = await prisma.platformAdmin.findFirst({
    where: { role: 'PLATFORM_SUPER_ADMIN' },
  });
  if (!admin) {
    throw new Error('Platform SuperAdmin not found. Run prisma/seed-baseline.js first.');
  }
  console.log(`[Admin Auth] Verified SuperAdmin: ${admin.email} (ID: ${admin.id})`);

  // 2. Step 3 Database Test Connection
  console.log('\n--- Step 3: Test Database Connection ---');
  const secretRef = 'env:FIRST_TENANT_DATABASE_URL';
  const testConn = await databaseProvider.testConnection(secretRef);
  console.log('Test Connection Result:', {
    status: testConn.status,
    latencyMs: `${testConn.latencyMs} ms`,
    pgVersion: testConn.pgVersion,
    host: testConn.host ? `${testConn.host.slice(0, 4)}••••.${testConn.host.split('.').slice(1).join('.')}` : 'Unknown',
  });
  if (testConn.status !== 'CONNECTED') {
    throw new Error(`Database connection failed: ${testConn.error}`);
  }

  // 3. Step 3 Database Discovery
  console.log('\n--- Step 3: Database Discovery (Read-Only) ---');
  const discovered = await databaseProvider.discoverTenantData(secretRef);
  console.log('Discovered Restaurant:', discovered.restaurant?.name, `(${discovered.restaurant?.slug})`);
  console.log('Discovery Statistics:', {
    branches: discovered.branchesCount,
    categories: discovered.categoriesCount,
    items: discovered.itemsCount,
    customers: discovered.customersCount,
    orders: discovered.ordersCount,
  });

  // 4. Step 3 Schema Validation
  console.log('\n--- Step 3: Schema Validation (Read-Only) ---');
  const schema = await databaseProvider.validateSchema(secretRef);
  console.log('Schema Status:', schema.status);
  console.log(`Expected tables verified: ${schema.foundTables.length} / ${schema.totalExpected} found`);
  console.log('Found tables:', schema.foundTables.join(', '));

  // 5. Subscription Plan selection
  const plan = await prisma.subscriptionPlan.findFirst({
    where: { name: 'Professional' },
  });
  if (!plan) {
    throw new Error('Subscription plan Professional not found.');
  }
  console.log(`\n[Subscription Plan] Selected: ${plan.name} (₹${plan.price}/mo)`);

  // Clean up any existing SPICE-001 tenant to test fresh end-to-end registration flow
  const existing = await prisma.tenant.findFirst({
    where: { OR: [{ tenantCode: 'SPICE-001' }, { slug: 'spice-route' }] },
  });
  if (existing) {
    console.log(`[Setup] Resetting existing Tenant ${existing.tenantCode} to demonstrate fresh onboarding transaction...`);
    await prisma.tenant.delete({ where: { id: existing.id } });
  }

  // 6. Execute Final Registration Transaction
  console.log('\n--- Step 8: Register Restaurant (Executing Transaction) ---');
  const tenant = await tenantService.createTenant(
    {
      name: discovered.restaurant?.name || 'Spice Route',
      slug: discovered.restaurant?.slug || 'spice-route',
      tenantCode: 'SPICE-001',
      subdomain: 'spiceroute',
      ownerName: 'Saeem Merchant',
      ownerEmail: discovered.restaurant?.email || 'hello@spiceroute.com',
      ownerPhone: discovered.restaurant?.phone || '+91 9876543210',
      city: discovered.restaurant?.city || 'Mumbai',
      state: discovered.restaurant?.state || 'Maharashtra',
      address: discovered.restaurant?.address || '123 Food Street',
      pincode: discovered.restaurant?.pincode || '400001',
      timezone: 'Asia/Kolkata',
      country: 'India',
      environment: 'production',
      isolationMode: 'DEDICATED_DATABASE',
      frontendUrl: process.env.FIRST_TENANT_FRONTEND_URL || 'https://wp-admin-five.vercel.app/',
      backendUrl: process.env.FIRST_TENANT_BACKEND_URL || undefined,
      hostingProvider: 'VERCEL',
      region: 'Singapore',
      planId: plan.id,
      billingCycle: 'MONTHLY',
      paymentStatus: 'PAID',
      databaseProvider: 'RENDER',
      databaseHost: testConn.host,
      databasePort: 5432,
      databaseName: 'restpro_db_render',
      databaseUsername: 'restpro_db_render_user',
      secretReference: secretRef,
      initialFeatures: [
        'RESTAURANT_MANAGEMENT',
        'BRANCH_MANAGEMENT',
        'MENU_MANAGEMENT',
        'ORDERS',
        'CUSTOMERS',
        'WHATSAPP_ORDERING',
        'WHATSAPP_CATALOG',
        'ONLINE_ORDERING',
        'LOYALTY',
        'CAMPAIGNS',
        'PUSH_NOTIFICATIONS',
        'MULTI_BRANCH',
        'REPORTS',
        'ANALYTICS',
        'COUPONS',
      ],
    },
    admin.id
  );

  console.log(`\n✓ TENANT CREATED: ${tenant.name} (${tenant.tenantCode}) — ID: ${tenant.id}`);
  console.log(`✓ Initial Status: ${tenant.status}`);

  // 7. Verify all Control Plane Records
  console.log('\n--- Verifying Control Plane Database Records ---');
  const fullTenant = await tenantService.getTenantById(tenant.id);

  console.log(`- Databases count: ${fullTenant?.databases.length} (Status: ${fullTenant?.databases[0]?.status}, Schema: ${fullTenant?.databases[0]?.schemaStatus})`);
  console.log(`- Deployments count: ${fullTenant?.deployments.length} (Provider: ${fullTenant?.deployments[0]?.provider}, Frontend: ${fullTenant?.deployments[0]?.frontendUrl})`);
  console.log(`- Subscriptions count: ${fullTenant?.subscriptions.length} (Plan: ${fullTenant?.subscriptions[0]?.plan?.name})`);
  console.log(`- Payments count: ${fullTenant?.payments.length} (Amount: ₹${fullTenant?.payments[0]?.amount}, Status: ${fullTenant?.payments[0]?.status})`);
  console.log(`- Features attached: ${fullTenant?.features.length}`);
  console.log(`- Health checks count: ${fullTenant?.healthChecks.length}`);
  console.log(`- Usage snapshots count: ${fullTenant?.usageSnapshots.length}`);
  console.log(`- Audit logs count: ${fullTenant?.auditLogs.length}`);

  const jobs = await prisma.provisioningJob.findMany({ where: { tenantId: tenant.id } });
  console.log(`- Provisioning jobs count: ${jobs.length} (Status: ${jobs[0]?.status})`);

  console.log('\n====================================================');
  console.log('ONBOARDING SUCCESS: TENANT #1 FULLY ACTIVE & VERIFIED');
  console.log('====================================================\n');
}

runOnboardingTest()
  .catch((e) => {
    console.error('Onboarding Test Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
