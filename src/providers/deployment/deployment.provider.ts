export interface DeploymentHealth {
  status: 'ACTIVE' | 'DEPLOYING' | 'FAILED' | 'STOPPED' | 'UNKNOWN';
  httpStatus?: number;
  latencyMs?: number;
  lastChecked: Date;
  error?: string;
}

export interface DeploymentProvider {
  checkHealth(url?: string | null): Promise<DeploymentHealth>;
}

export class WebDeploymentProvider implements DeploymentProvider {
  async checkHealth(url?: string | null): Promise<DeploymentHealth> {
    if (!url) {
      return {
        status: 'UNKNOWN',
        lastChecked: new Date(),
        error: 'No frontend URL configured',
      };
    }

    const startTime = Date.now();
    try {
      // Safe head request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: { 'User-Agent': 'RestroConnect-HealthMonitor/1.0' },
      });
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - startTime;
      const isActive = res.status >= 200 && res.status < 400;

      return {
        status: isActive ? 'ACTIVE' : 'FAILED',
        httpStatus: res.status,
        latencyMs,
        lastChecked: new Date(),
      };
    } catch (err: any) {
      return {
        status: 'FAILED',
        latencyMs: Date.now() - startTime,
        lastChecked: new Date(),
        error: err.name === 'AbortError' ? 'Connection timed out (6s)' : err.message || 'Fetch failed',
      };
    }
  }
}

export const deploymentProvider = new WebDeploymentProvider();
