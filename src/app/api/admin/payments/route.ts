import { NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api/auth-guard';
import { paymentService } from '@/services/payments/payment.service';
import { apiError, apiSuccess } from '@/lib/api/response';

export async function GET(req: NextRequest) {
  const { errorResponse } = await requireAdminAuth(req, 'payments:read');
  if (errorResponse) return errorResponse;

  const url = new URL(req.url);
  const tenantId = url.searchParams.get('tenantId') || undefined;

  try {
    const payments = await paymentService.listPayments(tenantId);
    return apiSuccess({ payments });
  } catch (err: any) {
    return apiError(err.message || 'Failed to list payments', 'SERVER_ERROR', 500);
  }
}
