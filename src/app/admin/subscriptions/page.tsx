'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import StatusBadge from '@/components/status/StatusBadge';
import { CreditCard, Check, RefreshCw } from 'lucide-react';

export default function SubscriptionsPage() {
  const [data, setData] = useState<any>({ plans: [], activeSubscriptions: [] });
  const [isLoading, setIsLoading] = useState(true);

  async function loadData() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/subscriptions');
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <AdminLayout
      title="Platform Subscriptions"
      subtitle="Subscription tiers, billing cycles, and active tenant plan assignments"
      actions={
        <button onClick={loadData} className="btn btn-outline btn-sm">
          <RefreshCw size={14} />
        </button>
      }
    >
      {/* Platform Plans Grid */}
      <div style={{ marginBottom: '28px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', color: '#fff' }}>
          Available Subscription Plans
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {data.plans.map((p: any) => {
            const features = p.features ? JSON.parse(p.features) : [];
            return (
              <div
                key={p.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: p.name === 'Professional' ? '2px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>{p.name}</h4>
                    {p.name === 'Professional' && (
                      <span className="badge badge-blue">Popular</span>
                    )}
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--brand-primary)', marginBottom: '8px' }}>
                    ₹{p.price.toLocaleString()} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/{p.billingCycle.toLowerCase()}</span>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '16px' }}>
                    {p.description}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Includes:
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#fff' }}>
                      &bull; Up to <strong>{p.maxBranches}</strong> Branches
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#fff' }}>
                      &bull; Up to <strong>{p.maxUsers}</strong> Staff Users
                    </div>
                    {features.map((f: string) => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        <Check size={14} color="var(--status-green)" />
                        <span>{f.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Active Subscribers: <strong>{p._count?.subscriptions || 0}</strong> restaurants
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Subscriptions Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <CreditCard size={18} color="var(--brand-primary)" />
            Active Tenant Subscriptions
          </h3>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Restaurant</th>
                <th>Tenant ID</th>
                <th>Assigned Plan</th>
                <th>Status</th>
                <th>Start Date</th>
                <th>Renewal Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.activeSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No subscriptions found.
                  </td>
                </tr>
              ) : (
                data.activeSubscriptions.map((sub: any) => (
                  <tr key={sub.id}>
                    <td>
                      <Link href={`/admin/restaurants/${sub.tenant.id}`} style={{ fontWeight: 600, color: '#fff', textDecoration: 'none' }}>
                        {sub.tenant.name}
                      </Link>
                    </td>
                    <td>
                      <span className="code-pill">{sub.tenant.tenantCode}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>
                        {sub.plan.name}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={sub.status} />
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>
                      {new Date(sub.startDate).toLocaleDateString()}
                    </td>
                    <td style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                      {new Date(sub.endDate).toLocaleDateString()}
                    </td>
                    <td>
                      <Link href={`/admin/restaurants/${sub.tenant.id}`} className="btn btn-secondary btn-sm">
                        Manage Plan
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
