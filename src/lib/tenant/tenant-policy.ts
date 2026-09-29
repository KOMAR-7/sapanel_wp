import { TenantStatus } from '@prisma/client';

export type TenantAccessStatus =
  | 'ACTIVE'
  | 'GRACE_PERIOD'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'ARCHIVED';

/**
 * Allowed status transitions for Tenant lifecycle state machine.
 * Any transition not in this map is forbidden by the Control Plane.
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<TenantStatus, TenantStatus[]> = {
  PENDING: ['PROVISIONING', 'CANCELLED'],
  PROVISIONING: ['ACTIVE', 'PENDING', 'CANCELLED'],
  ACTIVE: ['SUSPENDED', 'GRACE_PERIOD', 'CANCELLED', 'EXPIRED'],
  GRACE_PERIOD: ['ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED'],
  SUSPENDED: ['ACTIVE', 'CANCELLED', 'ARCHIVED'],
  EXPIRED: ['ACTIVE', 'CANCELLED', 'ARCHIVED'],
  CANCELLED: ['ARCHIVED'],
  ARCHIVED: [], // ARCHIVED cannot normally reactivate
};

/**
 * Validates whether a state transition from `currentStatus` to `nextStatus` is permitted.
 */
export function isValidStatusTransition(
  currentStatus: TenantStatus | string,
  nextStatus: TenantStatus | string
): boolean {
  if (currentStatus === nextStatus) return true;
  const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus as TenantStatus];
  if (!allowed) return false;
  return allowed.includes(nextStatus as TenantStatus);
}

/**
 * Asserts that a state transition is valid, throwing a structured error if forbidden.
 */
export function assertValidStatusTransition(
  currentStatus: TenantStatus | string,
  nextStatus: TenantStatus | string
): void {
  if (!isValidStatusTransition(currentStatus, nextStatus)) {
    const error: any = new Error(
      `Invalid tenant status transition: '${currentStatus}' -> '${nextStatus}' is not permitted.`
    );
    error.statusCode = 400;
    error.code = 'INVALID_STATUS_TRANSITION';
    throw error;
  }
}

/**
 * Accurately calculates the days remaining until a subscription/validity expires.
 * Returns negative numbers if expired.
 */
export function calculateDaysRemaining(expiryDate: Date | string | null | undefined): number {
  if (!expiryDate) return 0;
  const target = new Date(expiryDate).getTime();
  if (isNaN(target)) return 0;
  const now = Date.now();
  const diffMs = target - now;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Centralized function to determine the real, operational access status of a tenant.
 * Prevents tenants whose validity has elapsed from remaining indefinitely ACTIVE.
 * 
 * Possible return values:
 * - ACTIVE: Normal operations allowed.
 * - GRACE_PERIOD: Within 7-day grace period past expiry.
 * - SUSPENDED: Administratively suspended.
 * - EXPIRED: Subscription elapsed past grace window.
 * - CANCELLED: Tenant has cancelled service.
 * - ARCHIVED: Permanently archived / retired.
 */
export function getTenantAccessStatus(tenant: {
  status: TenantStatus | string;
  validUntil?: Date | string | null;
  subscriptions?: Array<{ endDate: Date | string; status?: string }>;
}): TenantAccessStatus {
  // 1. Explicit terminal or administrative states take highest precedence
  if (tenant.status === 'ARCHIVED') return 'ARCHIVED';
  if (tenant.status === 'CANCELLED') return 'CANCELLED';
  if (tenant.status === 'SUSPENDED') return 'SUSPENDED';

  // 2. Resolve effective expiry date (tenant.validUntil or latest subscription endDate)
  let effectiveExpiry: Date | string | null | undefined = tenant.validUntil;
  if (!effectiveExpiry && tenant.subscriptions && tenant.subscriptions.length > 0) {
    effectiveExpiry = tenant.subscriptions[0]?.endDate;
  }

  // 3. If there is an effective expiry date, calculate remaining days
  if (effectiveExpiry) {
    const daysRemaining = calculateDaysRemaining(effectiveExpiry);
    
    // More than 7 days overdue -> EXPIRED
    if (daysRemaining < -7) {
      return 'EXPIRED';
    }
    // Between 0 and -7 days overdue -> GRACE_PERIOD
    if (daysRemaining < 0) {
      return 'GRACE_PERIOD';
    }
  }

  // 4. If status was explicitly set to GRACE_PERIOD or EXPIRED in the database
  if (tenant.status === 'EXPIRED') return 'EXPIRED';
  if (tenant.status === 'GRACE_PERIOD') return 'GRACE_PERIOD';

  // 5. Default operational active state
  return 'ACTIVE';
}

/**
 * Centralized helper to check if a tenant is currently allowed to process customer orders
 */
export function isTenantOperational(tenant: {
  status: TenantStatus | string;
  validUntil?: Date | string | null;
  subscriptions?: Array<{ endDate: Date | string; status?: string }>;
}): boolean {
  const accessStatus = getTenantAccessStatus(tenant);
  return accessStatus === 'ACTIVE' || accessStatus === 'GRACE_PERIOD';
}
