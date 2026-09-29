'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  UtensilsCrossed,
  CreditCard,
  Receipt,
  ToggleRight,
  Rocket,
  Database,
  Cpu,
  MessageSquare,
  BarChart3,
  Activity,
  LifeBuoy,
  FileText,
  Settings,
  LogOut,
  Shield,
  Layers,
} from 'lucide-react';

interface SidebarProps {
  currentAdmin?: {
    name: string;
    email: string;
    role: string;
  } | null;
  isOpen?: boolean;
  onClose?: () => void;
}

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/restaurants', label: 'Restaurants', icon: UtensilsCrossed },
  { href: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { href: '/admin/payments', label: 'Payments', icon: Receipt },
  { href: '/admin/features', label: 'Features', icon: ToggleRight },
  { href: '/admin/deployments', label: 'Deployments', icon: Rocket },
  { href: '/admin/databases', label: 'Databases', icon: Database },
  { href: '/admin/infrastructure', label: 'Infrastructure', icon: Cpu },
  { href: '/admin/whatsapp', label: 'WhatsApp / Meta', icon: MessageSquare },
  { href: '/admin/usage', label: 'Usage & Metrics', icon: BarChart3 },
  { href: '/admin/health', label: 'System Health', icon: Activity },
  { href: '/admin/support', label: 'Support Tickets', icon: LifeBuoy },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: FileText },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ currentAdmin, isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch {
      router.push('/login');
    }
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          style={{
            display: 'none',
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            zIndex: 90,
          }}
        />
      )}

      <aside
        style={{
          width: '260px',
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          userSelect: 'none',
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: '22px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '9px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px var(--brand-glow)',
            }}
          >
            <Layers size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '0.975rem', fontWeight: 800, letterSpacing: '0.02em', color: '#fff' }}>
              RESTROCONNECT
            </div>
            <div
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: 'var(--brand-cyan)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Control Plane
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
          }}
        >
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  background: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  border: isActive ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon
                  size={18}
                  color={isActive ? '#60a5fa' : 'var(--text-muted)'}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Admin Footer & Logout */}
        <div
          style={{
            padding: '16px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'rgba(0, 0, 0, 0.25)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-medium)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--brand-primary)',
                  flexShrink: 0,
                }}
              >
                <Shield size={16} />
              </div>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {currentAdmin?.name || 'Platform Admin'}
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                  {(currentAdmin?.role || 'SUPER_ADMIN').replace('PLATFORM_', '').toLowerCase()}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Logout"
              className="btn btn-outline btn-sm"
              style={{ padding: '6px', border: 'none', color: 'var(--text-muted)' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
