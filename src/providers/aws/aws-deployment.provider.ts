import { getAwsConfig } from '@/lib/aws/config';
import { DeploymentHealth, DeploymentProvider } from '../deployment/deployment.provider';

export interface AwsEcsTaskStatus {
  clusterArn?: string;
  serviceArn?: string;
  desiredCount: number;
  runningCount: number;
  status: 'PROVISIONING' | 'RUNNING' | 'STOPPED' | 'NOT_PROVISIONED';
}

/**
 * AWS Deployment Provider (ECS / Fargate Foundation Preparation)
 *
 * Implements the standard DeploymentProvider interface for future AWS container scaling.
 * In Step 6, returns honest NOT_PROVISIONED status.
 */
export class AwsDeploymentProvider implements DeploymentProvider {
  private config = getAwsConfig();

  async checkHealth(url?: string | null): Promise<DeploymentHealth> {
    if (!this.config.enabled) {
      return {
        status: 'UNKNOWN',
        lastChecked: new Date(),
        error: 'AWS ECS deployment is NOT_CONFIGURED (Phase H deferred)',
      };
    }

    if (!url) {
      return {
        status: 'UNKNOWN',
        lastChecked: new Date(),
        error: 'AWS Application Load Balancer endpoint not provisioned',
      };
    }

    return {
      status: 'UNKNOWN',
      lastChecked: new Date(),
      error: 'AWS ECS container cluster not yet provisioned (Step 6 Foundation Only)',
    };
  }

  async getEcsTaskStatus(): Promise<AwsEcsTaskStatus> {
    return {
      desiredCount: 0,
      runningCount: 0,
      status: 'NOT_PROVISIONED',
    };
  }
}

export const awsDeploymentProvider = new AwsDeploymentProvider();
