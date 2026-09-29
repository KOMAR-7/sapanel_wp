import { getAwsConfig, isAwsConfigured } from '@/lib/aws/config';

/**
 * SecretProvider Interface
 *
 * Defines uniform abstraction for resolving, writing, and rotating secrets.
 * Control Plane only ever stores secret references (e.g. 'env:FIRST_TENANT_DATABASE_URL' or
 * 'aws/secretsmanager/restroconnect/tenants/<tenant-id>/database'), NEVER raw credentials.
 */
export interface SecretProvider {
  getSecret(reference: string): Promise<string | null>;
  setSecret(reference: string, value: string): Promise<void>;
  rotateSecret(reference: string): Promise<void>;
}

/**
 * Standard secret reference paths for AWS Secrets Manager:
 * - restroconnect/platform/control-plane
 * - restroconnect/tenants/<tenant-id>/database
 * - restroconnect/tenants/<tenant-id>/meta
 * - restroconnect/infrastructure/deployment
 */
export const AWS_SECRETS_PREFIX = 'aws/secretsmanager/';

export function buildTenantDatabaseSecretRef(tenantId: string): string {
  return `${AWS_SECRETS_PREFIX}restroconnect/tenants/${tenantId}/database`;
}

export function buildTenantMetaSecretRef(tenantId: string): string {
  return `${AWS_SECRETS_PREFIX}restroconnect/tenants/${tenantId}/meta`;
}

export function buildPlatformControlPlaneSecretRef(): string {
  return `${AWS_SECRETS_PREFIX}restroconnect/platform/control-plane`;
}

/**
 * Local / Environment Variable Secret Provider
 * Handles references in format `env:VARIABLE_NAME`
 */
export class EnvSecretProvider implements SecretProvider {
  async getSecret(reference: string): Promise<string | null> {
    if (reference.startsWith('env:')) {
      const varName = reference.substring(4);
      return process.env[varName] || null;
    }
    // Also allow raw environment variable lookup
    return process.env[reference] || null;
  }

  async setSecret(reference: string, value: string): Promise<void> {
    const varName = reference.startsWith('env:') ? reference.substring(4) : reference;
    process.env[varName] = value;
  }

  async rotateSecret(reference: string): Promise<void> {
    // In local dev, rotation is a no-op or simulated
    const sanitizedRef = reference.replace(/[^a-zA-Z0-9_]/g, '_');
    console.log(`[EnvSecretProvider] Simulated secret rotation for reference key: ${sanitizedRef}`);
  }
}

/**
 * Alias for EnvSecretProvider for explicit local development naming
 */
export class LocalSecretProvider extends EnvSecretProvider {}

/**
 * AWS Secrets Manager Provider (Production Phase)
 * Handles references in format `aws/secretsmanager/path/to/secret` or AWS ARNs.
 *
 * When AWS is unconfigured, it fails safely without throwing exceptions or logging secrets.
 */
export class AwsSecretsManagerProvider implements SecretProvider {
  async getSecret(reference: string): Promise<string | null> {
    if (!reference.startsWith('aws/secretsmanager/') && !reference.startsWith('arn:aws:secretsmanager:')) {
      return null;
    }

    const config = getAwsConfig();
    if (!config.enabled) {
      // AWS is not enabled in this environment.
      // Check for local development fallback environment variable if configured
      const fallbackEnv = reference.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();
      return process.env[fallbackEnv] || null;
    }

    // When AWS is enabled, SecretsManagerClient would be invoked via the default credential chain / IAM role.
    // Notice: Never print secret values in logs!
    return null;
  }

  async setSecret(reference: string, value: string): Promise<void> {
    const config = getAwsConfig();
    if (!config.enabled) {
      // Do not attempt AWS API calls when not configured
      return;
    }
    // Phase 2 implementation will use PutSecretValue / CreateSecret
  }

  async rotateSecret(reference: string): Promise<void> {
    const config = getAwsConfig();
    if (!config.enabled) {
      return;
    }
    // Phase 2 implementation will trigger RotateSecret API
  }
}

/**
 * Master Secret Resolver
 * Strictly forbids storing or querying raw database URLs, credentials, or passwords directly.
 */
export class UnifiedSecretResolver {
  private envProvider = new EnvSecretProvider();
  private awsProvider = new AwsSecretsManagerProvider();

  async resolveSecret(reference: string): Promise<string | null> {
    if (!reference) return null;

    // STRICT SECURITY: Disallow arbitrary raw connection strings or embedded passwords
    if (reference.includes('://') || reference.includes('@')) {
      throw new Error(
        'Direct database connection strings or passwords are forbidden. Only managed secret references (e.g. env:FIRST_TENANT_DATABASE_URL or aws/secretsmanager/...) are permitted.'
      );
    }

    if (reference.startsWith('env:') || !reference.includes('/')) {
      return await this.envProvider.getSecret(reference);
    }

    if (reference.startsWith('aws/') || reference.startsWith('arn:aws:')) {
      const awsVal = await this.awsProvider.getSecret(reference);
      if (awsVal) return awsVal;
      // Fallback for initial Render tenant if pointing to fallback
      return await this.envProvider.getSecret('FIRST_TENANT_DATABASE_URL');
    }

    return await this.envProvider.getSecret(reference);
  }
}

export const secretResolver = new UnifiedSecretResolver();
