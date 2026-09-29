import prisma from '@/lib/db/prisma';
import { sanitizeAuditSnapshot } from '@/lib/security/mask';

export interface AuditLogOptions {
  adminId?: string | null;
  tenantId?: string | null;
  action: string;
  resourceType: 'TENANT' | 'DATABASE' | 'SUBSCRIPTION' | 'FEATURE' | 'PAYMENT' | 'META' | 'DEPLOYMENT' | 'HEALTH' | 'AUTH';
  resourceId?: string | null;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function createAuditLog(options: AuditLogOptions) {
  try {
    const sanitizedOld = sanitizeAuditSnapshot(options.oldValue);
    const sanitizedNew = sanitizeAuditSnapshot(options.newValue);

    const log = await prisma.auditLog.create({
      data: {
        adminId: options.adminId || null,
        tenantId: options.tenantId || null,
        action: options.action,
        resourceType: options.resourceType,
        resourceId: options.resourceId || null,
        oldValue: sanitizedOld,
        newValue: sanitizedNew,
        ipAddress: options.ipAddress || null,
        userAgent: options.userAgent || null,
      },
    });

    // Structured server log for observability (CloudWatch ready)
    console.log(
      JSON.stringify({
        level: 'INFO',
        type: 'AUDIT_LOG',
        timestamp: new Date().toISOString(),
        auditLogId: log.id,
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        tenantId: log.tenantId,
        adminId: log.adminId,
      })
    );

    return log;
  } catch (err) {
    console.error('Failed to write audit log:', err);
    return null;
  }
}
