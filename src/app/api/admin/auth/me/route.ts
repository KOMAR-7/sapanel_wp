import { NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api/auth-guard';
import { apiSuccess } from '@/lib/api/response';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await requireAdminAuth(req);
  if (errorResponse) return errorResponse;

  return apiSuccess({
    admin: session,
  });
}
