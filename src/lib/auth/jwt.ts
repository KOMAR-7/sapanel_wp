import { SignJWT, jwtVerify } from 'jose';

const SECRET_KEY = process.env.AUTH_SECRET || 'restroconnect_platform_super_admin_jwt_secret_key_32_chars_min_2026';
const key = new TextEncoder().encode(SECRET_KEY);

export interface AdminTokenPayload {
  adminId: string;
  email: string;
  name: string;
  role: string;
}

export async function signAdminToken(payload: AdminTokenPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(key);
}

export async function verifyAdminToken(token: string): Promise<AdminTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });
    return {
      adminId: payload.adminId as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}
