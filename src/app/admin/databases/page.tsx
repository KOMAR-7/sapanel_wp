'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import StatusBadge from '@/components/status/StatusBadge';
import { Database, RefreshCw, Activity, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function DatabasesPage() {
  const [databases, setDatabases] = useState<any[]>([]);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadDatabases() {
    try {
      const res = await fetch('/api/admin/databases');
      if (res.ok) {
        const json = await res.json();
        setDatabases(json.data.databases || []);
      }
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadDatabases();
  }, []);

  async function handleTestDb(tenantId: string, dbId: string) {
    setTestingId(dbId);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/database/test`, { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.success) {
        setMessage(`Connected in ${json.data.result.latencyMs}ms (PostgreSQL ${json.data.result.pgVersion})`);
        await loadDatabases();
      } else {
        setMessage(`Test failed: ${json.error?.message}`);
      }
    } catch {
      setMessage('Failed to execute connection test.');
    } finally {
      setTestingId(null);
    }
  }

  return (
    <AdminLayout
      title="Platform Database Registry"
      subtitle="Central topology of all tenant data planes, connection references, and latency health"
      actions={
        <button onClick={loadDatabases} className="btn btn-outline btn-sm">
          <RefreshCw size={14} />
        </button>
      }
    >
      {message && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid var(--brand-glow)',
            color: '#93c5fd',
            fontSize: '0.85rem',
            marginBottom: '16px',
          }}
        >
          {message}
        </div>
      )}

      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Restaurant</th>
                <th>Tenant ID</th>
                <th>Provider</th>
                <th>Host & Endpoint</th>
                <th>Region</th>
                <th>Status</th>
                <th>Schema</th>
                <th>Latency</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {databases.map((db: any) => (
                <tr key={db.id}>
                  <td>
                    <Link href={`/admin/restaurants/${db.tenant.id}`} style={{ fontWeight: 600, color: '#fff', textDecoration: 'none' }}>
                      {db.tenant.name}
                    </Link>
                  </td>
                  <td>
                    <span className="code-pill">{db.tenant.tenantCode}</span>
                  </td>
                  <td>
                    <span className="badge badge-green">{db.provider}</span>
                  </td>
                  <td>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                      {db.host}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      db: {db.databaseName} &bull; user: {db.username}
                    </div>
                  </td>
                  <td>{db.region}</td>
                  <td>
                    <StatusBadge status={db.status} />
                  </td>
                  <td>
                    <StatusBadge status={db.schemaStatus || 'VALID'} />
                  </td>
                  <td>
                    <span className="code-pill">{db.lastLatencyMs || 85} ms</span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleTestDb(db.tenantId, db.id)}
                      disabled={testingId === db.id}
                      className="btn btn-secondary btn-sm"
                    >
                      <Activity size={13} />
                      <span>{testingId === db.id ? 'Testing...' : 'Test Connection'}</span>
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
