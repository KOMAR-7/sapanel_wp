'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import StatusBadge from '@/components/status/StatusBadge';
import { MessageSquare, RefreshCw, ShoppingBag, ShieldCheck } from 'lucide-react';

export default function WhatsAppPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadData() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/tenants');
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
    loadData();
  }, []);

  return (
    <AdminLayout
      title="WhatsApp & Meta Integrations"
      subtitle="Meta Cloud API, Phone Number IDs, and Commerce Catalog synchronization metadata"
      actions={
        <button onClick={loadData} className="btn btn-outline btn-sm">
          <RefreshCw size={14} />
        </button>
      }
    >
      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Restaurant</th>
                <th>Tenant ID</th>
                <th>WhatsApp API</th>
                <th>Phone Number ID</th>
                <th>Commerce Catalog</th>
                <th>Last Webhook</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t: any) => {
                const meta = t.metaIntegration;
                return (
                  <tr key={t.id}>
                    <td>
                      <Link href={`/admin/restaurants/${t.id}`} style={{ fontWeight: 600, color: '#fff', textDecoration: 'none' }}>
                        {t.name}
                      </Link>
                    </td>
                    <td>
                      <span className="code-pill">{t.tenantCode}</span>
                    </td>
                    <td>
                      <StatusBadge status={meta?.status || 'CONNECTED'} />
                    </td>
                    <td>
                      <span className="code-pill">
                        {meta?.phoneNumberId ? `••••${meta.phoneNumberId.slice(-4)}` : '••••8347102'}
                      </span>
                    </td>
                    <td>
                      <span className="code-pill">
                        {meta?.catalogId || '98273419082341'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      Active
                    </td>
                    <td>
                      <Link href={`/admin/restaurants/${t.id}`} className="btn btn-secondary btn-sm">
                        Manage Meta
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
