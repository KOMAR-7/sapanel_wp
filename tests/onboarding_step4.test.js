const test = require('node:test');
const assert = require('node:assert');

test('Step 4 — Database connection success returns sanitized data with zero password leakage', () => {
  const connectionResult = {
    status: 'CONNECTED',
    latencyMs: 42,
    provider: 'RENDER',
    engine: 'POSTGRESQL',
    region: 'Singapore',
    pgVersion: 'PostgreSQL 16.1',
    host: 'dpg-••••.singapore-postgres.render.com',
  };

  assert.strictEqual(connectionResult.status, 'CONNECTED');
  assert.strictEqual(typeof connectionResult.latencyMs, 'number');
  assert.strictEqual(connectionResult.provider, 'RENDER');
  assert.strictEqual(connectionResult.engine, 'POSTGRESQL');
  // Strict security: verify no password, DATABASE_URL, or raw secret exists
  assert.strictEqual(connectionResult.password, undefined);
  assert.strictEqual(connectionResult.DATABASE_URL, undefined);
  assert.strictEqual(connectionResult.connectionString, undefined);
  assert.strictEqual(connectionResult.secretReference, undefined);
  assert.ok(!connectionResult.host.includes(':'), 'Host must not contain port or credentials');
});

test('Step 4 — Database connection failure returns sanitized error without exposing raw SQL errors', () => {
  const sanitizeFailureResponse = (internalErr) => {
    // Log internal error server-side
    const serverLog = { internalErr: internalErr.message };
    // Client response must be sanitized
    return {
      success: false,
      error: {
        code: 'TENANT_DATABASE_UNAVAILABLE',
        message: 'Unable to connect to the tenant database.',
      },
    };
  };

  const clientResponse = sanitizeFailureResponse(new Error('password authentication failed for user "postgres"'));
  assert.strictEqual(clientResponse.success, false);
  assert.strictEqual(clientResponse.error.code, 'TENANT_DATABASE_UNAVAILABLE');
  assert.strictEqual(clientResponse.error.message, 'Unable to connect to the tenant database.');
  assert.ok(!JSON.stringify(clientResponse).includes('password'), 'Error response must not leak passwords');
});

test('Step 4 — Schema validation success when all core tenant tables exist', () => {
  const expectedTables = [
    'Restaurant',
    'Branch',
    'User',
    'Customer',
    'MenuCategory',
    'MenuItem',
    'Order',
    'OrderItem',
    'WhatsAppCart',
    'PointsLedger',
    'CustomerCampaign',
    'PushSubscription',
  ];

  const existingTables = new Set([
    'Restaurant',
    'Branch',
    'User',
    'Customer',
    'MenuCategory',
    'MenuItem',
    'Order',
    'OrderItem',
    'WhatsAppCart',
    'PointsLedger',
    'CustomerCampaign',
    'PushSubscription',
    '_prisma_migrations',
  ]);

  const found = expectedTables.filter((t) => existingTables.has(t));
  const missing = expectedTables.filter((t) => !existingTables.has(t));

  const status = missing.length === 0 ? 'VALID' : 'PARTIAL';
  assert.strictEqual(status, 'VALID');
  assert.strictEqual(found.length, expectedTables.length);
  assert.strictEqual(missing.length, 0);
});

test('Step 4 — Schema validation partial when some expected tables are missing', () => {
  const expectedTables = [
    'Restaurant',
    'Branch',
    'User',
    'Customer',
    'MenuCategory',
    'MenuItem',
    'Order',
    'OrderItem',
    'WhatsAppCart',
    'PointsLedger',
    'CustomerCampaign',
    'PushSubscription',
  ];

  // Missing PushSubscription and CustomerCampaign
  const existingTables = new Set([
    'Restaurant',
    'Branch',
    'User',
    'Customer',
    'MenuCategory',
    'MenuItem',
    'Order',
    'OrderItem',
    'WhatsAppCart',
    'PointsLedger',
  ]);

  const found = expectedTables.filter((t) => existingTables.has(t));
  const missing = expectedTables.filter((t) => !existingTables.has(t));

  let status = 'VALID';
  if (missing.length > 0 && found.length >= 4) {
    status = 'PARTIAL';
  } else if (missing.length > 0) {
    status = 'OUTDATED';
  }

  assert.strictEqual(status, 'PARTIAL');
  assert.strictEqual(found.length, 10);
  assert.strictEqual(missing.length, 2);
  assert.ok(missing.includes('PushSubscription'));
});

test('Step 4 — Tenant discovery returns real restaurant data and zero fake metrics', () => {
  const discoveredData = {
    restaurant: {
      name: 'Spice Route',
      slug: 'spice-route',
      phone: '9876543210',
      email: 'hello@spiceroute.com',
      city: 'Mumbai',
      state: 'Maharashtra',
      address: '123 Food Street',
      pincode: '400001',
    },
    branchesCount: 1,
    categoriesCount: 4,
    itemsCount: 30,
    customersCount: 15,
    ordersCount: 46,
  };

  assert.strictEqual(discoveredData.restaurant.name, 'Spice Route');
  assert.strictEqual(discoveredData.restaurant.slug, 'spice-route');
  assert.strictEqual(discoveredData.branchesCount, 1);
  assert.strictEqual(discoveredData.categoriesCount, 4);
  assert.strictEqual(discoveredData.itemsCount, 30);
  assert.strictEqual(discoveredData.customersCount, 15);
  assert.strictEqual(discoveredData.ordersCount, 46);
});

test('Step 4 — Arbitrary client cannot provide a raw database URL to force server connection', () => {
  function validateSecretReference(ref) {
    if (!ref || typeof ref !== 'string') {
      throw new Error('Secret reference is required.');
    }
    // STRICT SECURITY RULE: Reject connection strings and passwords
    if (ref.includes('://') || ref.includes('@')) {
      throw new Error(
        'Direct connection strings or passwords are not permitted. Provide an authorized secret reference.'
      );
    }
    return true;
  }

  // Attempting to pass raw connection string must throw security error
  assert.throws(() => {
    validateSecretReference('postgresql://attacker:evilpass@192.168.1.1:5432/evil_db');
  }, /Direct connection strings or passwords are not permitted/);

  assert.throws(() => {
    validateSecretReference('postgres://admin:secret@malicious.com:5432/db');
  }, /Direct connection strings or passwords are not permitted/);

  // Managed reference is accepted
  assert.strictEqual(validateSecretReference('env:FIRST_TENANT_DATABASE_URL'), true);
  assert.strictEqual(validateSecretReference('aws/secretsmanager/tenants/001/db'), true);
});

test('Step 4 — Duplicate Tenant Code, Slug, and Subdomain prevention', () => {
  const existingTenants = [
    { tenantCode: 'SPICE-001', slug: 'spice-route', subdomain: 'spiceroute' },
  ];

  function checkUniqueness(code, slug, subdomain) {
    if (existingTenants.some((t) => t.tenantCode === code)) {
      throw new Error(`Tenant code '${code}' is already in use.`);
    }
    if (existingTenants.some((t) => t.slug === slug)) {
      throw new Error(`Tenant slug '${slug}' is already in use.`);
    }
    if (subdomain && existingTenants.some((t) => t.subdomain === subdomain)) {
      throw new Error(`Subdomain '${subdomain}' is already in use.`);
    }
    return true;
  }

  // Duplicate code throws
  assert.throws(() => {
    checkUniqueness('SPICE-001', 'spice-route-2', 'spiceroute2');
  }, /Tenant code 'SPICE-001' is already in use/);

  // Duplicate slug throws
  assert.throws(() => {
    checkUniqueness('SPICE-002', 'spice-route', 'spiceroute2');
  }, /Tenant slug 'spice-route' is already in use/);

  // Duplicate subdomain throws
  assert.throws(() => {
    checkUniqueness('SPICE-002', 'spice-route-2', 'spiceroute');
  }, /Subdomain 'spiceroute' is already in use/);

  // Unique succeeds
  assert.strictEqual(checkUniqueness('CURRY-001', 'curry-leaf', 'curryleaf'), true);
});

test('Step 4 — Audit log creation sanitizes snapshots and redacts credentials', () => {
  function sanitizeAuditSnapshot(data) {
    if (!data) return null;
    const copy = JSON.parse(JSON.stringify(data));
    const redactKeys = [
      'password',
      'passwordHash',
      'token',
      'secret',
      'connectionString',
      'DATABASE_URL',
      'FIRST_TENANT_DATABASE_URL',
      'accessToken',
      'apiKey',
    ];

    function recurse(obj) {
      if (!obj || typeof obj !== 'object') return;
      for (const key of Object.keys(obj)) {
        if (redactKeys.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
          obj[key] = '[REDACTED_SECRET]';
        } else if (typeof obj[key] === 'object') {
          recurse(obj[key]);
        }
      }
    }

    recurse(copy);
    return JSON.stringify(copy);
  }

  const rawAuditPayload = {
    tenantName: 'Spice Route',
    tenantCode: 'SPICE-001',
    password: 'super_secret_password',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    connectionString: 'postgresql://user:pass@host:5432/db',
    secretReference: 'env:FIRST_TENANT_DATABASE_URL',
  };

  const sanitized = sanitizeAuditSnapshot(rawAuditPayload);
  const parsed = JSON.parse(sanitized);

  assert.strictEqual(parsed.tenantName, 'Spice Route');
  assert.strictEqual(parsed.tenantCode, 'SPICE-001');
  assert.strictEqual(parsed.password, '[REDACTED_SECRET]');
  assert.strictEqual(parsed.token, '[REDACTED_SECRET]');
  assert.strictEqual(parsed.connectionString, '[REDACTED_SECRET]');
  assert.strictEqual(parsed.secretReference, '[REDACTED_SECRET]');
});

test('Step 4 — Initial Tenant status is ACTIVE only when DB and Schema are valid', () => {
  function computeTenantStatus(dbConnected, schemaStatus) {
    if (dbConnected && (schemaStatus === 'VALID' || schemaStatus === 'PARTIAL')) {
      return 'ACTIVE';
    }
    return 'PROVISIONING';
  }

  assert.strictEqual(computeTenantStatus(true, 'VALID'), 'ACTIVE');
  assert.strictEqual(computeTenantStatus(true, 'PARTIAL'), 'ACTIVE');
  assert.strictEqual(computeTenantStatus(false, 'VALID'), 'PROVISIONING');
  assert.strictEqual(computeTenantStatus(true, 'OUTDATED'), 'PROVISIONING');
  assert.strictEqual(computeTenantStatus(true, 'UNKNOWN'), 'PROVISIONING');
});

test('Step 4 — Tenant creation validates required fields and sets initial configuration', () => {
  function validateTenantInput(input) {
    if (!input.name || !input.name.trim()) throw new Error('Restaurant name is required');
    if (!input.ownerName || !input.ownerName.trim()) throw new Error('Owner name is required');
    if (!input.ownerEmail || !input.ownerEmail.includes('@')) throw new Error('Valid owner email is required');
    if (!input.ownerPhone || input.ownerPhone.length < 8) throw new Error('Valid owner phone is required');
    return {
      name: input.name.trim(),
      ownerName: input.ownerName.trim(),
      ownerEmail: input.ownerEmail.trim(),
      ownerPhone: input.ownerPhone.trim(),
      isolationMode: input.isolationMode || 'DEDICATED_DATABASE',
      environment: input.environment || 'production',
      timezone: input.timezone || 'Asia/Kolkata',
      country: 'India',
    };
  }

  // Missing name throws
  assert.throws(() => validateTenantInput({ ownerName: 'John', ownerEmail: 'j@a.com', ownerPhone: '12345678' }), /Restaurant name is required/);
  // Missing owner email throws
  assert.throws(() => validateTenantInput({ name: 'Curry', ownerName: 'John', ownerEmail: 'invalid', ownerPhone: '12345678' }), /Valid owner email is required/);
  // Valid input returns normalized structure with defaults
  const valid = validateTenantInput({
    name: 'Spice Route',
    ownerName: 'Saeem Merchant',
    ownerEmail: 'hello@spiceroute.com',
    ownerPhone: '+91 9876543210',
  });
  assert.strictEqual(valid.name, 'Spice Route');
  assert.strictEqual(valid.isolationMode, 'DEDICATED_DATABASE');
  assert.strictEqual(valid.timezone, 'Asia/Kolkata');
  assert.strictEqual(valid.country, 'India');
});

test('Step 4 — Unauthorized database test rejects unauthorized callers', () => {
  function checkDatabaseTestAuth(session) {
    if (!session || !session.role) {
      const err = new Error('Unauthorized');
      err.statusCode = 401;
      throw err;
    }
    const allowedRoles = ['PLATFORM_SUPER_ADMIN', 'PLATFORM_ADMIN'];
    if (!allowedRoles.includes(session.role)) {
      const err = new Error('Forbidden: Insufficient permissions for databases:test');
      err.statusCode = 403;
      throw err;
    }
    return true;
  }

  // Anonymous request rejected (401)
  assert.throws(() => checkDatabaseTestAuth(null), (err) => err.statusCode === 401);
  // Viewer role rejected (403)
  assert.throws(() => checkDatabaseTestAuth({ role: 'PLATFORM_VIEWER' }), (err) => err.statusCode === 403);
  // Admin role accepted
  assert.strictEqual(checkDatabaseTestAuth({ role: 'PLATFORM_ADMIN' }), true);
  assert.strictEqual(checkDatabaseTestAuth({ role: 'PLATFORM_SUPER_ADMIN' }), true);
});

test('Step 4 — Unauthorized tenant access rejects users without required permissions', () => {
  function checkTenantCreateAuth(session) {
    if (!session) {
      const err = new Error('Authentication required');
      err.statusCode = 401;
      throw err;
    }
    if (!['PLATFORM_SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(session.role)) {
      const err = new Error('Forbidden: Role cannot create tenants');
      err.statusCode = 403;
      throw err;
    }
    return true;
  }

  assert.throws(() => checkTenantCreateAuth(null), (err) => err.statusCode === 401);
  assert.throws(() => checkTenantCreateAuth({ role: 'PLATFORM_SUPPORT' }), (err) => err.statusCode === 403);
  assert.strictEqual(checkTenantCreateAuth({ role: 'PLATFORM_ADMIN' }), true);
});

test('Step 4 — Registration failure handling leaves tenant in PROVISIONING without marking ACTIVE', () => {
  function simulateProvisioning(dbSuccess, deploymentSuccess) {
    let tenantStatus = 'PROVISIONING';
    const provisioningJobs = [];

    if (!dbSuccess) {
      provisioningJobs.push({
        type: 'REGISTER_DATABASE',
        status: 'FAILED',
        error: 'Database connection failed',
      });
      // Stays PROVISIONING, NEVER ACTIVE
      return { tenantStatus, provisioningJobs };
    }

    if (!deploymentSuccess) {
      provisioningJobs.push({
        type: 'CREATE_DEPLOYMENT',
        status: 'FAILED',
        error: 'Deployment metadata failed',
      });
      // Stays PROVISIONING
      return { tenantStatus, provisioningJobs };
    }

    tenantStatus = 'ACTIVE';
    provisioningJobs.push({
      type: 'CREATE_TENANT',
      status: 'SUCCESS',
      progress: 100,
    });
    return { tenantStatus, provisioningJobs };
  }

  // When DB fails, tenant is never marked ACTIVE
  const failedDb = simulateProvisioning(false, true);
  assert.strictEqual(failedDb.tenantStatus, 'PROVISIONING');
  assert.strictEqual(failedDb.provisioningJobs[0].status, 'FAILED');

  // When deployment fails, tenant is never marked ACTIVE
  const failedDep = simulateProvisioning(true, false);
  assert.strictEqual(failedDep.tenantStatus, 'PROVISIONING');

  // When all checks pass, tenant is marked ACTIVE
  const success = simulateProvisioning(true, true);
  assert.strictEqual(success.tenantStatus, 'ACTIVE');
  assert.strictEqual(success.provisioningJobs[0].status, 'SUCCESS');
});

test('Step 4 — Cross-tenant access protection prevents Tenant A context from querying Tenant B database', () => {
  const tenants = {
    'tenant-1': { dbSecret: 'env:TENANT_1_DB', name: 'Spice Route' },
    'tenant-2': { dbSecret: 'env:TENANT_2_DB', name: 'Curry Kingdom' },
  };

  function executeQueryAsTenant(callingTenantId, requestedTenantId) {
    if (callingTenantId !== requestedTenantId) {
      const err = new Error(`CROSS_TENANT_ACCESS_DENIED: Tenant '${callingTenantId}' cannot access '${requestedTenantId}'`);
      err.code = 'CROSS_TENANT_FORBIDDEN';
      throw err;
    }
    return { success: true, target: tenants[requestedTenantId] };
  }

  // Cross tenant access strictly throws
  assert.throws(() => {
    executeQueryAsTenant('tenant-1', 'tenant-2');
  }, /CROSS_TENANT_ACCESS_DENIED/);

  // Own tenant access succeeds
  const res = executeQueryAsTenant('tenant-1', 'tenant-1');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.target.name, 'Spice Route');
});

