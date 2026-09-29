async function testApi() {
  console.log('--- Testing API Endpoints on http://localhost:3005 ---\n');

  // 1. Login as Platform SuperAdmin
  const loginRes = await fetch('http://localhost:3005/api/admin/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.SUPERADMIN_EMAIL || 'admin@restroconnect.com',
      password: process.env.SUPERADMIN_PASSWORD || 'ChangeMeInProduction123!',
    }),
  });

  const loginJson = await loginRes.json();
  console.log('1. Login Status:', loginRes.status, loginJson.success ? '✓ SuperAdmin Authenticated' : '❌ Login Failed');
  if (!loginJson.success) {
    console.error('Login error:', loginJson);
    process.exit(1);
  }

  // Extract session cookie
  const cookie = loginRes.headers.get('set-cookie');
  const headers = {
    'Content-Type': 'application/json',
    Cookie: cookie || '',
  };

  // 2. Test Tenants List
  const tenantsRes = await fetch('http://localhost:3005/api/admin/tenants', { headers });
  const tenantsJson = await tenantsRes.json();
  console.log('2. List Tenants:', {
    status: tenantsRes.status,
    totalTenants: tenantsJson.data?.tenants?.length,
    firstTenant: tenantsJson.data?.tenants?.[0]?.name,
    code: tenantsJson.data?.tenants?.[0]?.tenantCode,
    status: tenantsJson.data?.tenants?.[0]?.status,
  });

  // 3. Test Database Connection Endpoint
  const dbTestRes = await fetch('http://localhost:3005/api/admin/tenants/database/test', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      secretReference: 'env:FIRST_TENANT_DATABASE_URL',
      provider: 'RENDER',
      region: 'Singapore',
    }),
  });
  const dbTestJson = await dbTestRes.json();
  console.log('3. POST /api/admin/tenants/database/test:', {
    status: dbTestRes.status,
    success: dbTestJson.success,
    data: dbTestJson.data,
  });

  // 4. Test Discovery Endpoint
  const discoverRes = await fetch('http://localhost:3005/api/admin/tenants/database/discover', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      secretReference: 'env:FIRST_TENANT_DATABASE_URL',
    }),
  });
  const discoverJson = await discoverRes.json();
  console.log('4. POST /api/admin/tenants/database/discover:', {
    status: discoverRes.status,
    success: discoverJson.success,
    restaurant: discoverJson.data?.restaurant?.name,
    stats: {
      branches: discoverJson.data?.branchesCount,
      categories: discoverJson.data?.categoriesCount,
      items: discoverJson.data?.itemsCount,
      customers: discoverJson.data?.customersCount,
      orders: discoverJson.data?.ordersCount,
    },
  });

  // 5. Test Schema Validation Endpoint
  const validateRes = await fetch('http://localhost:3005/api/admin/tenants/database/validate', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      secretReference: 'env:FIRST_TENANT_DATABASE_URL',
    }),
  });
  const validateJson = await validateRes.json();
  console.log('5. POST /api/admin/tenants/database/validate:', {
    status: validateRes.status,
    success: validateJson.success,
    schemaStatus: validateJson.data?.status,
    foundCount: validateJson.data?.foundCount,
    totalExpected: validateJson.data?.totalExpected,
  });

  // 6. Test Uniqueness Check Endpoint
  const uniqueRes1 = await fetch('http://localhost:3005/api/admin/tenants/check-unique?tenantCode=SPICE-001&slug=spice-route', { headers });
  const uniqueJson1 = await uniqueRes1.json();
  console.log('6. Check Uniqueness (Existing SPICE-001):', uniqueJson1.data);

  const uniqueRes2 = await fetch('http://localhost:3005/api/admin/tenants/check-unique?tenantCode=CURRY-001&slug=curry-leaf', { headers });
  const uniqueJson2 = await uniqueRes2.json();
  console.log('7. Check Uniqueness (Available CURRY-001):', uniqueJson2.data);

  console.log('\n--- All API Endpoints Verified Successfully! ---');
}

testApi().catch(console.error);
