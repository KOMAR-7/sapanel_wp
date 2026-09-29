import { NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api/auth-guard';
import { subscriptionService } from '@/services/subscriptions/subscription.service';
import { apiError, apiSuccess } from '@/lib/api/response';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { errorResponse } = await requireAdminAuth(req, 'subscriptions:read');
  if (errorResponse) return errorResponse;

  try {
    const subscription = await subscriptionService.getTenantSubscription(params.id);
    const plans = await subscriptionService.listPlans();
    return apiSuccess({ subscription, availablePlans: plans });
  } catch (err: any) {
    return apiError(err.message || 'Failed to fetch subscription', 'SERVER_ERROR', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, errorResponse } = await requireAdminAuth(req, 'subscriptions:manage');
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const planId = body.planId || body.planName || body.plan;
    if (!planId) return apiError('planId or plan name is required.', 'VALIDATION_ERROR', 400);

    const updated = await subscriptionService.changePlan(params.id, planId, session?.adminId);
    return apiSuccess({ subscription: updated, message: `Subscription plan changed to ${updated.plan.name}.` });
  } catch (err: any) {
    const statusCode = err.statusCode || 500;
    return apiError(err.message || 'Failed to update plan', err.code || 'SERVER_ERROR', statusCode);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return PATCH(req, { params });
}
