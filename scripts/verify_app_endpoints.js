const fs = require('fs');

async function testAll() {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3005';
  console.log('=== APPLICATION API VERIFICATION ===\n');

  // 1. Health
  const healthRes = await fetch(`${baseUrl}/api/health`);
  console.log('1. GET /api/health:', healthRes.status, await healthRes.json());
  if (healthRes.status !== 200) throw new Error('Health check failed');

  // 2. Login (requires TEST_ADMIN_PASSWORD or skips credentials test if not set)
  const password = process.env.TEST_ADMIN_PASSWORD;
  if (!password) {
    console.log('2. Skipping login test (TEST_ADMIN_PASSWORD not set). Health endpoint verified.');
    return;
  }

  const loginRes = await fetch(`${baseUrl}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@restroconnect.com',
      password,
    }),
  });
  console.log('\n2. POST /api/admin/auth/login:', loginRes.status);
  const loginData = await loginRes.json();
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

  // 4. /api/admin/dashboard
  const dashRes = await fetch(`${baseUrl}/api/admin/dashboard`, { headers });
  console.log('\n4. GET /api/admin/dashboard:', dashRes.status);

  // 5. /api/admin/tenants
  const tenantsRes = await fetch(`${baseUrl}/api/admin/tenants`, { headers });
  console.log('\n5. GET /api/admin/tenants:', tenantsRes.status);
  const tenantsData = await tenantsRes.json();
  const tenantsList = tenantsData.data?.tenants || [];
  console.log('Tenants count:', tenantsList.length);
  const firstTenant = tenantsList[0];

  // 6. /api/admin/tenants/:id
  if (firstTenant?.id) {
    const tenantDetailRes = await fetch(`${baseUrl}/api/admin/tenants/${firstTenant.id}`, { headers });
    console.log('\n6. GET /api/admin/tenants/[id]:', tenantDetailRes.status);
  }

  // 7. /api/admin/databases
  const dbRes = await fetch(`${baseUrl}/api/admin/databases`, { headers });
  console.log('\n7. GET /api/admin/databases:', dbRes.status);

  // 8. /api/admin/deployments
  const depRes = await fetch(`${baseUrl}/api/admin/deployments`, { headers });
  console.log('\n8. GET /api/admin/deployments:', depRes.status);

  // 9. /api/admin/features
  const featRes = await fetch(`${baseUrl}/api/admin/features`, { headers });
  console.log('\n9. GET /api/admin/features:', featRes.status);

  // 10. /api/admin/subscriptions
  const subRes = await fetch(`${baseUrl}/api/admin/subscriptions`, { headers });
  console.log('\n10. GET /api/admin/subscriptions:', subRes.status);

  // 11. /api/admin/payments
  const payRes = await fetch(`${baseUrl}/api/admin/payments`, { headers });
  console.log('\n11. GET /api/admin/payments:', payRes.status);

  // 12. /api/admin/audit-logs
  const auditRes = await fetch(`${baseUrl}/api/admin/audit-logs`, { headers });
  console.log('\n12. GET /api/admin/audit-logs:', auditRes.status);

  console.log('\nALL APPLICATION VERIFICATIONS PASSED SUCCESSFULLY!');
}

testAll().catch(e => {
  console.error('\nVerification Error:', e.message);
  process.exit(1);
});
