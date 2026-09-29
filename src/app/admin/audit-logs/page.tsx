'use client';

import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { FileText, RefreshCw, ShieldAlert, Filter } from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [actionFilter, setActionFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  async function loadLogs() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter) params.set('action', actionFilter);

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setLogs(json.data.logs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, [actionFilter]);

  return (
    <AdminLayout
      title="Platform Audit Trail"
      subtitle="Immutable cryptographic log of control plane events, administrator actions, and mutations"
      actions={
        <button onClick={loadLogs} className="btn btn-outline btn-sm">
          <RefreshCw size={14} />
        </button>
      }
    >
      <div className="card" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={15} color="var(--text-muted)" />
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Filter by Action:</span>
          <select
            className="form-select"
            style={{ width: '220px', padding: '6px 12px' }}
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">All Actions</option>
            <option value="LOGIN">LOGIN</option>
            <option value="CREATE_TENANT">CREATE_TENANT</option>
            <option value="UPDATE_TENANT">UPDATE_TENANT</option>
            <option value="SUSPEND_TENANT">SUSPEND_TENANT</option>
            <option value="REACTIVATE_TENANT">REACTIVATE_TENANT</option>
            <option value="EXTEND_VALIDITY">EXTEND_VALIDITY</option>
            <option value="CHANGE_PLAN">CHANGE_PLAN</option>
            <option value="ENABLE_FEATURE">ENABLE_FEATURE</option>
            <option value="DISABLE_FEATURE">DISABLE_FEATURE</option>
            <option value="HEALTH_CHECK">HEALTH_CHECK</option>
            <option value="RECORD_PAYMENT">RECORD_PAYMENT</option>
          </select>
        </div>

        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Showing latest {logs.length} events &bull; Auto-sanitized (No plaintext passwords/tokens)
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Target Resource</th>
                <th>Restaurant / Tenant</th>
                <th>Administrator</th>
                <th>IP Address</th>
                <th>Audit Snapshot</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id}>
                  <td style={{ fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td>
                    <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8125rem' }}>
                    <span className="code-pill">{log.resourceType}</span>
                  </td>
                  <td>
                    {log.tenant ? (
                      <div>
                        <div style={{ fontWeight: 600, color: '#fff' }}>{log.tenant.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {log.tenant.tenantCode}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Platform Wide</span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8125rem', color: '#fff' }}>
                      {log.admin?.name || 'Platform System'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {log.admin?.email}
                    </div>
                  </td>
                  <td>
                    <span className="code-pill">{log.ipAddress || '127.0.0.1'}</span>
                  </td>
                  <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                    {log.newValue || log.oldValue || '—'}
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
