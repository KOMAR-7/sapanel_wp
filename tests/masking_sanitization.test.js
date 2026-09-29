const test = require('node:test');
const assert = require('node:assert');

function maskString(str, visibleChars = 4) {
  if (!str) return '—';
  if (str.length <= visibleChars) return '****';
  const visible = str.slice(-visibleChars);
  return '•'.repeat(Math.min(str.length - visibleChars, 8)) + visible;
}

function sanitizeAuditSnapshot(data) {
  if (!data) return null;
  const copy = JSON.parse(JSON.stringify(data));
  const redactKeys = ['password', 'passwordHash', 'token', 'secret', 'connectionString', 'DATABASE_URL'];

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

test('Masking - Masks Phone Number IDs and sensitive tokens', () => {
  const phoneId = '108459208347102';
  const masked = maskString(phoneId, 4);
  assert.strictEqual(masked.endsWith('7102'), true);
  assert.strictEqual(masked.includes('••••'), true);
  assert.strictEqual(masked.includes('108459'), false);
});

test('Sanitization - Strips passwords, connection strings, and tokens from Audit snapshots', () => {
  const rawAuditData = {
    tenantName: 'Spice Route',
    database: {
      host: 'dpg-render.com',
      password: 'super_secret_pg_password_123',
      DATABASE_URL: 'postgresql://user:pass@host/db',
    },
    meta: {
      accessToken: 'EAAG28374982734',
    },
  };

  const sanitizedJson = sanitizeAuditSnapshot(rawAuditData);
  const parsed = JSON.parse(sanitizedJson);

  assert.strictEqual(parsed.database.password, '[REDACTED_SECRET]');
  assert.strictEqual(parsed.database.DATABASE_URL, '[REDACTED_SECRET]');
  assert.strictEqual(parsed.meta.accessToken, '[REDACTED_SECRET]');
  assert.strictEqual(parsed.tenantName, 'Spice Route');
});
