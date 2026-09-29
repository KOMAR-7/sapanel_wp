import prisma from '@/lib/db/prisma';
import { maskPhoneNumberId } from '@/lib/security/mask';
import { createAuditLog } from '@/lib/logging/audit-logger';

export class MetaService {
  async getMetaIntegration(tenantId: string) {
    const meta = await prisma.metaIntegration.findUnique({
      where: { tenantId },
      include: {
        tenant: { select: { name: true, slug: true, tenantCode: true } },
      },
    });

    if (!meta) return null;

    return {
      ...meta,
      maskedPhoneNumberId: maskPhoneNumberId(meta.phoneNumberId),
      // Never expose tokenSecretReference or tokens to frontend!
      tokenSecretReference: undefined,
    };
  }

  async updateMetaIntegration(
    tenantId: string,
    data: {
      phoneNumberId?: string;
      businessAccountId?: string;
      catalogId?: string;
      secretReference?: string;
    },
    adminId?: string
  ) {
    const existing = await prisma.metaIntegration.findUnique({ where: { tenantId } });

    const updated = await prisma.metaIntegration.upsert({
      where: { tenantId },
      update: {
        phoneNumberId: data.phoneNumberId || existing?.phoneNumberId,
        businessAccountId: data.businessAccountId || existing?.businessAccountId,
        catalogId: data.catalogId || existing?.catalogId,
        tokenSecretReference: data.secretReference || existing?.tokenSecretReference,
        status: data.phoneNumberId ? 'CONNECTED' : 'DISCONNECTED',
        lastSyncAt: new Date(),
      },
      create: {
        tenantId,
        provider: 'META_WHATSAPP',
        phoneNumberId: data.phoneNumberId || null,
        businessAccountId: data.businessAccountId || null,
        catalogId: data.catalogId || null,
        tokenSecretReference: data.secretReference || `aws/secretsmanager/tenants/${tenantId}/meta-token`,
        status: data.phoneNumberId ? 'CONNECTED' : 'PENDING',
        lastSyncAt: new Date(),
      },
    });

    await createAuditLog({
      adminId,
      tenantId,
      action: 'UPDATE_META',
      resourceType: 'META',
      resourceId: updated.id,
      newValue: {
        maskedPhoneId: maskPhoneNumberId(updated.phoneNumberId),
        catalogId: updated.catalogId,
        status: updated.status,
      },
    });

    return {
      ...updated,
      maskedPhoneNumberId: maskPhoneNumberId(updated.phoneNumberId),
      tokenSecretReference: undefined,
    };
  }
}

export const metaService = new MetaService();
