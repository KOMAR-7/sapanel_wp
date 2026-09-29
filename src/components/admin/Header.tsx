'use client';

import React from 'react';
import Link from 'next/link';
import { Menu, Plus, Database, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onMenuToggle?: () => void;
  actions?: React.ReactNode;
}

export function Header({ title = 'Control Plane', subtitle, onMenuToggle, actions }: HeaderProps) {
  return (
    <header
      style={{
        height: '70px',
        background: 'var(--bg-header)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="btn btn-outline btn-sm mobile-menu-btn"
            style={{ padding: '8px' }}
          >
            <Menu size={18} />
          </button>
        )}
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Environment & Control Plane Indicators */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-card)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
          }}
        >
          <Database size={13} color="var(--status-green)" />
          <span>Tenant DB: <strong style={{ color: '#fff' }}>Render PG (Singapore)</strong></span>
          <span style={{ color: 'var(--border-medium)' }}>|</span>
          <ShieldCheck size={13} color="var(--brand-primary)" />
          <span>Plane: <strong style={{ color: 'var(--status-green)' }}>ONLINE</strong></span>
        </div>

        {actions}

        <Link href="/admin/restaurants/new" className="btn btn-primary btn-sm">
          <Plus size={16} />
          <span>Add Restaurant</span>
        </Link>
      </div>
    </header>
  );
}

export default Header;
