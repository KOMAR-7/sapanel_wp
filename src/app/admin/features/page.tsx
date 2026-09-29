'use client';

import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { ToggleRight, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function FeaturesPage() {
  const [features, setFeatures] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadFeatures() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/features');
      if (res.ok) {
        const json = await res.json();
        setFeatures(json.data.features || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadFeatures();
  }, []);

  return (
    <AdminLayout
      title="Platform Feature Registry"
      subtitle="Feature flags, module entitlements, and capability gates across all restaurants"
      actions={
        <button onClick={loadFeatures} className="btn btn-outline btn-sm">
          <RefreshCw size={14} />
        </button>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {features.map((f: any) => (
          <div key={f.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="code-pill">{f.key}</span>
                <span className="badge badge-green">Global Active</span>
              </div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>{f.name}</h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                {f.description}
              </p>
            </div>

            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>Category: <strong style={{ color: 'var(--brand-cyan)' }}>{f.category}</strong></span>
              <span>Per-tenant toggle supported</span>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
