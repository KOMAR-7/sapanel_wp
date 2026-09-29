import prisma from '@/lib/db/prisma';
import { infrastructureProvider, InfrastructureResource } from '@/providers/infrastructure/infrastructure.provider';
import { getAwsConfig } from '@/lib/aws/config';

export interface ResourceDependencyImpact {
  resource: string;
  directlyAffected: string[];
  indirectlyAffected: string[];
  unaffected: string[];
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  recommendation: string;
}

export class InfrastructureService {
  async getInfrastructureResources(): Promise<InfrastructureResource[]> {
    return await infrastructureProvider.listResources();
  }

  async getTenantResourceDependencies(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        databases: true,
        deployments: true,
        metaIntegration: true,
        serverResources: true,
      },
    });

    if (!tenant) throw new Error(`Tenant '${tenantId}' not found`);

    const otherTenantsCount = await prisma.tenant.count({
      where: { id: { not: tenantId } },
    });

    const dependencies = [
      {
        id: 'dep-frontend',
        name: 'Vercel Edge Frontend',
        type: 'FRONTEND',
        provider: 'VERCEL',
        status: 'HEALTHY',
        details: tenant.frontendUrl || 'https://wp-admin-five.vercel.app/',
        impact: {
          resource: 'Frontend Web Application',
          directlyAffected: ['Storefront URL', 'Admin UI Web Interface', 'QR Code Dine-In'],
          indirectlyAffected: ['Online Cart Submissions', 'Push Subscription Registration'],
          unaffected: [`${otherTenantsCount} other restaurants`, 'WhatsApp Ordering Bot', 'Database Integrity'],
          severity: 'HIGH' as const,
          recommendation: 'Check Vercel Deployment status and DNS propagation.',
        },
      },
      {
        id: 'dep-database',
        name: 'Render PostgreSQL Database',
        type: 'DATABASE',
        provider: 'RENDER',
        status: tenant.databases[0]?.status === 'CONNECTED' ? 'HEALTHY' : 'CRITICAL',
        details: tenant.databases[0]?.host || 'dpg-render-postgres.render.com',
        impact: {
          resource: 'Tenant PostgreSQL Database',
          directlyAffected: ['Order Creation & History', 'Menu Catalog Query', 'User & Staff Authentication'],
          indirectlyAffected: ['WhatsApp Cart Processing', 'Loyalty Balance Updates', 'Reports & Analytics'],
          unaffected: [`${otherTenantsCount} other tenant databases (Complete Tenant Isolation)`, 'Platform Control Plane'],
          severity: 'CRITICAL' as const,
          recommendation: 'Verify Render DB network connectivity, CPU credits, and connection pooling.',
        },
      },
      {
        id: 'dep-whatsapp',
        name: 'Meta WhatsApp Cloud API',
        type: 'MESSAGING',
        provider: 'META',
        status: tenant.metaIntegration?.status === 'CONNECTED' ? 'HEALTHY' : 'WARNING',
        details: tenant.metaIntegration?.phoneNumberId ? 'Phone Number ID Connected' : 'Webhook Awaiting Verification',
        impact: {
          resource: 'Meta WhatsApp Integration',
          directlyAffected: ['WhatsApp Direct Ordering Bot', 'Customer Order Confirmation Receipts'],
          indirectlyAffected: ['Customer Loyalty Balance Notifications', 'Broadcast Campaigns'],
          unaffected: ['Web Ordering Application', 'POS / Dine-In Orders', 'Database Operations', 'Other Restaurants'],
          severity: 'HIGH' as const,
          recommendation: 'Verify Meta access token validity and Webhook endpoint subscription.',
        },
      },
      {
        id: 'dep-catalog',
        name: 'Meta Commerce Catalog',
        type: 'CATALOG',
        provider: 'META',
        status: tenant.metaIntegration?.catalogId ? 'HEALTHY' : 'WARNING',
        details: tenant.metaIntegration?.catalogId ? `Catalog ID: ${tenant.metaIntegration.catalogId}` : 'Not Connected',
        impact: {
          resource: 'Meta Commerce Catalog',
          directlyAffected: ['In-chat WhatsApp Native Product Catalog', 'Product Sets'],
          indirectlyAffected: ['Cart item additions within WhatsApp native window'],
          unaffected: ['Web Ordering Menu', 'Direct POS Orders', 'Restaurant DB', 'Other Restaurants'],
          severity: 'MEDIUM' as const,
          recommendation: 'Check Meta Commerce Manager sync logs and SKU mappings.',
        },
      },
      {
        id: 'dep-redis',
        name: 'Redis Cache (In-Memory / ElastiCache)',
        type: 'CACHE',
        provider: 'LOCAL / AWS',
        status: 'HEALTHY',
        details: 'Local In-Memory Cache Active (AWS ElastiCache Redis ready)',
        impact: {
          resource: 'Platform & Tenant Cache Layer',
          directlyAffected: ['Response Latency on Menu and Metadata Lookups', 'Request Deduplication'],
          indirectlyAffected: ['Database Query Load increases proportionally'],
          unaffected: ['Data Correctness (Auto-fallback to primary database)', 'All Tenant Core Operations'],
          severity: 'LOW' as const,
          recommendation: 'Cache failures automatically fall back to primary PostgreSQL database.',
        },
      },
      {
        id: 'dep-aws',
        name: 'AWS Cloud Infrastructure (Foundation Prepared)',
        type: 'CLOUD',
        provider: 'AWS',
        status: 'UNKNOWN',
        details: 'Awaiting AWS ECS / RDS Migration in ap-south-1 Mumbai (Step 6 Foundation Ready)',
        impact: {
          resource: 'AWS Infrastructure Services',
          directlyAffected: ['ECS Fargate Containers', 'Application Load Balancer'],
          indirectlyAffected: ['Automated Vertical & Horizontal Scaling'],
          unaffected: ['Current Live Render Tenant Operations'],
          severity: 'MEDIUM' as const,
          recommendation: 'Ready for AWS CloudFormation/CDK deployment according to /docs/aws-migration.md.',
        },
      },
    ];

    return {
      tenantName: tenant.name,
      tenantCode: tenant.tenantCode,
      isolationMode: tenant.isolationMode,
      dependencies,
    };
  }

  getAwsFoundationSummary() {
    const config = getAwsConfig();
    return {
      status: config.enabled ? 'Connected' : 'Not Connected',
      region: config.region,
      ecs: 'Not Provisioned',
      rds: 'Not Provisioned',
      elasticache: 'Not Provisioned',
      s3: 'Not Provisioned',
      cloudwatch: 'Not Connected',
      environment: config.environment,
    };
  }
}

export const infrastructureService = new InfrastructureService();

