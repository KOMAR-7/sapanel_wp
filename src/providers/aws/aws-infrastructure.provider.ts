import { getAwsConfig } from '@/lib/aws/config';
import { InfrastructureProvider, InfrastructureResource } from '../infrastructure/infrastructure.provider';

export interface AwsFoundationStatus {
  status: 'NOT_CONFIGURED' | 'CONFIGURED';
  region: string;
  accountId: string | null;
  environment: string;
  resources: {
    ecs: 'NOT_PROVISIONED' | 'PROVISIONED';
    rds: 'NOT_PROVISIONED' | 'PROVISIONED';
    elasticache: 'NOT_PROVISIONED' | 'PROVISIONED';
    s3: 'NOT_PROVISIONED' | 'PROVISIONED';
    cloudwatch: 'NOT_CONNECTED' | 'CONNECTED';
  };
}

/**
 * AWS Infrastructure Provider (Step 6 Foundation)
 *
 * Implements the InfrastructureProvider interface.
 * Returns explicit honest states and zero fake hardware metrics (no simulated CPU, RAM, or IOPS).
 */
export class AwsInfrastructureProvider implements InfrastructureProvider {
  getFoundationStatus(): AwsFoundationStatus {
    const config = getAwsConfig();
    return {
      status: config.enabled ? 'CONFIGURED' : 'NOT_CONFIGURED',
      region: config.region,
      accountId: config.accountId,
      environment: config.environment,
      resources: {
        ecs: 'NOT_PROVISIONED',
        rds: 'NOT_PROVISIONED',
        elasticache: 'NOT_PROVISIONED',
        s3: 'NOT_PROVISIONED',
        cloudwatch: 'NOT_CONNECTED',
      },
    };
  }

  async listResources(tenantId?: string): Promise<InfrastructureResource[]> {
    const config = getAwsConfig();
    const regionLabel = `${config.region} (Mumbai)`;

    return [
      {
        id: 'res-aws-ecs-foundation',
        provider: 'AWS',
        region: regionLabel,
        resourceType: 'AWS ECS / Fargate Container Service',
        resourceIdentifier: `arn:aws:ecs:${config.region}:platform:service/restroconnect-core`,
        tenantName: 'Platform Shared',
        status: 'UNKNOWN',
        isLiveConnected: false,
        cpu: null,
        memory: null,
        storage: null,
        statusMessage: 'Not Provisioned — ECS container cluster awaiting future deployment phase',
      },
      {
        id: 'res-aws-rds-foundation',
        provider: 'AWS',
        region: regionLabel,
        resourceType: 'AWS RDS PostgreSQL (Multi-AZ)',
        resourceIdentifier: `arn:aws:rds:${config.region}:platform:db/restroconnect-primary`,
        tenantName: 'Platform Shared',
        status: 'UNKNOWN',
        isLiveConnected: false,
        cpu: null,
        memory: null,
        storage: null,
        statusMessage: 'Not Provisioned — Tenant #1 remains actively connected to Render PostgreSQL',
      },
      {
        id: 'res-aws-elasticache-foundation',
        provider: 'AWS',
        region: regionLabel,
        resourceType: 'AWS ElastiCache Redis Cluster',
        resourceIdentifier: `arn:aws:elasticache:${config.region}:platform:cluster/restro-cache`,
        tenantName: 'Platform Shared',
        status: 'UNKNOWN',
        isLiveConnected: false,
        cpu: null,
        memory: null,
        storage: null,
        statusMessage: 'Not Provisioned — High-performance in-memory cache active locally',
      },
      {
        id: 'res-aws-s3-foundation',
        provider: 'AWS',
        region: regionLabel,
        resourceType: 'AWS S3 Object Storage',
        resourceIdentifier: `arn:aws:s3:::restroconnect-tenant-assets-${config.region}`,
        tenantName: 'Platform Shared',
        status: 'UNKNOWN',
        isLiveConnected: false,
        cpu: null,
        memory: null,
        storage: null,
        statusMessage: 'Not Provisioned — Awaiting S3 media migration phase',
      },
    ];
  }

  async getResourceStatus(resourceIdentifier: string): Promise<InfrastructureResource | null> {
    const all = await this.listResources();
    return all.find((r) => r.resourceIdentifier === resourceIdentifier) || null;
  }
}

export const awsInfrastructureProvider = new AwsInfrastructureProvider();
