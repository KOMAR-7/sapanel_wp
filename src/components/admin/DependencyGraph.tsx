'use client';

import React, { useState } from 'react';
import {
  Server,
  Globe,
  Database,
  MessageSquare,
  ShoppingBag,
  Zap,
  Cloud,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Info,
} from 'lucide-react';

interface DependencyNode {
  id: string;
  name: string;
  type: string;
  provider: string;
  status: string;
  details: string;
  impact: {
    resource: string;
    directlyAffected: string[];
    indirectlyAffected: string[];
    unaffected: string[];
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    recommendation: string;
  };
}

interface DependencyGraphProps {
  tenantName: string;
  tenantCode: string;
  isolationMode: string;
  dependencies: DependencyNode[];
}

export function DependencyGraph({
  tenantName,
  tenantCode,
  isolationMode,
  dependencies,
}: DependencyGraphProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string>(
    dependencies[1]?.id || dependencies[0]?.id || ''
  );

  const selectedNode = dependencies.find((d) => d.id === selectedNodeId) || dependencies[0];

  const getIcon = (type: string) => {
    switch (type) {
      case 'FRONTEND':
        return Globe;
      case 'DATABASE':
        return Database;
      case 'MESSAGING':
        return MessageSquare;
      case 'CATALOG':
        return ShoppingBag;
      case 'CACHE':
        return Zap;
      case 'CLOUD':
        return Cloud;
      default:
        return Server;
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
      {/* Visual Dependency Tree */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <Server size={18} color="var(--brand-primary)" />
              Infrastructure Resource Tree
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Isolated Data Plane topology for <strong>{tenantName}</strong> ({tenantCode})
            </p>
          </div>
          <span className="badge badge-blue">{isolationMode.replace(/_/g, ' ')}</span>
        </div>

        {/* Tree Root */}
        <div style={{ marginTop: '16px', position: 'relative' }}>
          <div
            style={{
              padding: '14px 18px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              boxShadow: '0 0 15px rgba(59, 130, 246, 0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'var(--brand-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                }}
              >
                <Server size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{tenantName}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Platform Tenant Root: {tenantCode}
                </div>
              </div>
            </div>
            <span className="badge badge-green">Dedicated Pod</span>
          </div>

          {/* Child Nodes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '24px', borderLeft: '2px dashed var(--border-medium)', marginLeft: '18px' }}>
            {dependencies.map((dep) => {
              const Icon = getIcon(dep.type);
              const isSelected = dep.id === selectedNodeId;

              return (
                <div
                  key={dep.id}
                  onClick={() => setSelectedNodeId(dep.id)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'var(--bg-elevated)' : 'var(--bg-app)',
                    border: isSelected ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 0 12px var(--brand-glow)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '6px',
                        background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isSelected ? 'var(--brand-primary)' : 'var(--text-secondary)',
                      }}
                    >
                      <Icon size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: isSelected ? '#fff' : 'var(--text-primary)' }}>
                        {dep.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {dep.provider} &bull; {dep.details}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`badge ${
                      dep.status === 'HEALTHY'
                        ? 'badge-green'
                        : dep.status === 'WARNING'
                        ? 'badge-yellow'
                        : dep.status === 'CRITICAL'
                        ? 'badge-red'
                        : 'badge-gray'
                    }`}
                  >
                    {dep.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Node Failure Impact Panel */}
      {selectedNode && (
        <div className="card" style={{ background: 'var(--bg-card)' }}>
          <div className="card-header">
            <h3 className="card-title">
              <AlertTriangle size={18} color="var(--status-yellow)" />
              Failure Impact Analysis
            </h3>
            <span
              className={`badge ${
                selectedNode.impact.severity === 'CRITICAL'
                  ? 'badge-red'
                  : selectedNode.impact.severity === 'HIGH'
                  ? 'badge-yellow'
                  : 'badge-blue'
              }`}
            >
              {selectedNode.impact.severity} IMPACT
            </span>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Simulating failure or network partition of{' '}
            <strong style={{ color: '#fff' }}>{selectedNode.name}</strong> ({selectedNode.provider}):
          </p>

          {/* Directly Affected */}
          <div style={{ marginBottom: '16px' }}>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: 'var(--status-red)',
                letterSpacing: '0.05em',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <AlertTriangle size={14} /> Directly Affected Components:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {selectedNode.impact.directlyAffected.map((item, i) => (
                <div
                  key={i}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--status-red-bg)',
                    border: '1px solid var(--status-red-border)',
                    fontSize: '0.8125rem',
                    color: '#fca5a5',
                  }}
                >
                  &bull; {item}
                </div>
              ))}
            </div>
          </div>

          {/* Indirectly Affected */}
          <div style={{ marginBottom: '16px' }}>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: 'var(--status-yellow)',
                letterSpacing: '0.05em',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Info size={14} /> Indirectly Affected:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {selectedNode.impact.indirectlyAffected.map((item, i) => (
                <div
                  key={i}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--status-yellow-bg)',
                    border: '1px solid var(--status-yellow-border)',
                    fontSize: '0.8125rem',
                    color: '#fcd34d',
                  }}
                >
                  &bull; {item}
                </div>
              ))}
            </div>
          </div>

          {/* Unaffected (Tenant Isolation Guarantee) */}
          <div style={{ marginBottom: '18px' }}>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: 'var(--status-green)',
                letterSpacing: '0.05em',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <ShieldCheck size={14} /> Completely Unaffected (Isolation):
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {selectedNode.impact.unaffected.map((item, i) => (
                <div
                  key={i}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--status-green-bg)',
                    border: '1px solid var(--status-green-border)',
                    fontSize: '0.8125rem',
                    color: '#86efac',
                  }}
                >
                  <CheckCircle2 size={13} style={{ display: 'inline', marginRight: '6px' }} />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Recommendation */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-medium)',
              fontSize: '0.8125rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.4,
            }}
          >
            <strong style={{ color: '#fff' }}>Mitigation Playbook:</strong> {selectedNode.impact.recommendation}
          </div>
        </div>
      )}
    </div>
  );
}

export default DependencyGraph;
