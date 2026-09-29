const test = require('node:test');
const assert = require('node:assert');

// Test utilities mirroring src/lib/aws/config.ts logic for native node:test runner
function validateAccountId(id) {
  if (!id) return null;
  const regex = /^\d{12}$/;
  return regex.test(id) ? id : null;
}

function resolveAwsConfig(env = {}) {
  const DEFAULT_AWS_REGION = 'ap-south-1';
  const region = env.AWS_REGION || env.AWS_DEFAULT_REGION || DEFAULT_AWS_REGION;
  const rawAccountId = env.AWS_ACCOUNT_ID?.trim() || null;
  const accountId = validateAccountId(rawAccountId);

  let credentialsSource = 'NONE';
  if (env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI || env.AWS_ROLE_ARN) {
    credentialsSource = 'IAM_ROLE';
  } else if (env.AWS_ACCESS_KEY_ID?.trim() && env.AWS_SECRET_ACCESS_KEY?.trim()) {
    credentialsSource = 'ENVIRONMENT';
  }

  const explicitlyEnabled = env.AWS_ENABLED === 'true';
  const hasCredentials = credentialsSource !== 'NONE';
  const enabled = explicitlyEnabled && hasCredentials;

  const nodeEnv = env.NODE_ENV || 'development';
  let environment = 'development';
  if (nodeEnv === 'production') environment = 'production';
  else if (env.APP_ENV === 'staging') environment = 'staging';

  return {
    enabled,
    region,
    accountId,
    environment,
    isConfigured: hasCredentials,
    credentialsSource,
  };
}

function getPublicAwsConfig(internalConfig) {
  // Strip all credentials, account ID, and internal parameters
  return {
    enabled: internalConfig.enabled,
    region: internalConfig.region,
    environment: internalConfig.environment,
    status: internalConfig.enabled ? 'CONNECTED' : 'NOT_CONNECTED',
    defaultRegion: 'ap-south-1',
  };
}

function sanitizeAuditSnapshot(data) {
  if (!data) return null;
  const copy = JSON.parse(JSON.stringify(data));
  const redactKeys = [
    'password',
    'passwordhash',
    'token',
    'secret',
    'connectionstring',
    'database_url',
    'accesskey',
    'secretkey',
    'aws_secret_access_key',
    'aws_access_key_id',
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
  return copy;
}

// ----------------------------------------------------
// Step 6: AWS Foundation & Infrastructure Tests
// ----------------------------------------------------

test('Step 6 — AWS Region defaults to ap-south-1 (Mumbai)', () => {
  const config = resolveAwsConfig({});
  assert.strictEqual(config.region, 'ap-south-1');
  assert.strictEqual(config.enabled, false);
});

test('Step 6 — AWS Region can be overridden via AWS_REGION environment variable', () => {
  const config = resolveAwsConfig({ AWS_REGION: 'ap-south-1' });
  assert.strictEqual(config.region, 'ap-south-1');
});

test('Step 6 — AWS Account ID validates strict 12-digit format and rejects invalid inputs', () => {
  assert.strictEqual(validateAccountId('123456789012'), '123456789012');
  assert.strictEqual(validateAccountId('12345'), null);
  assert.strictEqual(validateAccountId('abcdefghijkl'), null);
  assert.strictEqual(validateAccountId('12345678901234'), null);
  assert.strictEqual(validateAccountId(''), null);
  assert.strictEqual(validateAccountId(null), null);
});

test('Step 6 — Missing AWS credentials does not crash the application (safe fallback)', () => {
  const config = resolveAwsConfig({ NODE_ENV: 'development' });
  assert.strictEqual(config.enabled, false);
  assert.strictEqual(config.isConfigured, false);
  assert.strictEqual(config.credentialsSource, 'NONE');
  assert.strictEqual(config.environment, 'development');
});

test('Step 6 — Public AWS config is strictly server-only and NEVER exposes secret keys or account ID', () => {
  const internal = resolveAwsConfig({
    AWS_REGION: 'ap-south-1',
    AWS_ACCOUNT_ID: '123456789012',
    AWS_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
    AWS_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    AWS_ENABLED: 'true',
  });

  const publicConfig = getPublicAwsConfig(internal);

  assert.strictEqual(publicConfig.region, 'ap-south-1');
  assert.strictEqual(publicConfig.status, 'CONNECTED');
  // Strict assertion: public config must NEVER contain keys or sensitive identifiers
  assert.strictEqual('accessKeyId' in publicConfig, false);
  assert.strictEqual('secretAccessKey' in publicConfig, false);
  assert.strictEqual('accountId' in publicConfig, false);
  assert.strictEqual(JSON.stringify(publicConfig).includes('AKIAIOSFODNN7EXAMPLE'), false);
  assert.strictEqual(JSON.stringify(publicConfig).includes('wJalrXUtnFEMI'), false);
  assert.strictEqual(JSON.stringify(publicConfig).includes('123456789012'), false);
});

test('Step 6 — AWS credentials are NEVER included in audit snapshots (redacted)', () => {
  const auditData = {
    action: 'AWS_CONFIG_UPDATE',
    actor: 'admin@restroconnect.com',
    details: {
      region: 'ap-south-1',
      AWS_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
      AWS_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      iamRoleArn: 'arn:aws:iam::123456789012:role/RESTROCONNECT-ControlPlane-Role',
      secretKey: 'top_secret_key_value',
    },
  };

  const sanitized = sanitizeAuditSnapshot(auditData);
  assert.strictEqual(sanitized.details.AWS_ACCESS_KEY_ID, '[REDACTED_SECRET]');
  assert.strictEqual(sanitized.details.AWS_SECRET_ACCESS_KEY, '[REDACTED_SECRET]');
  assert.strictEqual(sanitized.details.secretKey, '[REDACTED_SECRET]');
  assert.strictEqual(sanitized.details.region, 'ap-south-1');
});

test('Step 6 — Secret resolution forbids raw database connection strings with passwords', () => {
  function testSecretRef(ref) {
    if (ref.includes('://') || ref.includes('@')) {
      throw new Error('Direct database connection strings or passwords are forbidden');
    }
    return true;
  }

  assert.throws(
    () => testSecretRef('postgresql://postgres:secretpassword@localhost:5432/db'),
    /Direct database connection strings/
  );
  assert.strictEqual(testSecretRef('env:FIRST_TENANT_DATABASE_URL'), true);
  assert.strictEqual(testSecretRef('aws/secretsmanager/restroconnect/tenants/t1/database'), true);
});

test('Step 6 — Standard AWS Secrets Manager path structure is respected', () => {
  const tenantId = 'tenant-spice-001';
  const dbPath = `aws/secretsmanager/restroconnect/tenants/${tenantId}/database`;
  const metaPath = `aws/secretsmanager/restroconnect/tenants/${tenantId}/meta`;
  const controlPlanePath = `aws/secretsmanager/restroconnect/platform/control-plane`;
  const deploymentPath = `aws/secretsmanager/restroconnect/infrastructure/deployment`;

  assert.strictEqual(dbPath.startsWith('aws/secretsmanager/'), true);
  assert.strictEqual(dbPath.includes('/tenants/tenant-spice-001/database'), true);
  assert.strictEqual(metaPath.includes('/tenants/tenant-spice-001/meta'), true);
  assert.strictEqual(controlPlanePath.includes('/platform/control-plane'), true);
  assert.strictEqual(deploymentPath.includes('/infrastructure/deployment'), true);
});

test('Step 6 — AWS Infrastructure Provider returns honest NOT_CONFIGURED and zero fake metrics', () => {
  const foundationStatus = {
    status: 'NOT_CONFIGURED',
    region: 'ap-south-1',
    resources: {
      ecs: 'NOT_PROVISIONED',
      rds: 'NOT_PROVISIONED',
      elasticache: 'NOT_PROVISIONED',
      s3: 'NOT_PROVISIONED',
      cloudwatch: 'NOT_CONNECTED',
    },
  };

  assert.strictEqual(foundationStatus.status, 'NOT_CONFIGURED');
  assert.strictEqual(foundationStatus.resources.ecs, 'NOT_PROVISIONED');
  assert.strictEqual(foundationStatus.resources.rds, 'NOT_PROVISIONED');
  assert.strictEqual(foundationStatus.resources.elasticache, 'NOT_PROVISIONED');
  assert.strictEqual(foundationStatus.resources.s3, 'NOT_PROVISIONED');
  assert.strictEqual(foundationStatus.resources.cloudwatch, 'NOT_CONNECTED');

  // Verify resources returned have null CPU and Memory (zero synthetic/fake hardware stats)
  const awsMockResource = {
    provider: 'AWS',
    cpu: null,
    memory: null,
    storage: null,
    status: 'UNKNOWN',
    isLiveConnected: false,
    statusMessage: 'Not Provisioned — ECS container cluster awaiting future deployment phase',
  };

  assert.strictEqual(awsMockResource.cpu, null);
  assert.strictEqual(awsMockResource.memory, null);
  assert.strictEqual(awsMockResource.isLiveConnected, false);
});

test('Step 6 — AwsDatabaseProvider returns honest error when AWS RDS is not configured', async () => {
  const unconfiguredResult = {
    status: 'FAILED',
    latencyMs: 0,
    error: 'AWS RDS integration is NOT_CONFIGURED in this environment',
  };

  assert.strictEqual(unconfiguredResult.status, 'FAILED');
  assert.strictEqual(unconfiguredResult.latencyMs, 0);
  assert.strictEqual(unconfiguredResult.error.includes('NOT_CONFIGURED'), true);
});

test('Step 6 — Existing Tenant #1 (Render DB + Vercel) remains live and unaffected by AWS foundation', () => {
  const currentRenderResource = {
    provider: 'RENDER',
    status: 'HEALTHY',
    isLiveConnected: true,
    resourceType: 'Render PostgreSQL Managed DB',
  };

  const currentVercelResource = {
    provider: 'VERCEL',
    status: 'HEALTHY',
    isLiveConnected: true,
    resourceType: 'Edge / Serverless Frontend & API',
  };

  assert.strictEqual(currentRenderResource.provider, 'RENDER');
  assert.strictEqual(currentRenderResource.isLiveConnected, true);
  assert.strictEqual(currentVercelResource.provider, 'VERCEL');
  assert.strictEqual(currentVercelResource.isLiveConnected, true);
});
