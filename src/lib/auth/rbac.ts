import { PlatformRole } from '@prisma/client';

export type Permission =
  | 'platform:all'
  | 'tenants:read'
  | 'tenants:create'
  | 'tenants:update'
  | 'tenants:delete'
  | 'tenants:suspend'
  | 'tenants:reactivate'
  | 'databases:read'
  | 'databases:test'
  | 'databases:manage'
  | 'subscriptions:read'
  | 'subscriptions:manage'
  | 'payments:read'
  | 'payments:create'
  | 'features:read'
  | 'features:manage'
  | 'infrastructure:read'
  | 'infrastructure:manage'
  | 'health:read'
  | 'health:trigger'
  | 'support:read'
  | 'support:manage'
  | 'audit:read'
  | 'settings:read'
  | 'settings:manage';

const ROLE_PERMISSIONS: Record<PlatformRole, Permission[]> = {
  PLATFORM_SUPER_ADMIN: [
    'platform:all',
    'tenants:read',
    'tenants:create',
    'tenants:update',
    'tenants:delete',
    'tenants:suspend',
    'tenants:reactivate',
    'databases:read',
    'databases:test',
    'databases:manage',
    'subscriptions:read',
    'subscriptions:manage',
    'payments:read',
    'payments:create',
    'features:read',
    'features:manage',
    'infrastructure:read',
    'infrastructure:manage',
    'health:read',
    'health:trigger',
    'support:read',
    'support:manage',
    'audit:read',
    'settings:read',
    'settings:manage',
  ],
  PLATFORM_ADMIN: [
    'tenants:read',
    'tenants:create',
    'tenants:update',
    'tenants:suspend',
    'tenants:reactivate',
    'databases:read',
    'databases:test',
    'subscriptions:read',
    'subscriptions:manage',
    'payments:read',
    'payments:create',
    'features:read',
    'features:manage',
    'infrastructure:read',
    'health:read',
    'health:trigger',
    'support:read',
    'support:manage',
    'audit:read',
    'settings:read',
  ],
  PLATFORM_SUPPORT: [
    'tenants:read',
    'databases:read',
    'databases:test',
    'subscriptions:read',
    'payments:read',
    'features:read',
    'infrastructure:read',
    'health:read',
    'health:trigger',
    'support:read',
    'support:manage',
    'audit:read',
  ],
  PLATFORM_VIEWER: [
    'tenants:read',
    'databases:read',
    'subscriptions:read',
    'payments:read',
    'features:read',
    'infrastructure:read',
    'health:read',
    'support:read',
    'audit:read',
  ],
};

export function hasPermission(role: string, permission: Permission): boolean {
  const pRole = role as PlatformRole;
  const permissions = ROLE_PERMISSIONS[pRole];
  if (!permissions) return false;
  if (permissions.includes('platform:all')) return true;
  return permissions.includes(permission);
}

export function assertPermission(role: string, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    const error: any = new Error(`Forbidden: Role '${role}' lacks permission '${permission}'`);
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }
}
