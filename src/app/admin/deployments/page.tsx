'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import StatusBadge from '@/components/status/StatusBadge';
import { Rocket, RefreshCw, ExternalLink, Activity } from 'lucide-react';

export default function DeploymentsPage() {
  const [deployments, setDeployments] = useState<any[]>([]);
  const [testingId, setTestingId] = useState<string | null>(null);

  async function loadDeployments() {
    try {
      const res = await fetch('/api/admin/deployments');
      if (res.ok) {
        const json = await res.json();
        setDeployments(json.data.deployments || []);
      }
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadDeployments();
  }, []);

  async function handleTestDeployment(id: string) {
    setTestingId(id);
    try {
      await fetch(`/api/admin/deployments/${id}/test`, { method: 'POST' });
      await loadDeployments();
    } catch (e) {
      console.error(e);
    } finally {
      setTestingId(null);
    }
  }

  return (
    <AdminLayout
      title="Application Deployment Registry"
      subtitle="Frontend storefront URLs, edge routing, version tracking, and AWS container specs"
      actions={
        <button onClick={loadDeployments} className="btn btn-outline btn-sm">
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
                <th>Provider</th>
                <th>Frontend URL</th>
                <th>Region</th>
                <th>Version</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deployments.map((d: any) => (
                <tr key={d.id}>
                  <td>
                    <Link href={`/admin/restaurants/${d.tenant.id}`} style={{ fontWeight: 600, color: '#fff', textDecoration: 'none' }}>
                      {d.tenant.name}
                    </Link>
                  </td>
                  <td>
                    <span className="code-pill">{d.tenant.tenantCode}</span>
                  </td>
                  <td>
                    <span className="badge badge-blue">{d.provider}</span>
                  </td>
                  <td>
                    {d.frontendUrl ? (
                      <a href={d.frontendUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--brand-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span>{d.frontendUrl}</span>
                        <ExternalLink size={12} />
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{d.region}</td>
                  <td>
                    <span className="code-pill">{d.version || 'v1.0.0'}</span>
                  </td>
                  <td>
                    <StatusBadge status={d.status} />
                  </td>
                  <td>
                    <button
                      onClick={() => handleTestDeployment(d.id)}
                      disabled={testingId === d.id}
                      className="btn btn-secondary btn-sm"
                    >
                      <Activity size={13} />
                      <span>{testingId === d.id ? 'Probing...' : 'Probe HTTP'}</span>
                    </button>
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
