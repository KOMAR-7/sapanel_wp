const test = require('node:test');
const assert = require('node:assert');

// Simulate Platform Admin and Tenant Context Resolver
const MOCK_PLATFORM_STORE = {
  tenants: {
    'tenant-a-uuid': {
      id: 'tenant-a-uuid',
      name: 'Spice Route',
      dbSecret: 'env:SPICE_ROUTE_DB',
      allowedTables: ['Order', 'MenuItem', 'Branch'],
    },
    'tenant-b-uuid': {
      id: 'tenant-b-uuid',
      name: 'Curry Kingdom',
      dbSecret: 'env:CURRY_KINGDOM_DB',
      allowedTables: ['Order', 'MenuItem', 'Branch'],
    },
  },
};

// Platform Admin Context (SuperAdmin Control Plane)
function platformAdminQueryTenant(adminRole, tenantId) {
  if (!['PLATFORM_SUPER_ADMIN', 'PLATFORM_ADMIN', 'PLATFORM_VIEWER'].includes(adminRole)) {
    throw new Error('Unauthorized platform access');
  }
  return MOCK_PLATFORM_STORE.tenants[tenantId] || null;
}

// Simulated Tenant Application Data Plane Query
function executeTenantDataPlaneQuery(callingTenantContext, targetTenantId, query) {
  // Strict tenant isolation guard
  if (!callingTenantContext || callingTenantContext !== targetTenantId) {
    const err = new Error(`CROSS_TENANT_ACCESS_DENIED: Tenant context '${callingTenantContext}' cannot access target '${targetTenantId}'`);
    err.code = 'TENANT_ISOLATION_VIOLATION';
    throw err;
  }

  return {
    success: true,
    data: `Rows for ${targetTenantId}`,
  };
}

test('Requirement 64 - Platform Admin can view both Tenant A and Tenant B', () => {
  const adminRole = 'PLATFORM_SUPER_ADMIN';

  const tenantA = platformAdminQueryTenant(adminRole, 'tenant-a-uuid');
  const tenantB = platformAdminQueryTenant(adminRole, 'tenant-b-uuid');

  assert.ok(tenantA, 'Platform admin must be able to view Tenant A');
  assert.ok(tenantB, 'Platform admin must be able to view Tenant B');
  assert.strictEqual(tenantA.name, 'Spice Route');
  assert.strictEqual(tenantB.name, 'Curry Kingdom');
});

test('Requirement 64 - Tenant A context CANNOT access Tenant B data (fails safely)', () => {
  const tenantAContext = 'tenant-a-uuid';
  const targetTenantB = 'tenant-b-uuid';

  // Attempting to query Tenant B with Tenant A's context MUST throw TENANT_ISOLATION_VIOLATION
  assert.throws(
    () => {
      executeTenantDataPlaneQuery(tenantAContext, targetTenantB, 'SELECT * FROM "Order"');
    },
    {
      name: 'Error',
      code: 'TENANT_ISOLATION_VIOLATION',
      message: /CROSS_TENANT_ACCESS_DENIED/,
    }
  );
});

test('Requirement 64 - Tenant A context can only access its own data', () => {
  const tenantAContext = 'tenant-a-uuid';
  const result = executeTenantDataPlaneQuery(tenantAContext, 'tenant-a-uuid', 'SELECT * FROM "Order"');

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.data, 'Rows for tenant-a-uuid');
});
