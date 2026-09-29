import prisma from '@/lib/db/prisma';
import { createAuditLog } from '@/lib/logging/audit-logger';
import cacheService from '@/lib/cache/cache-service';

export interface RecordPaymentInput {
  tenantId: string;
  subscriptionId?: string;
  amount: number;
  currency?: string;
  paymentMethod: 'BANK_TRANSFER' | 'CASH' | 'UPI' | 'CREDIT_CARD' | 'OTHER';
  transactionReference?: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
  paidAt?: Date | null;
  dueDate?: Date | null;
  notes?: string;
}

export class PaymentService {
  async listPayments(tenantId?: string) {
    return await prisma.payment.findMany({
      where: tenantId ? { tenantId } : {},
      include: {
        tenant: { select: { id: true, name: true, tenantCode: true } },
        subscription: { include: { plan: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async recordPayment(data: RecordPaymentInput, adminId?: string) {
    const tenant = await prisma.tenant.findUnique({ where: { id: data.tenantId } });
    if (!tenant) throw new Error(`Tenant '${data.tenantId}' not found`);

    let subscriptionId = data.subscriptionId;
    if (!subscriptionId) {
      const activeSub = await prisma.tenantSubscription.findFirst({
        where: { tenantId: data.tenantId },
        orderBy: { createdAt: 'desc' },
      });
      subscriptionId = activeSub?.id;
    }

    // Only auto-populate paidAt if status is explicitly PAID and paidAt was not supplied
    let effectivePaidAt: Date | null = null;
    if (data.paidAt) {
      effectivePaidAt = new Date(data.paidAt);
    } else if (data.status === 'PAID') {
      effectivePaidAt = new Date();
    }

    const payment = await prisma.payment.create({
      data: {
        tenantId: data.tenantId,
        subscriptionId,
        amount: data.amount,
        currency: data.currency || 'INR',
        paymentMethod: data.paymentMethod,
        transactionReference: data.transactionReference || null,
        status: data.status,
        paidAt: effectivePaidAt,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        notes: data.notes || null,
      },
    });

    await cacheService.delete(`tenant:${data.tenantId}:subscription`);

    await createAuditLog({
      adminId,
      tenantId: data.tenantId,
      action: 'RECORD_PAYMENT',
      resourceType: 'PAYMENT',
      resourceId: payment.id,
      newValue: {
        amount: payment.amount,
        currency: payment.currency,
        method: payment.paymentMethod,
        reference: payment.transactionReference,
        status: payment.status,
        paidAt: payment.paidAt,
        dueDate: payment.dueDate,
      },
    });

    return payment;
  }
}

export const paymentService = new PaymentService();
