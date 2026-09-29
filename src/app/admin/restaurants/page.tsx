'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import StatusBadge from '@/components/status/StatusBadge';
import ConfirmModal from '@/components/modals/ConfirmModal';
import {
  UtensilsCrossed,
  Search,
  Filter,
  Plus,
  Activity,
  Calendar,
  ExternalLink,
  PauseCircle,
  PlayCircle,
  RefreshCw,
} from 'lucide-react';

export default function RestaurantsPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal actions
  const [actionTenant, setActionTenant] = useState<any>(null);
  const [actionType, setActionType] = useState<'suspend' | 'reactivate' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  async function loadTenants() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/admin/tenants?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setTenants(json.data.tenants || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTenants();
  }, [statusFilter]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadTenants();
  }

  async function handleConfirmLifecycle() {
    if (!actionTenant || !actionType) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/tenants/${actionTenant.id}/${actionType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        await loadTenants();
        setActionTenant(null);
        setActionType(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <AdminLayout
      title="Restaurant Tenant Registry"
      subtitle="Manage all onboarding, database topologies, subscriptions, and tenant lifecycles"
      actions={
        <Link href="/admin/restaurants/new" className="btn btn-primary btn-sm">
          <Plus size={16} />
          <span>Add Restaurant</span>
        </Link>
      }
    >
      {/* Search and Filters Bar */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '36px' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by restaurant name, tenant code, slug, email, phone..."
            />
          </div>
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={15} color="var(--text-muted)" />
            <select
              className="form-select"
              style={{ width: '160px', padding: '8px 12px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="EXPIRED">EXPIRED</option>
              <option value="PENDING">PENDING</option>
            </select>
          </div>

          <button onClick={loadTenants} className="btn btn-outline btn-sm" title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Restaurant</th>
                <th>Tenant ID</th>
                <th>Status</th>
                <th>Plan</th>
                <th>Database</th>
                <th>Region</th>
                <th>Frontend</th>
                <th>Validity</th>
                <th>Last Health Check</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Loading restaurant registry...
                  </td>
                </tr>
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
                    <div style={{ marginBottom: '12px' }}>No restaurants found matching current filter.</div>
                    <Link href="/admin/restaurants/new" className="btn btn-primary btn-sm">
                      <Plus size={14} /> Add First Restaurant
                    </Link>
                  </td>
                </tr>
              ) : (
                tenants.map((t) => {
                  const db = t.databases?.[0];
                  const sub = t.subscriptions?.[0];
                  const validUntil = t.validUntil ? new Date(t.validUntil) : null;
                  const daysRemaining = validUntil
                    ? Math.ceil((validUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    : 0;

                  return (
                    <tr key={t.id}>
                      <td>
                        <Link
                          href={`/admin/restaurants/${t.id}`}
                          style={{ fontWeight: 700, color: '#fff', textDecoration: 'none', fontSize: '0.9rem' }}
                        >
                          {t.name}
                        </Link>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {t.ownerName} &bull; {t.ownerPhone}
                        </div>
                      </td>
                      <td>
                        <span className="code-pill">{t.tenantCode}</span>
                      </td>
                      <td>
                        <StatusBadge status={t.status} />
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                          {sub?.plan?.name || 'Professional'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {sub?.status || 'ACTIVE'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className={`badge ${db?.status === 'CONNECTED' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.65rem' }}>
                            {db?.provider || 'Render'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {db?.host ? `${db.host.slice(0, 4)}••••.${db.host.split('.').slice(1).join('.')}` : 'Unregistered'}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                          {db?.region || 'Singapore'}
                        </span>
                      </td>
                      <td>
                        {t.frontendUrl ? (
                          <a
                            href={t.frontendUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-outline btn-sm"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          >
                            <span>Live App</span>
                            <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                          {validUntil ? validUntil.toLocaleDateString() : '—'}
                        </div>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: daysRemaining < 10 ? 'var(--status-red)' : 'var(--text-muted)',
                          }}
                        >
                          {daysRemaining > 0 ? `${daysRemaining} days left` : 'Expired'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8125rem', color: '#fff' }}>
                          {db?.lastHealthCheckAt ? new Date(db.lastHealthCheckAt).toLocaleTimeString() : 'Recent'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: db?.status === 'CONNECTED' ? '#10b981' : 'var(--text-muted)' }}>
                          {db?.lastLatencyMs ? `${db.lastLatencyMs} ms` : '—'}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <Link href={`/admin/restaurants/${t.id}`} className="btn btn-secondary btn-sm">
                            Manage
                          </Link>
                          {t.status === 'ACTIVE' ? (
                            <button
                              onClick={() => {
                                setActionTenant(t);
                                setActionType('suspend');
                              }}
                              className="btn btn-outline btn-sm"
                              title="Suspend Restaurant"
                              style={{ color: 'var(--status-yellow)' }}
                            >
                              <PauseCircle size={14} />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setActionTenant(t);
                                setActionType('reactivate');
                              }}
                              className="btn btn-outline btn-sm"
                              title="Reactivate Restaurant"
                              style={{ color: 'var(--status-green)' }}
                            >
                              <PlayCircle size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for Suspend / Reactivate */}
      <ConfirmModal
        isOpen={Boolean(actionTenant && actionType)}
        onClose={() => {
          setActionTenant(null);
          setActionType(null);
        }}
        onConfirm={handleConfirmLifecycle}
        title={actionType === 'suspend' ? `Suspend ${actionTenant?.name}?` : `Reactivate ${actionTenant?.name}?`}
        description={
          actionType === 'suspend'
            ? `Suspending ${actionTenant?.name} will temporarily disable access to their direct ordering application while retaining all orders, menus, and database records safely.`
            : `Reactivating ${actionTenant?.name} will restore customer ordering and staff access immediately.`
        }
        impactWarning={
          actionType === 'suspend'
            ? 'Customers visiting the restaurant ordering storefront will see a maintenance/suspended notice. WhatsApp Bot will return a temporary inactivity message.'
            : undefined
        }
        confirmWord={actionType === 'suspend' ? actionTenant?.name : undefined}
        confirmButtonText={actionType === 'suspend' ? 'Suspend Access' : 'Reactivate Now'}
        isDestructive={actionType === 'suspend'}
        isLoading={isProcessing}
      />
    </AdminLayout>
  );
}
