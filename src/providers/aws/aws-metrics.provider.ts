import { getAwsConfig } from '@/lib/aws/config';

export interface AwsCloudWatchStatus {
  status: 'NOT_CONNECTED' | 'CONNECTED';
  region: string;
  metricsCollected: boolean;
  message: string;
}

/**
 * AWS CloudWatch Metrics Provider (Step 6 Foundation Preparation)
 *
 * Provides interface for AWS CloudWatch metrics collection.
 * Strictly avoids synthetic or fake telemetry (no hardcoded CPU, RAM, or latency).
 */
export class AwsMetricsProvider {
  private config = getAwsConfig();

  getCloudWatchStatus(): AwsCloudWatchStatus {
    return {
      status: this.config.enabled ? 'CONNECTED' : 'NOT_CONNECTED',
      region: `${this.config.region} (Mumbai)`,
      metricsCollected: false,
      message: this.config.enabled
        ? 'AWS CloudWatch configured — telemetry monitoring inactive in Step 6'
        : 'Awaiting AWS CloudWatch integration (ap-south-1)',
    };
  }

  async getResourceMetrics(resourceId: string): Promise<null> {
    // Zero fake telemetry: return null when CloudWatch is not polling live AWS resources
    return null;
  }
}

export const awsMetricsProvider = new AwsMetricsProvider();
