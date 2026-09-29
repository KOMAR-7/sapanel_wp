import prisma from '@/lib/db/prisma';
import { deploymentProvider } from '@/providers/deployment/deployment.provider';
import { createAuditLog } from '@/lib/logging/audit-logger';

export class DeploymentService {
  async listDeployments(tenantId?: string) {
    return await prisma.deployment.findMany({
      where: tenantId ? { tenantId } : {},
      include: {
        tenant: { select: { id: true, name: true, tenantCode: true, status: true } },
        serverResources: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async checkDeploymentHealth(deploymentId: string, adminId?: string) {
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: { tenant: true },
    });

    if (!deployment) throw new Error(`Deployment '${deploymentId}' not found.`);

    const result = await deploymentProvider.checkHealth(deployment.frontendUrl);

    const updated = await prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: result.status,
        lastDeploymentAt: new Date(),
      },
    });

    await prisma.healthCheck.create({
      data: {
        tenantId: deployment.tenantId,
        component: 'FRONTEND',
        status: result.status === 'ACTIVE' ? 'HEALTHY' : 'ERROR',
        latencyMs: result.latencyMs,
        message: result.status === 'ACTIVE'
          ? `HTTP ${result.httpStatus || 200} reachable (${result.latencyMs}ms)`
          : `Unreachable: ${result.error}`,
        checkedAt: new Date(),
      },
    });

    await createAuditLog({
      adminId,
      tenantId: deployment.tenantId,
      action: 'HEALTH_CHECK',
      resourceType: 'DEPLOYMENT',
      resourceId: deploymentId,
      newValue: { status: result.status, latencyMs: result.latencyMs },
    });

    return {
      deployment: updated,
      health: result,
    };
  }
}

export const deploymentService = new DeploymentService();
