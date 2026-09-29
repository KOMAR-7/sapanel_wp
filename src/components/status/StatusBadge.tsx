import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Clock, PauseCircle, ShieldAlert } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  type?: 'tenant' | 'database' | 'health' | 'subscription' | 'payment';
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const norm = (status || '').toUpperCase();

  let colorClass = 'badge-gray';
  let Icon = Clock;

  if (['ACTIVE', 'CONNECTED', 'HEALTHY', 'PAID', 'VALID'].includes(norm)) {
    colorClass = 'badge-green';
    Icon = CheckCircle2;
  } else if (['WARNING', 'GRACE_PERIOD', 'PENDING', 'TRIAL', 'PARTIAL', 'CONNECTING'].includes(norm)) {
    colorClass = 'badge-yellow';
    Icon = AlertTriangle;
  } else if (['SUSPENDED', 'STOPPED'].includes(norm)) {
    colorClass = 'badge-yellow';
    Icon = PauseCircle;
  } else if (['EXPIRED', 'FAILED', 'UNHEALTHY', 'ERROR', 'CANCELLED', 'OUTDATED', 'CRITICAL'].includes(norm)) {
    colorClass = 'badge-red';
    Icon = XCircle;
  } else if (['PROVISIONING', 'DEPLOYING'].includes(norm)) {
    colorClass = 'badge-blue';
    Icon = Clock;
  } else if (['ARCHIVED'].includes(norm)) {
    colorClass = 'badge-gray';
    Icon = ShieldAlert;
  }

  return (
    <span className={`badge ${colorClass} ${className}`}>
      <Icon size={12} strokeWidth={2.5} />
      <span>{norm.replace(/_/g, ' ')}</span>
    </span>
  );
}

export default StatusBadge;
