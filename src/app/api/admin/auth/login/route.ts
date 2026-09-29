import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db/prisma';
import { signAdminToken } from '@/lib/auth/jwt';
import { ADMIN_COOKIE_NAME } from '@/lib/auth/session';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { createAuditLog } from '@/lib/logging/audit-logger';
import { apiError, apiSuccess } from '@/lib/api/response';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
  const rateLimit = checkRateLimit(`login:${ip}`, 5, 60 * 1000);

  if (!rateLimit.allowed) {
    return apiError(
      `Too many failed login attempts. Please wait ${rateLimit.resetInSec} seconds.`,
      'RATE_LIMIT_EXCEEDED',
      429,
      { resetInSec: rateLimit.resetInSec }
    );
  }

  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return apiError('Email and password are required.', 'VALIDATION_ERROR', 400);
    }

    const admin = await prisma.platformAdmin.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!admin || !admin.isActive) {
      return apiError('Invalid credentials or inactive account.', 'INVALID_CREDENTIALS', 401);
    }

    const passwordValid = await bcrypt.compare(password, admin.passwordHash);
    if (!passwordValid) {
      return apiError('Invalid credentials or inactive account.', 'INVALID_CREDENTIALS', 401);
    }

    // Update last login
    await prisma.platformAdmin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await signAdminToken({
      adminId: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    });

    await createAuditLog({
      adminId: admin.id,
      action: 'LOGIN',
      resourceType: 'AUTH',
      resourceId: admin.id,
      ipAddress: ip,
      userAgent: req.headers.get('user-agent'),
      newValue: { email: admin.email, role: admin.role },
    });

    const res = apiSuccess({
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });

    // Set secure HTTP-only cookie
    res.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return res;
  } catch (err: any) {
    return apiError(err.message || 'Login failed', 'SERVER_ERROR', 500);
  }
}
