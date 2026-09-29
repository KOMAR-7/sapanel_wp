'use client';

import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import StatusBadge from '@/components/status/StatusBadge';
import { LifeBuoy, RefreshCw } from 'lucide-react';

export default function SupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadTickets() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/support');
      if (res.ok) {
        const json = await res.json();
        setTickets(json.data.tickets || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, []);

  return (
    <AdminLayout
      title="Support Tickets"
      subtitle="Operational incidents, complaints escalation, and tenant requests"
      actions={
        <button onClick={loadTickets} className="btn btn-outline btn-sm">
          <RefreshCw size={14} />
        </button>
      }
    >
      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Restaurant</th>
                <th>Subject</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
                    <LifeBuoy size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                    <div>All systems operational. No active customer support incidents.</div>
                  </td>
                </tr>
              ) : (
                tickets.map((t: any) => (
                  <tr key={t.id}>
                    <td><span className="code-pill">{t.id.slice(0, 8)}</span></td>
                    <td>{t.tenant.name}</td>
                    <td style={{ fontWeight: 600 }}>{t.title}</td>
                    <td><span className="badge badge-yellow">{t.priority}</span></td>
                    <td><StatusBadge status={t.status} /></td>
                    <td>{new Date(t.createdAt).toLocaleDateString()}</td>
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
