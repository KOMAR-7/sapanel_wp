import { z } from 'zod';

/**
 * AWS Configuration Interface for RESTROCONNECT Platform
 *
 * Centralized, validated configuration for AWS services.
 * Follows least privilege and never exposes raw credentials to client-side code.
 */
export interface AwsConfig {
  enabled: boolean;
  region: string;
  accountId: string | null;
  environment: 'development' | 'staging' | 'production';
  isConfigured: boolean;
  credentialsSource: 'IAM_ROLE' | 'ENVIRONMENT' | 'NONE';
}

export interface PublicAwsConfig {
  enabled: boolean;
  region: string;
  environment: 'development' | 'staging' | 'production';
  status: 'NOT_CONNECTED' | 'CONNECTED';
  defaultRegion: string;
}

const DEFAULT_AWS_REGION = 'ap-south-1'; // Mumbai

const accountIdSchema = z
  .string()
  .regex(/^\d{12}$/, 'AWS Account ID must be a 12-digit number')
  .optional()
  .nullable();

/**
 * Validates and retrieves the centralized AWS configuration.
 *
 * Safe for local development without credentials:
 * If credentials or account ID are missing, it defaults gracefully with enabled: false.
 */
export function getAwsConfig(): AwsConfig {
  const rawRegion = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || DEFAULT_AWS_REGION;
  const rawAccountId = process.env.AWS_ACCOUNT_ID?.trim() || null;
  const rawAccessKey = process.env.AWS_ACCESS_KEY_ID?.trim();
  const rawSecretKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();

  // Validate Account ID format if present
  let accountId: string | null = null;
  if (rawAccountId) {
    const parseResult = accountIdSchema.safeParse(rawAccountId);
    if (parseResult.success) {
      accountId = rawAccountId;
    } else {
      console.warn(`[AWS Config] Invalid AWS_ACCOUNT_ID format. Expected 12 digits, received: ${rawAccountId.slice(0, 4)}****`);
    }
  }

  // Determine environment
  const nodeEnv = process.env.NODE_ENV || 'development';
  let environment: 'development' | 'staging' | 'production' = 'development';
  if (nodeEnv === 'production') {
    environment = 'production';
  } else if (nodeEnv === 'test') {
    environment = 'development';
  } else if (process.env.APP_ENV === 'staging') {
    environment = 'staging';
  }

  // Determine credentials source
  let credentialsSource: AwsConfig['credentialsSource'] = 'NONE';
  if (process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI || process.env.AWS_ROLE_ARN) {
    credentialsSource = 'IAM_ROLE';
  } else if (rawAccessKey && rawSecretKey) {
    credentialsSource = 'ENVIRONMENT';
  }

  // AWS is considered explicitly enabled only if enabled flag is set OR valid IAM role / credentials exist
  const explicitlyEnabled = process.env.AWS_ENABLED === 'true';
  const hasCredentials = credentialsSource !== 'NONE';
  const enabled = explicitlyEnabled && hasCredentials;

  return {
    enabled,
    region: rawRegion,
    accountId,
    environment,
    isConfigured: hasCredentials,
    credentialsSource,
  };
}

/**
 * Safe public configuration for UI consumption.
 * Strictly strips sensitive details, account IDs, and credentials.
 */
export function getPublicAwsConfig(): PublicAwsConfig {
  const config = getAwsConfig();
  return {
    enabled: config.enabled,
    region: config.region,
    environment: config.environment,
    status: config.enabled ? 'CONNECTED' : 'NOT_CONNECTED',
    defaultRegion: DEFAULT_AWS_REGION,
  };
}

/**
 * Helper to check if AWS integration is enabled before initializing any AWS SDK clients.
 */
export function isAwsConfigured(): boolean {
  return getAwsConfig().enabled;
}
