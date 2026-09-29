import { getAwsConfig } from '@/lib/aws/config';
import {
  DatabaseHealthResult,
  DatabaseMetadataResult,
  DatabaseProvider,
  DiscoveredTenantStats,
  SchemaValidationResult,
} from '../database/database.provider';

export interface AwsRdsConfig {
  engine: 'postgres' | 'aurora-postgresql';
  instanceIdentifier?: string;
  clusterIdentifier?: string;
  multiAz?: boolean;
}

/**
 * AWS RDS / Aurora PostgreSQL Database Provider (Foundation Preparation)
 *
 * Implements the standard DatabaseProvider interface for future RDS/Aurora migrations.
 * In Step 6, returns honest NOT_CONFIGURED statuses without simulating synthetic data.
 */
export class AwsDatabaseProvider implements DatabaseProvider {
  private config = getAwsConfig();

  async testConnection(secretReference: string): Promise<DatabaseHealthResult> {
    if (!this.config.enabled) {
      return {
        status: 'FAILED',
        latencyMs: 0,
        error: 'AWS RDS integration is NOT_CONFIGURED in this environment',
      };
    }

    // In future phases: resolve secret via AWS Secrets Manager and test RDS endpoint
    return {
      status: 'FAILED',
      latencyMs: 0,
      error: 'AWS RDS endpoint not provisioned in Step 6 (Foundation Only)',
    };
  }

  async getHealth(secretReference: string): Promise<DatabaseHealthResult> {
    return this.testConnection(secretReference);
  }

  async getMetadata(secretReference: string): Promise<DatabaseMetadataResult> {
    return {
      provider: 'AWS_RDS',
      engine: 'POSTGRESQL',
      region: `${this.config.region} (Mumbai)`,
      status: this.config.enabled ? 'AWAITING_PROVISIONING' : 'NOT_CONFIGURED',
      latencyMs: 0,
    };
  }

  async validateSchema(secretReference: string): Promise<SchemaValidationResult> {
    return {
      status: 'UNKNOWN',
      foundTables: [],
      missingTables: [],
      totalExpected: 23,
      migrationStatus: 'AWS RDS not provisioned; schema validation deferred to Phase D',
    };
  }

  async discoverTenant(secretReference: string): Promise<DiscoveredTenantStats> {
    return {
      branchesCount: 0,
      categoriesCount: 0,
      itemsCount: 0,
      customersCount: 0,
      ordersCount: 0,
    };
  }

  async discoverTenantData(secretReference: string): Promise<DiscoveredTenantStats> {
    return this.discoverTenant(secretReference);
  }
}

export const awsDatabaseProvider = new AwsDatabaseProvider();
