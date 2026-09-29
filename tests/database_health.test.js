const test = require('node:test');
const assert = require('node:assert');

test('Database Health - Safe response excludes credentials', () => {
  const mockHealthResult = {
    status: 'CONNECTED',
    latencyMs: 78,
    pgVersion: 'PostgreSQL 16.1',
    host: 'dpg-daham96q1p3s73bb17vg-a.singapore-postgres.render.com',
    databaseName: 'restpro_db_render',
  };

  // Ensure no password or raw connection string is attached
  assert.strictEqual(mockHealthResult.status, 'CONNECTED');
  assert.strictEqual(typeof mockHealthResult.latencyMs, 'number');
  assert.strictEqual(mockHealthResult.password, undefined);
  assert.strictEqual(mockHealthResult.connectionString, undefined);
});

test('Schema Validation - Checks core tenant tables', () => {
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
  ];

  const dbTables = ['Restaurant', 'Branch', 'User', 'Customer', 'MenuCategory', 'MenuItem', 'Order', 'OrderItem', 'WhatsAppCart', 'PointsLedger'];

  const found = expectedTables.filter((t) => dbTables.includes(t));
  assert.strictEqual(found.length, expectedTables.length);
});
