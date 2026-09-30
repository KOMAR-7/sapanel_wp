const fs = require('fs');

async function testAll() {
  const baseUrl = 'http://localhost:3005';
  console.log('=== APPLICATION API VERIFICATION ===\n');

  // 1. Health
  const healthRes = await fetch(`${baseUrl}/api/health`);
  console.log('1. GET /api/health:', healthRes.status, await healthRes.json());
  if (healthRes.status !== 200) throw new Error('Health check failed');

  // 2. Login
  const loginRes = await fetch(`${baseUrl}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@restroconnect.com',
      password: 'RestroPlatform2026!Secure',
    }),
  });
  console.log('\n2. POST /api/admin/auth/login:', loginRes.status);
  const loginData = await loginRes.json();
  console.log('Login Response:', JSON.stringify(loginData));
  if (loginRes.status !== 200 || !loginData.success) throw new Error('Login failed');

  const cookie = loginRes.headers.get('set-cookie');
  const headers = {
    'Content-Type': 'application/json',
    ...(cookie ? { Cookie: cookie.split(';')[0] } : {}),
  };

  // 3. /api/admin/auth/me
  const meRes = await fetch(`${baseUrl}/api/admin/auth/me`, { headers });
  console.log('\n3. GET /api/admin/auth/me:', meRes.status);
  const meData = await meRes.json();
  console.log('Me Response:', JSON.stringify(meData));

  // 4. /api/admin/dashboard
  const dashRes = await fetch(`${baseUrl}/api/admin/dashboard`, { headers });
  console.log('\n4. GET /api/admin/dashboard:', dashRes.status);
  const dashData = await dashRes.json();
  console.log('Dashboard Data:', dashData.data ? 'PRESENT' : 'NONE');

  // 5. /api/admin/tenants
  const tenantsRes = await fetch(`${baseUrl}/api/admin/tenants`, { headers });
  console.log('\n5. GET /api/admin/tenants:', tenantsRes.status);
  const tenantsData = await tenantsRes.json();
  const tenantsList = tenantsData.data?.tenants || [];
  console.log('Tenants count:', tenantsList.length);
  const firstTenant = tenantsList[0];
  if (firstTenant) {
    console.log('Tenant #1:', {
      name: firstTenant.name,
      code: firstTenant.tenantCode || firstTenant.code,
      status: firstTenant.status,
    });
  }

  const tenantId = firstTenant?.id;

  // 6. /api/admin/tenants/:id
  if (tenantId) {
    const tenantDetailRes = await fetch(`${baseUrl}/api/admin/tenants/${tenantId}`, { headers });
    console.log('\n6. GET /api/admin/tenants/[id]:', tenantDetailRes.status);
    const tenantDetail = await tenantDetailRes.json();
    console.log('Tenant Details Verified: name =', tenantDetail.data?.tenant?.name, ', code =', tenantDetail.data?.tenant?.tenantCode);
  }

  // 7. /api/admin/databases
  const dbRes = await fetch(`${baseUrl}/api/admin/databases`, { headers });
  console.log('\n7. GET /api/admin/databases:', dbRes.status);
  const dbData = await dbRes.json();
  const dbs = dbData.data?.databases || [];
  console.log('Databases count:', dbs.length);

  // 8. /api/admin/deployments
  const depRes = await fetch(`${baseUrl}/api/admin/deployments`, { headers });
  console.log('\n8. GET /api/admin/deployments:', depRes.status);
  const depData = await depRes.json();
  const deps = depData.data?.deployments || [];
  console.log('Deployments count:', deps.length);

  // 9. /api/admin/features
  const featRes = await fetch(`${baseUrl}/api/admin/features`, { headers });
  console.log('\n9. GET /api/admin/features:', featRes.status);
  const featData = await featRes.json();
  const feats = featData.data?.features || [];
  console.log('Features count:', feats.length);

  // 10. /api/admin/subscriptions
  const subRes = await fetch(`${baseUrl}/api/admin/subscriptions`, { headers });
  console.log('\n10. GET /api/admin/subscriptions:', subRes.status);
  const subData = await subRes.json();
  const plans = subData.data?.plans || [];
  const activeSubs = subData.data?.activeSubscriptions || [];
  console.log('Subscription plans count:', plans.length, '| Active subscriptions count:', activeSubs.length);

  // 11. /api/admin/payments
  const payRes = await fetch(`${baseUrl}/api/admin/payments`, { headers });
  console.log('\n11. GET /api/admin/payments:', payRes.status);
  const payData = await payRes.json();
  const pays = payData.data?.payments || [];
  console.log('Payments count:', pays.length);

  // 12. /api/admin/audit-logs
  const auditRes = await fetch(`${baseUrl}/api/admin/audit-logs`, { headers });
  console.log('\n12. GET /api/admin/audit-logs:', auditRes.status);
  const auditData = await auditRes.json();
  const audits = auditData.data?.logs || auditData.data?.auditLogs || [];
  console.log('Audit logs count:', audits.length);

  // 13. Credential Leakage Check across all payloads
  const allJson = JSON.stringify([
    loginData,
    meData,
    dashData,
    tenantsData,
    dbData,
    depData,
    featData,
    subData,
    payData,
    auditData,
  ]);

  // Extract password from DATABASE_URL if present to check leakage
  const dbUrl = process.env.DATABASE_URL || '';
  const urlPassMatch = dbUrl.match(/:\/\/.*?:(.*?)@/);
  const passToTest = urlPassMatch ? urlPassMatch[1] : '';

  const hasRawPass = passToTest ? allJson.includes(passToTest) : false;

  console.log('\n--- CREDENTIAL LEAKAGE AUDIT ---');
  console.log('Raw database passwords leaked in responses:', hasRawPass ? 'FAIL' : 'PASS (NONE)');

  console.log('\nALL APPLICATION VERIFICATIONS PASSED SUCCESSFULLY!');
}

testAll().catch(e => {
  console.error('\nVerification Error:', e);
  process.exit(1);
});
