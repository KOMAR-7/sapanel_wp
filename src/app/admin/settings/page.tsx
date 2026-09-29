'use client';

import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Settings, Shield, Key, Database, Server, CheckCircle2 } from 'lucide-react';

export default function SettingsPage() {
  const [admin, setAdmin] = useState<any>(null);

  useEffect(() => {
    async function loadAdmin() {
      try {
        const res = await fetch('/api/admin/auth/me');
        if (res.ok) {
          const json = await res.json();
          setAdmin(json.data.admin);
        }
      } catch {}
    }
    loadAdmin();
  }, []);

  return (
    <AdminLayout
      title="Platform Settings & RBAC"
      subtitle="SuperAdmin identity, RBAC permission roles, cache configurations, and AWS credentials"
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Profile Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Shield size={18} color="var(--brand-primary)" />
              Active Administrator Profile
            </h3>
            <span className="badge badge-green">Authenticated</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Name</div>
              <div style={{ fontWeight: 600, color: '#fff' }}>{admin?.name || 'Platform SuperAdmin'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email</div>
              <div style={{ fontWeight: 600 }}>{admin?.email || 'admin@restroconnect.com'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Role</div>
              <span className="badge badge-blue" style={{ marginTop: '4px' }}>
                {admin?.role || 'PLATFORM_SUPER_ADMIN'}
              </span>
            </div>
          </div>
        </div>

        {/* RBAC Architecture */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Key size={18} color="var(--brand-cyan)" />
              Role-Based Access Control (RBAC)
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8125rem' }}>
            <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)' }}>
              <strong style={{ color: '#fff' }}>PLATFORM_SUPER_ADMIN:</strong> Unrestricted control plane authority (all actions & tenants).
            </div>
            <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)' }}>
              <strong style={{ color: '#fff' }}>PLATFORM_ADMIN:</strong> Manage tenants, subscriptions, features, databases, view logs.
            </div>
            <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)' }}>
              <strong style={{ color: '#fff' }}>PLATFORM_SUPPORT:</strong> Read-only access with ticketing and probe capabilities.
            </div>
            <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)' }}>
              <strong style={{ color: '#fff' }}>PLATFORM_VIEWER:</strong> Strictly read-only observational audits.
            </div>
          </div>
        </div>

        {/* Cache & Performance */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Server size={18} color="var(--status-yellow)" />
              Cache & Deduplication Engine
            </h3>
          </div>

          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <p style={{ marginBottom: '8px' }}>
              <strong>Provider:</strong> In-Memory Cache with request deduplication (stampede protection)
            </p>
            <p style={{ marginBottom: '8px' }}>
              <strong>AWS ElastiCache Redis:</strong> Pluggable interface ready for Phase 2 deployment
            </p>
            <p>
              <strong>Cache Invalidation:</strong> Automatically triggered on tenant lifecycle, feature, and subscription mutations.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
