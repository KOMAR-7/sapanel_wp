const test = require('node:test');
const assert = require('node:assert');

// Test RBAC logic
const ROLE_PERMISSIONS = {
  PLATFORM_SUPER_ADMIN: ['platform:all'],
  PLATFORM_ADMIN: ['tenants:read', 'tenants:create', 'tenants:update', 'tenants:suspend', 'databases:read', 'databases:test', 'features:manage', 'subscriptions:manage'],
  PLATFORM_SUPPORT: ['tenants:read', 'databases:read', 'health:read', 'support:read', 'support:manage'],
  PLATFORM_VIEWER: ['tenants:read', 'databases:read', 'subscriptions:read'],
};

function hasPermission(role, permission) {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  if (permissions.includes('platform:all')) return true;
  return permissions.includes(permission);
}

test('RBAC - PLATFORM_SUPER_ADMIN has universal access', () => {
  assert.strictEqual(hasPermission('PLATFORM_SUPER_ADMIN', 'tenants:create'), true);
  assert.strictEqual(hasPermission('PLATFORM_SUPER_ADMIN', 'tenants:suspend'), true);
  assert.strictEqual(hasPermission('PLATFORM_SUPER_ADMIN', 'infrastructure:manage'), true);
});

test('RBAC - PLATFORM_ADMIN can manage tenants and features but not platform:all', () => {
  assert.strictEqual(hasPermission('PLATFORM_ADMIN', 'tenants:read'), true);
  assert.strictEqual(hasPermission('PLATFORM_ADMIN', 'tenants:create'), true);
  assert.strictEqual(hasPermission('PLATFORM_ADMIN', 'features:manage'), true);
  assert.strictEqual(hasPermission('PLATFORM_ADMIN', 'unknown:action'), false);
});

test('RBAC - PLATFORM_SUPPORT has restricted actions', () => {
  assert.strictEqual(hasPermission('PLATFORM_SUPPORT', 'tenants:read'), true);
  assert.strictEqual(hasPermission('PLATFORM_SUPPORT', 'support:manage'), true);
  assert.strictEqual(hasPermission('PLATFORM_SUPPORT', 'tenants:create'), false);
  assert.strictEqual(hasPermission('PLATFORM_SUPPORT', 'tenants:suspend'), false);
});

test('RBAC - PLATFORM_VIEWER is strictly read-only', () => {
  assert.strictEqual(hasPermission('PLATFORM_VIEWER', 'tenants:read'), true);
  assert.strictEqual(hasPermission('PLATFORM_VIEWER', 'tenants:create'), false);
  assert.strictEqual(hasPermission('PLATFORM_VIEWER', 'features:manage'), false);
  assert.strictEqual(hasPermission('PLATFORM_VIEWER', 'tenants:suspend'), false);
});
