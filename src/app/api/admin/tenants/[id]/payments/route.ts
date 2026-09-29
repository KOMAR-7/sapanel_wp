import { NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api/auth-guard';
import { paymentService } from '@/services/payments/payment.service';
import { apiError, apiSuccess } from '@/lib/api/response';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { errorResponse } = await requireAdminAuth(req, 'payments:read');
  if (errorResponse) return errorResponse;

  try {
    const payments = await paymentService.listPayments(params.id);
    return apiSuccess({ payments });
  } catch (err: any) {
    return apiError(err.message || 'Failed to list payments', 'SERVER_ERROR', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, errorResponse } = await requireAdminAuth(req, 'payments:create');
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const amount = parseFloat(body.amount);
    if (isNaN(amount) || amount <= 0) {
      return apiError('Valid payment amount greater than zero is required.', 'VALIDATION_ERROR', 400);
    }

    const validStatuses = ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED'];
    const status = body.status ? String(body.status).toUpperCase() : 'PENDING';
    if (!validStatuses.includes(status)) {
      return apiError(
        `Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}`,
        'VALIDATION_ERROR',
        400
      );
    }

    const validMethods = ['BANK_TRANSFER', 'CASH', 'UPI', 'CREDIT_CARD', 'OTHER'];
    const paymentMethod = body.paymentMethod ? String(body.paymentMethod).toUpperCase() : 'BANK_TRANSFER';
    if (!validMethods.includes(paymentMethod)) {
      return apiError(
        `Invalid paymentMethod '${paymentMethod}'. Must be one of: ${validMethods.join(', ')}`,
        'VALIDATION_ERROR',
        400
      );
    }

    const payment = await paymentService.recordPayment(
      {
        tenantId: params.id,
        amount,
        currency: body.currency || 'INR',
        paymentMethod: paymentMethod as any,
        transactionReference: body.transactionReference || null,
        status: status as any,
        paidAt: body.paidAt ? new Date(body.paidAt) : null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        notes: body.notes || null,
      },
      session?.adminId
    );

    return apiSuccess({ payment, message: `Payment of ${payment.currency} ${payment.amount} recorded with status ${payment.status}.` }, 201);
  } catch (err: any) {
    const statusCode = err.statusCode || 500;
    return apiError(err.message || 'Failed to record payment', err.code || 'SERVER_ERROR', statusCode);
  }
}
