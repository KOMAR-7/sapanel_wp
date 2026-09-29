'use client';

import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import StatusBadge from '@/components/status/StatusBadge';
import { Cpu, RefreshCw, Cloud, Server, ShieldCheck, Database, Layers, Radio, HardDrive } from 'lucide-react';

interface AwsFoundation {
  status: string;
  region: string;
  ecs: string;
  rds: string;
  elasticache: string;
  s3: string;
  cloudwatch: string;
  environment: string;
}

export default function InfrastructurePage() {
  const [resources, setResources] = useState<any[]>([]);
  const [awsFoundation, setAwsFoundation] = useState<AwsFoundation>({
    status: 'Not Connected',
    region: 'ap-south-1',
    ecs: 'Not Provisioned',
    rds: 'Not Provisioned',
    elasticache: 'Not Provisioned',
    s3: 'Not Provisioned',
    cloudwatch: 'Not Connected',
    environment: 'development',
  });
  const [isLoading, setIsLoading] = useState(true);

  async function loadResources() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/infrastructure');
      if (res.ok) {
        const json = await res.json();
        setResources(json.data.resources || []);
        if (json.data.awsFoundation) {
          setAwsFoundation(json.data.awsFoundation);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadResources();
  }, []);

  return (
    <AdminLayout
      title="Platform Infrastructure & Compute"
      subtitle="Render, Vercel, and AWS container, caching, and database infrastructure resources"
      actions={
        <button onClick={loadResources} className="btn btn-outline btn-sm">
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      }
    >
      {/* Integrity Notice on honest metrics */}
      <div
        style={{
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
        }}
      >
        <ShieldCheck size={20} color="var(--brand-primary)" style={{ flexShrink: 0 }} />
        <div>
          <strong>Integrity Guarantee:</strong> RESTROCONNECT does not simulate or invent synthetic hardware metrics. Resources not yet provisioned in AWS are honestly displayed as <em>Not Connected</em> or <em>Not Provisioned</em>.
        </div>
      </div>

      {/* Step 6 — AWS Foundation Status Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '8px' }}>
            <Cloud size={16} color="#f59e0b" />
            <span>AWS Status</span>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: awsFoundation.status === 'Connected' ? '#10b981' : '#f59e0b' }}>
            {awsFoundation.status}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Region: {awsFoundation.region} (Mumbai)
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '8px' }}>
            <Server size={16} />
            <span>ECS Containers</span>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            {awsFoundation.ecs}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Fargate Cluster
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '8px' }}>
            <Database size={16} />
            <span>RDS PostgreSQL</span>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            {awsFoundation.rds}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Multi-AZ Database
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '8px' }}>
            <Layers size={16} />
            <span>ElastiCache</span>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            {awsFoundation.elasticache}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Redis In-Memory active
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '8px' }}>
            <HardDrive size={16} />
            <span>S3 Storage</span>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            {awsFoundation.s3}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Object Storage
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '8px' }}>
            <Radio size={16} />
            <span>CloudWatch</span>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            {awsFoundation.cloudwatch}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Metrics & Alarms
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Active & Registered Cloud Resources</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Tenant #1: Active on Render + Vercel
          </span>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Resource Type</th>
                <th>Provider</th>
                <th>Region</th>
                <th>Resource Identifier</th>
                <th>Tenant Assigned</th>
                <th>CPU / Alloc</th>
                <th>Memory</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((r: any) => (
                <tr key={r.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#fff' }}>{r.resourceType}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {r.statusMessage || ''}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${r.provider === 'AWS' ? 'badge-yellow' : r.provider === 'RENDER' ? 'badge-purple' : 'badge-blue'}`}>
                      {r.provider}
                    </span>
                  </td>
                  <td>{r.region}</td>
                  <td>
                    <span className="code-pill" style={{ fontSize: '0.75rem' }}>
                      {r.resourceIdentifier.length > 30 ? r.resourceIdentifier.slice(0, 30) + '...' : r.resourceIdentifier}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{r.tenantName || 'Platform Shared'}</span>
                  </td>
                  <td>{r.cpu || <span style={{ color: 'var(--text-muted)' }}>Not Connected</span>}</td>
                  <td>{r.memory || <span style={{ color: 'var(--text-muted)' }}>Not Connected</span>}</td>
                  <td>
                    <StatusBadge status={r.status} />
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
