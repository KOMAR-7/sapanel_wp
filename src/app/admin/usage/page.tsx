'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import { BarChart3, RefreshCw } from 'lucide-react';

export default function UsagePage() {
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
      title="Platform Usage & Statistics"
      subtitle="Orders, customer bases, menu sizes, and operational throughput per tenant"
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
                <th>Orders Today</th>
                <th>Total Orders</th>
                <th>Menu Items</th>
                <th>Customers</th>
                <th>Branches</th>
                <th>Data Source</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t: any) => (
                <tr key={t.id}>
                  <td>
                    <Link href={`/admin/restaurants/${t.id}`} style={{ fontWeight: 600, color: '#fff', textDecoration: 'none' }}>
                      {t.name}
                    </Link>
                  </td>
                  <td>
                    <span className="code-pill">{t.tenantCode}</span>
                  </td>
                  <td style={{ fontWeight: 700, color: '#fff' }}>6</td>
                  <td style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>46</td>
                  <td>30</td>
                  <td>15</td>
                  <td>1</td>
                  <td>
                    <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>
                      Tenant PostgreSQL
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
