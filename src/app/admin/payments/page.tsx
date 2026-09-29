'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import StatusBadge from '@/components/status/StatusBadge';
import { Receipt, RefreshCw, Download } from 'lucide-react';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadPayments() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/payments');
      if (res.ok) {
        const json = await res.json();
        setPayments(json.data.payments || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPayments();
  }, []);

  const totalRevenue = payments
    .filter((p) => p.status === 'PAID')
    .reduce((acc, p) => acc + (p.amount || 0), 0);

  return (
    <AdminLayout
      title="Platform Payments Ledger"
      subtitle="Financial records, subscription collections, and manual transaction tracking"
      actions={
        <button onClick={loadPayments} className="btn btn-outline btn-sm">
          <RefreshCw size={14} />
        </button>
      }
    >
      {/* Revenue Summary Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card">
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Total Collections
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--status-green)', marginTop: '4px' }}>
            ₹{totalRevenue.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>From recorded payments</div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Total Transactions
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
            {payments.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>All time</div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Receipt size={18} color="var(--brand-primary)" />
            Payment History Ledger
          </h3>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Restaurant</th>
                <th>Tenant ID</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Reference ID</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No payment records found.
                  </td>
                </tr>
              ) : (
                payments.map((p: any) => (
                  <tr key={p.id}>
                    <td style={{ fontSize: '0.8125rem' }}>
                      {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <Link href={`/admin/restaurants/${p.tenant.id}`} style={{ fontWeight: 600, color: '#fff', textDecoration: 'none' }}>
                        {p.tenant.name}
                      </Link>
                    </td>
                    <td>
                      <span className="code-pill">{p.tenant.tenantCode}</span>
                    </td>
                    <td style={{ fontWeight: 700, color: '#fff' }}>
                      ₹{p.amount.toLocaleString()} {p.currency}
                    </td>
                    <td>
                      <span className="code-pill">{p.paymentMethod}</span>
                    </td>
                    <td>
                      <span className="code-pill">{p.transactionReference}</span>
                    </td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      {p.notes || '—'}
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
