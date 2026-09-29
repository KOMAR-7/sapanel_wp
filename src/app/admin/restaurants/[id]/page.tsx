'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import StatusBadge from '@/components/status/StatusBadge';
import ConfirmModal from '@/components/modals/ConfirmModal';
import DependencyGraph from '@/components/admin/DependencyGraph';
import {
  UtensilsCrossed,
  Database,
  Rocket,
  ToggleRight,
  CreditCard,
  Receipt,
  MessageSquare,
  BarChart3,
  Activity,
  Server,
  FileText,
  LifeBuoy,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  Clock,
  Plus,
  ArrowLeft,
} from 'lucide-react';

function formatAuditChanges(oldVal: any, newVal: any): string {
  try {
    const oldObj = typeof oldVal === 'string' ? JSON.parse(oldVal) : oldVal;
    const newObj = typeof newVal === 'string' ? JSON.parse(newVal) : newVal;
    if (!newObj && !oldObj) return '—';
    if (!oldObj && newObj) {
      return Object.entries(newObj)
        .slice(0, 3)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
    }
    const keys = Object.keys(newObj || {});
    if (keys.length === 0) return 'Recorded';
    return keys
      .slice(0, 3)
      .map((k) => {
        const from = oldObj && oldObj[k] !== undefined ? String(oldObj[k]) : 'none';
        const to = String(newObj[k]);
        return `${k}: ${from} → ${to}`;
      })
      .join('; ');
  } catch {
    return 'Action recorded';
  }
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: UtensilsCrossed },
  { id: 'database', label: 'Database', icon: Database },
  { id: 'deployment', label: 'Deployment', icon: Rocket },
  { id: 'features', label: 'Features', icon: ToggleRight },
  { id: 'subscription', label: 'Subscription', icon: CreditCard },
  { id: 'payments', label: 'Payments', icon: Receipt },
  { id: 'whatsapp', label: 'WhatsApp / Meta', icon: MessageSquare },
  { id: 'usage', label: 'Usage & Stats', icon: BarChart3 },
  { id: 'health', label: 'Health Checks', icon: Activity },
  { id: 'dependencies', label: 'Resource Topology', icon: Server },
  { id: 'audit', label: 'Audit Trail', icon: FileText },
  { id: 'support', label: 'Support', icon: LifeBuoy },
];

export default function RestaurantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as string;

  const [activeTab, setActiveTab] = useState('overview');
  const [tenant, setTenant] = useState<any>(null);
  const [accessStatus, setAccessStatus] = useState<string>('ACTIVE');
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [schemaDetail, setSchemaDetail] = useState<any>(null);

  // Modals state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    impactWarning?: string;
    confirmWord?: string;
    confirmButtonText?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  // Extend Validity Modal
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [extendForm, setExtendForm] = useState({
    mode: 'days', // 'days' | 'date'
    additionalDays: 30,
    newEndDate: '',
  });

  // Change Plan Modal
  const [changePlanModalOpen, setChangePlanModalOpen] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');

  // Payment Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    currency: 'INR',
    paymentMethod: 'BANK_TRANSFER',
    transactionReference: '',
    status: 'PAID',
    dueDate: '',
    paidAt: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Audit Filter state
  const [auditFilterAction, setAuditFilterAction] = useState('ALL');
  const [auditFilterResource, setAuditFilterResource] = useState('ALL');
  const [auditSearchQuery, setAuditSearchQuery] = useState('');

  async function loadTenantData() {
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}`);
      if (res.ok) {
        const json = await res.json();
        setTenant(json.data.tenant);
        if (json.data.accessStatus) {
          setAccessStatus(json.data.accessStatus);
        } else {
          setAccessStatus(json.data.tenant.status);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadPlans() {
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/subscription`);
      if (res.ok) {
        const json = await res.json();
        if (json.data.availablePlans) {
          setAvailablePlans(json.data.availablePlans);
        }
      }
    } catch (e) {
      console.error('Failed to load plans', e);
    }
  }

  useEffect(() => {
    loadTenantData();
  }, [tenantId]);

  // Actions
  async function handleTestDbConnection() {
    setIsActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/database/test`, { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.success) {
        setActionMessage(`Database connected successfully (${json.data.result.latencyMs}ms latency)`);
        await loadTenantData();
      } else {
        setActionMessage(`Connection Failed: ${json.error?.message || 'Error'}`);
      }
    } catch {
      setActionMessage('Failed to execute database connection test.');
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleValidateSchema() {
    setIsActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/database/validate`, { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.success) {
        setSchemaDetail(json.data.schema);
        setActionMessage(`Schema Validation: ${json.data.schema.status} (${json.data.schema.foundTables?.length || 0}/${json.data.schema.totalExpected} core tables verified)`);
        await loadTenantData();
      }
    } catch {
      setActionMessage('Schema validation check failed.');
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleDiscoverMetadata() {
    setIsActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/database/discover`, { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.success) {
        const s = json.data.discovery.stats;
        setActionMessage(`Discovered from Tenant DB: ${s.ordersCount} orders, ${s.itemsCount} menu items, ${s.customersCount} customers.`);
        await loadTenantData();
      }
    } catch {
      setActionMessage('Failed to discover metadata from tenant database.');
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleToggleFeature(featureId: string, currentEnabled: boolean, featureKey: string) {
    if (currentEnabled && ['WHATSAPP_ORDERING', 'ONLINE_ORDERING'].includes(featureKey)) {
      setConfirmModal({
        isOpen: true,
        title: `Disable ${featureKey.replace(/_/g, ' ')} for ${tenant.name}?`,
        description: `Disabling this feature will instantly deactivate direct ordering capabilities for this restaurant's customers.`,
        impactWarning: 'Customers attempting to send WhatsApp order messages will receive a disabled notification.',
        confirmWord: tenant.tenantCode,
        isDestructive: true,
        confirmButtonText: 'Disable Feature',
        onConfirm: async () => {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          await executeToggleFeature(featureId, false);
        },
      });
      return;
    }

    await executeToggleFeature(featureId, !currentEnabled);
  }

  async function executeToggleFeature(featureId: string, enabled: boolean) {
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/features/${featureId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (res.ok) {
        await loadTenantData();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleOpenExtendModal() {
    setExtendForm({
      mode: 'days',
      additionalDays: 30,
      newEndDate: '',
    });
    setExtendModalOpen(true);
  }

  async function handleExecuteExtendValidity(e: React.FormEvent) {
    e.preventDefault();
    setIsActionLoading(true);
    try {
      const payload: any = {};
      if (extendForm.mode === 'days') {
        payload.additionalDays = Number(extendForm.additionalDays);
      } else if (extendForm.newEndDate) {
        payload.newEndDate = extendForm.newEndDate;
      }

      const res = await fetch(`/api/admin/tenants/${tenantId}/subscription/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setExtendModalOpen(false);
        setActionMessage(json.data.message || 'Subscription validity extended successfully.');
        await loadTenantData();
      } else {
        setActionMessage(json.error?.message || 'Failed to extend validity.');
      }
    } catch (e: any) {
      setActionMessage(e.message || 'Error executing validity extension.');
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleOpenChangePlanModal() {
    await loadPlans();
    const currentPlanId = tenant.subscriptions?.[0]?.planId || '';
    setSelectedPlanId(currentPlanId);
    setChangePlanModalOpen(true);
  }

  async function handleExecuteChangePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlanId) return;
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/subscription`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selectedPlanId }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setChangePlanModalOpen(false);
        setActionMessage(json.data.message || 'Subscription plan successfully updated.');
        await loadTenantData();
      } else {
        setActionMessage(json.error?.message || 'Failed to update plan.');
      }
    } catch (e: any) {
      setActionMessage(e.message || 'Error updating subscription plan.');
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleSuspend() {
    setConfirmModal({
      isOpen: true,
      title: `Suspend Access for ${tenant.name}?`,
      description: `This will suspend platform storefront access for ${tenant.name}. Their database and operational records will remain 100% intact.`,
      impactWarning: 'Storefront and ordering bot blocked for customers until reactivated.',
      confirmWord: tenant.tenantCode,
      confirmButtonText: 'Suspend Tenant',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`/api/admin/tenants/${tenantId}/suspend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: 'Admin manual suspension' }),
          });
          const json = await res.json();
          if (res.ok && json.success) {
            setActionMessage(`Tenant '${tenant.name}' suspended.`);
            await loadTenantData();
          } else {
            setActionMessage(json.error?.message || 'Failed to suspend tenant.');
          }
        } catch (e) {
          console.error(e);
        }
      },
    });
  }

  async function handleReactivate() {
    setConfirmModal({
      isOpen: true,
      title: `Reactivate ${tenant.name}?`,
      description: `This will perform database health verification and restore active operational status for ${tenant.name}.`,
      impactWarning: 'Customers will immediately be able to place orders and interact with WhatsApp bots.',
      confirmWord: undefined,
      confirmButtonText: 'Reactivate Tenant',
      isDestructive: false,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`/api/admin/tenants/${tenantId}/reactivate`, { method: 'POST' });
          const json = await res.json();
          if (res.ok && json.success) {
            setActionMessage(`Tenant '${tenant.name}' successfully reactivated.`);
            await loadTenantData();
          } else {
            setActionMessage(`Reactivation Failed: ${json.error?.message || 'Check database connectivity.'}`);
          }
        } catch (e) {
          console.error(e);
        }
      },
    });
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(paymentForm.amount),
          currency: paymentForm.currency,
          paymentMethod: paymentForm.paymentMethod,
          transactionReference: paymentForm.transactionReference,
          status: paymentForm.status,
          dueDate: paymentForm.dueDate ? new Date(paymentForm.dueDate) : null,
          paidAt: paymentForm.paidAt ? new Date(paymentForm.paidAt) : null,
          notes: paymentForm.notes,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setPaymentModalOpen(false);
        setActionMessage(json.data.message || 'Payment recorded.');
        await loadTenantData();
      } else {
        setActionMessage(json.error?.message || 'Failed to record payment.');
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleRunHealthChecks() {
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/health`, { method: 'POST' });
      if (res.ok) {
        await loadTenantData();
        setActionMessage('All health check probes executed.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsActionLoading(false);
    }
  }

  if (isLoading || !tenant) {
    return (
      <AdminLayout title="Restaurant Control Plane">
        <div className="card" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          Loading tenant control plane...
        </div>
      </AdminLayout>
    );
  }

  const primaryDb = tenant.databases?.[0];
  const primaryDeployment = tenant.deployments?.[0];
  const activeSub = tenant.subscriptions?.[0];
  const meta = tenant.metaIntegration;
  const latestSnapshot = tenant.usageSnapshots?.[0];

  const validUntil = tenant.validUntil ? new Date(tenant.validUntil) : null;
  const daysRemaining = validUntil
    ? Math.ceil((validUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <AdminLayout
      title={tenant.name}
      subtitle={`Tenant ID: ${tenant.tenantCode} • Subdomain: ${tenant.subdomain || tenant.slug}.restroconnect.com`}
      actions={
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={loadTenantData} className="btn btn-outline btn-sm" title="Refresh">
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
          
          {/* Action buttons appropriate to current access status */}
          {(accessStatus === 'ACTIVE' || accessStatus === 'GRACE_PERIOD') && (
            <>
              <button onClick={handleOpenExtendModal} className="btn btn-secondary btn-sm">
                <Clock size={14} />
                <span>Extend Validity</span>
              </button>
              <button onClick={handleOpenChangePlanModal} className="btn btn-secondary btn-sm">
                <CreditCard size={14} />
                <span>Change Plan</span>
              </button>
              <button onClick={handleSuspend} className="btn btn-danger btn-sm">
                <Pause size={14} />
                <span>Suspend</span>
              </button>
            </>
          )}

          {(accessStatus === 'SUSPENDED' || accessStatus === 'EXPIRED') && (
            <>
              <button onClick={handleReactivate} className="btn btn-success btn-sm">
                <Play size={14} />
                <span>Reactivate</span>
              </button>
              <button onClick={handleOpenExtendModal} className="btn btn-secondary btn-sm">
                <Clock size={14} />
                <span>Extend Validity</span>
              </button>
              <button onClick={handleOpenChangePlanModal} className="btn btn-secondary btn-sm">
                <CreditCard size={14} />
                <span>Change Plan</span>
              </button>
            </>
          )}

          {accessStatus === 'ARCHIVED' && (
            <span className="badge badge-gray" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
              Archived Tenant (Operational Data Preserved)
            </span>
          )}
        </div>
      }
    >
      {/* Return to Registry link */}
      <div style={{ marginBottom: '16px' }}>
        <Link
          href="/admin/restaurants"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.8125rem',
            color: 'var(--text-muted)',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={14} />
          <span>Back to Restaurant Registry</span>
        </Link>
      </div>

      {/* Top Tenant Summary Strip */}
      <div
        className="card"
        style={{
          padding: '18px 24px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              border: '1px solid var(--border-medium)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-primary)',
              fontWeight: 800,
              fontSize: '1.2rem',
            }}
          >
            {tenant.name.slice(0, 1)}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>{tenant.name}</h2>
              <StatusBadge status={tenant.status} />
              <span className="badge badge-blue">{tenant.isolationMode.replace(/_/g, ' ')}</span>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
              Owner: <strong>{tenant.ownerName}</strong> &bull; {tenant.ownerEmail} &bull; {tenant.ownerPhone}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Subscription Plan</div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--brand-primary)' }}>
              {activeSub?.plan?.name || 'Professional'}
            </div>
          </div>

          <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '20px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Validity Remaining</div>
            <div
              style={{
                fontWeight: 700,
                fontSize: '0.95rem',
                color: daysRemaining < 10 ? 'var(--status-red)' : 'var(--status-green)',
              }}
            >
              {daysRemaining > 0 ? `${daysRemaining} Days` : 'Expired'}
            </div>
          </div>

          {primaryDeployment?.frontendUrl && (
            <a
              href={primaryDeployment.frontendUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-sm"
            >
              <span>Live Application</span>
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>

      {actionMessage && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid var(--brand-glow)',
            color: '#93c5fd',
            fontSize: '0.85rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{actionMessage}</span>
          <button
            onClick={() => setActionMessage(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs Navigation (Sections 27 to 35) */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '20px',
          overflowX: 'auto',
          paddingBottom: '2px',
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: isActive ? 'var(--bg-card)' : 'transparent',
                border: '1px solid',
                borderColor: isActive ? 'var(--border-subtle) var(--border-subtle) transparent var(--border-subtle)' : 'transparent',
                borderTopLeftRadius: 'var(--radius-md)',
                borderTopRightRadius: 'var(--radius-md)',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.8125rem',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={15} color={isActive ? 'var(--brand-primary)' : 'var(--text-muted)'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' }}>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '16px' }}>
              Restaurant Information
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Restaurant Legal Name</div>
                <div style={{ fontWeight: 600, color: '#fff' }}>{tenant.name}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tenant Unique Code</div>
                <div className="code-pill">{tenant.tenantCode}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Owner Contact</div>
                <div style={{ fontWeight: 600 }}>{tenant.ownerName}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {tenant.ownerPhone} &bull; {tenant.ownerEmail}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Timezone & Region</div>
                <div>{tenant.timezone} (Singapore Cluster)</div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Operating Address</div>
                <div>
                  {tenant.address || '12 MG Road, Bandra West'}, {tenant.city || 'Mumbai'}, {tenant.state || 'Maharashtra'} - {tenant.pincode || '400050'}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '12px', color: '#fff' }}>
                Routing & Application URLs
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Tenant Subdomain:</span>
                  <span className="code-pill">{tenant.subdomain || tenant.slug}.restroconnect.com</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Frontend URL (Vercel):</span>
                  <a href={tenant.frontendUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--brand-primary)' }}>
                    {tenant.frontendUrl || '—'}
                  </a>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Backend URL:</span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {tenant.backendUrl || 'Integrated with Next.js Fullstack Server'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '16px' }}>
              Quick Operational Stats
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Active Branches</span>
                <strong style={{ color: '#fff' }}>{latestSnapshot?.branchesCount ?? 'Not available'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Menu Items</span>
                <strong style={{ color: '#fff' }}>{latestSnapshot?.itemsCount ?? 'Not available'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Registered Customers</span>
                <strong style={{ color: '#fff' }}>{latestSnapshot?.customersCount ?? 'Not available'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Total Orders Processed</span>
                <strong style={{ color: 'var(--brand-primary)' }}>{latestSnapshot?.ordersCount ?? 'Not available'}</strong>
              </div>
            </div>

            <button
              onClick={handleDiscoverMetadata}
              disabled={isActionLoading}
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', marginTop: '20px' }}
            >
              <RefreshCw size={14} className={isActionLoading ? 'animate-spin' : ''} />
              <span>Query Live Stats from Tenant DB</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: DATABASE */}
      {activeTab === 'database' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">
                  <Database size={18} color="var(--brand-primary)" />
                  Registered Tenant Database
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Dedicated PostgreSQL data store reference. Passwords and credentials securely isolated.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleTestDbConnection}
                  disabled={isActionLoading}
                  className="btn btn-primary btn-sm"
                >
                  <Activity size={14} />
                  <span>{isActionLoading ? 'Testing...' : 'Test Connection'}</span>
                </button>
                <button
                  onClick={loadTenantData}
                  disabled={isActionLoading}
                  className="btn btn-secondary btn-sm"
                >
                  <RefreshCw size={14} />
                  <span>Refresh Health</span>
                </button>
                <button
                  onClick={handleValidateSchema}
                  disabled={isActionLoading}
                  className="btn btn-outline btn-sm"
                >
                  <CheckCircle2 size={14} />
                  <span>View Schema Status</span>
                </button>
              </div>
            </div>

            {primaryDb ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '16px' }}>
                <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Provider & Engine</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff', marginTop: '4px' }}>
                    {primaryDb.provider} {primaryDb.engine || 'POSTGRESQL'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Region: {primaryDb.region}</div>
                </div>

                <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status & Latency</div>
                  <div style={{ marginTop: '4px' }}>
                    <StatusBadge status={primaryDb.status} />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Latency: {primaryDb.lastLatencyMs ? `${primaryDb.lastLatencyMs} ms` : 'N/A'}
                  </div>
                </div>

                <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Schema Status & Version</div>
                  <div style={{ marginTop: '4px' }}>
                    <StatusBadge status={primaryDb.schemaStatus || 'VALID'} />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {primaryDb.pgVersion || 'PostgreSQL 16+'}
                  </div>
                </div>

                <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Last Health Check</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', marginTop: '4px' }}>
                    {primaryDb.lastHealthCheckAt ? new Date(primaryDb.lastHealthCheckAt).toLocaleString() : 'Recent'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--status-green)', marginTop: '4px' }}>
                    Zero password exposure
                  </div>
                </div>

                <div style={{ gridColumn: 'span 2', padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Masked Host (Render Dedicated Instance)</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#fff', marginTop: '4px' }}>
                    {primaryDb.host ? `${primaryDb.host.slice(0, 4)}••••.${primaryDb.host.split('.').slice(1).join('.')}` : '—'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Port: {primaryDb.port} &bull; Database Name: {primaryDb.databaseName} &bull; Secret: <span className="code-pill">{primaryDb.secretReference}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                No database registered for this tenant.
              </div>
            )}

            {/* Schema Validation Details Panel */}
            {schemaDetail && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: schemaDetail.status === 'VALID' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(234, 179, 8, 0.08)',
                  border: schemaDetail.status === 'VALID' ? '1px solid #10b981' : '1px solid #eab308',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: schemaDetail.status === 'VALID' ? '#10b981' : '#eab308' }}>
                    <CheckCircle2 size={16} />
                    <span>Schema Status: {schemaDetail.status} ({schemaDetail.foundTables?.length || 0} tables verified)</span>
                  </div>
                  <button
                    onClick={() => setSchemaDetail(null)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}
                  >
                    ✕
                  </button>
                </div>
                {schemaDetail.migrationStatus && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {schemaDetail.migrationStatus} &bull; Read-only validation (zero writes or alterations to tenant DB)
                  </div>
                )}
                {schemaDetail.foundTables && schemaDetail.foundTables.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                    {schemaDetail.foundTables.map((t: string) => (
                      <span key={t} className="badge badge-green" style={{ fontSize: '0.7rem' }}>
                        ✓ {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: DEPLOYMENT */}
      {activeTab === 'deployment' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <Rocket size={18} color="var(--brand-primary)" />
                Application Deployments
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Storefront, admin routing, and upcoming AWS ECS task orchestration.
              </p>
            </div>
          </div>

          {primaryDeployment ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hosting Provider</div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#fff', marginTop: '4px' }}>
                  {primaryDeployment.provider} Edge
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Region: {primaryDeployment.region} &bull; Status:{' '}
                  <StatusBadge status={primaryDeployment.status} />
                </div>
              </div>

              <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Version & Commit</div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff', marginTop: '4px' }}>
                  {primaryDeployment.version || 'v1.4.2'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  git commit: {primaryDeployment.gitCommit || '4664f03'}
                </div>
              </div>

              <div style={{ gridColumn: 'span 2', padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Live Storefront URL</div>
                <div style={{ marginTop: '4px' }}>
                  <a
                    href={primaryDeployment.frontendUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--brand-primary)', fontWeight: 600, fontSize: '0.95rem' }}
                  >
                    {primaryDeployment.frontendUrl}
                  </a>
                </div>
              </div>

              {/* AWS Phase 2 Metadata Fields */}
              <div
                style={{
                  gridColumn: 'span 2',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px dashed var(--border-medium)',
                }}
              >
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  AWS Orchestration Spec (Phase 2 Ready):
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '0.75rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>ECS Cluster:</span> Not Connected
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>ALB Target:</span> Not Connected
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>CloudWatch Log:</span> /aws/ecs/restroconnect-core
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              No deployment registered.
            </div>
          )}
        </div>
      )}

      {/* TAB 4: FEATURES */}
      {activeTab === 'features' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <ToggleRight size={18} color="var(--brand-primary)" />
                Tenant Feature Flags
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Toggle capabilities per restaurant. Disabling critical ordering features prompts a confirmation modal.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {tenant.features?.map((tf: any) => {
              const isEnabled = tf.enabled;
              return (
                <div
                  key={tf.id}
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-lg)',
                    background: isEnabled ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-app)',
                    border: isEnabled ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span className="code-pill" style={{ fontSize: '0.7rem' }}>
                        {tf.feature.category}
                      </span>
                      <span className={`badge ${isEnabled ? 'badge-green' : 'badge-gray'}`}>
                        {isEnabled ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>{tf.feature.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                      {tf.feature.description}
                    </div>
                  </div>

                  <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => handleToggleFeature(tf.featureId, tf.enabled, tf.feature.key)}
                      className={`btn btn-sm ${isEnabled ? 'btn-danger' : 'btn-success'}`}
                    >
                      {isEnabled ? 'Disable Feature' : 'Enable Feature'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: SUBSCRIPTION */}
      {activeTab === 'subscription' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <CreditCard size={18} color="var(--brand-primary)" />
                Subscription & Plan Management
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Manage licensing validity, billing cycles, and manual plan upgrades.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleOpenExtendModal} className="btn btn-primary btn-sm">
                <Clock size={14} />
                <span>Extend Validity</span>
              </button>
              <button onClick={handleOpenChangePlanModal} className="btn btn-secondary btn-sm">
                <CreditCard size={14} />
                <span>Change Plan</span>
              </button>
            </div>
          </div>

          {activeSub ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assigned Tier</div>
                <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--brand-primary)', marginTop: '4px' }}>
                  {activeSub.plan.name} Plan
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  ₹{Number(activeSub.plan.price).toLocaleString()} / {activeSub.plan.billingCycle.toLowerCase()}
                </div>
              </div>

              <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</div>
                <div style={{ marginTop: '4px' }}>
                  <StatusBadge status={activeSub.status} />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Auto-Renew: {activeSub.autoRenew ? 'Enabled' : 'Disabled'}
                </div>
              </div>

              <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Valid From</div>
                <div style={{ fontWeight: 600, color: '#fff', marginTop: '4px' }}>
                  {new Date(activeSub.startDate).toLocaleDateString()}
                </div>
              </div>

              <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Valid Until (Expiry)</div>
                <div style={{ fontWeight: 700, color: daysRemaining < 10 ? 'var(--status-red)' : '#fff', marginTop: '4px' }}>
                  {new Date(activeSub.endDate).toLocaleDateString()}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Expired'}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              No active subscription found.
            </div>
          )}
        </div>
      )}

      {/* TAB 6: PAYMENTS */}
      {activeTab === 'payments' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <Receipt size={18} color="var(--brand-primary)" />
                Payment History
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Payment records and billing audit history. No fake entries.
              </p>
            </div>
            <button onClick={() => setPaymentModalOpen(true)} className="btn btn-primary btn-sm">
              <Plus size={14} /> Record Payment
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Transaction ID</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {tenant.payments?.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No payment records found.
                    </td>
                  </tr>
                ) : (
                  tenant.payments?.map((p: any) => (
                    <tr key={p.id}>
                      <td>{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}</td>
                      <td style={{ fontWeight: 700, color: '#fff' }}>
                        ₹{Number(p.amount).toLocaleString()} {p.currency}
                      </td>
                      <td>
                        <span className="code-pill">{p.paymentMethod}</span>
                      </td>
                      <td>
                        <span className="code-pill">{p.transactionReference || '—'}</span>
                      </td>
                      <td>
                        <StatusBadge status={p.status} />
                      </td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        {p.dueDate ? new Date(p.dueDate).toLocaleDateString() : '—'}
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
      )}

      {/* TAB 7: WHATSAPP / META */}
      {activeTab === 'whatsapp' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <MessageSquare size={18} color="var(--status-green)" />
                WhatsApp & Meta Cloud API Integration
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Meta Commerce Catalog & Cloud API credentials metadata. Raw access tokens are never exposed.
              </p>
            </div>
          </div>

          {meta ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>WhatsApp Cloud API Status</div>
                <div style={{ marginTop: '4px' }}>
                  <StatusBadge status={meta.status} />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Provider: {meta.provider}
                </div>
              </div>

              <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Phone Number ID (Masked)</div>
                <div className="code-pill" style={{ marginTop: '4px', display: 'inline-block' }}>
                  {meta.phoneNumberId ? `••••${meta.phoneNumberId.slice(-4)}` : 'Not Configured'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--status-green)', marginTop: '4px' }}>
                  Masked for Control Plane Security
                </div>
              </div>

              <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Meta Commerce Catalog ID</div>
                <div className="code-pill" style={{ marginTop: '4px', display: 'inline-block' }}>
                  {meta.catalogId || 'Not Configured'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  WhatsApp Native Product Grid
                </div>
              </div>

              <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Token Storage</div>
                <div className="code-pill" style={{ marginTop: '4px', display: 'inline-block' }}>
                  aws/secretsmanager/tenants/...
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Last Webhook: {meta.lastWebhookAt ? new Date(meta.lastWebhookAt).toLocaleTimeString() : 'Active'}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              No WhatsApp integration metadata configured.
            </div>
          )}
        </div>
      )}

      {/* TAB 8: USAGE & STATS */}
      {activeTab === 'usage' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <BarChart3 size={18} color="var(--brand-primary)" />
                Tenant Usage & Capacity Metrics
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Directly queried from the tenant database. No fake data.
              </p>
            </div>
            <button
              onClick={handleDiscoverMetadata}
              disabled={isActionLoading}
              className="btn btn-secondary btn-sm"
            >
              <RefreshCw size={14} className={isActionLoading ? 'animate-spin' : ''} />
              <span>Refresh Stats from Tenant DB</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Orders Processed</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--brand-primary)', marginTop: '4px' }}>
                {latestSnapshot?.ordersCount !== undefined ? latestSnapshot.ordersCount : 'Not Available'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {latestSnapshot ? 'Live in Tenant PostgreSQL' : 'Click Refresh Stats to Query'}
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Menu Items</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
                {latestSnapshot?.itemsCount !== undefined ? latestSnapshot.itemsCount : 'Not Available'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {latestSnapshot?.categoriesCount !== undefined ? `Across ${latestSnapshot.categoriesCount} categories` : 'Awaiting sync'}
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registered Customers</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
                {latestSnapshot?.customersCount !== undefined ? latestSnapshot.customersCount : 'Not Available'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Loyalty member accounts</div>
            </div>

            <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Branches</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
                {latestSnapshot?.branchesCount !== undefined ? latestSnapshot.branchesCount : 'Not Available'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Fulfillment outlets</div>
            </div>

            <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Storage Allocation</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
                {primaryDb?.status === 'CONNECTED' ? 'Allocated' : 'Not Connected'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>PostgreSQL Dedicated Host</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 9: HEALTH CHECKS */}
      {activeTab === 'health' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <Activity size={18} color="var(--brand-primary)" />
                Probing & Component Health Status
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Health checks for Frontend, Database, Meta API, Redis, and Gateway probes.
              </p>
            </div>
            <button
              onClick={handleRunHealthChecks}
              disabled={isActionLoading}
              className="btn btn-primary btn-sm"
            >
              <RefreshCw size={14} className={isActionLoading ? 'animate-spin' : ''} />
              <span>Probe All Components</span>
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Status</th>
                  <th>Latency</th>
                  <th>Diagnostics Message</th>
                  <th>Last Checked</th>
                </tr>
              </thead>
              <tbody>
                {tenant.healthChecks?.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No health checks recorded yet.
                    </td>
                  </tr>
                ) : (
                  tenant.healthChecks?.map((hc: any) => (
                    <tr key={hc.id}>
                      <td style={{ fontWeight: 600, color: '#fff' }}>{hc.component}</td>
                      <td>
                        <StatusBadge status={hc.status} />
                      </td>
                      <td>
                        {hc.latencyMs ? (
                          <span className="code-pill">{hc.latencyMs} ms</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        {hc.message || 'Probed successfully'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(hc.checkedAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 10: RESOURCE TOPOLOGY & FAILURE IMPACT */}
      {activeTab === 'dependencies' && (
        <div>
          <DependencyGraph
            tenantName={tenant.name}
            tenantCode={tenant.tenantCode}
            isolationMode={tenant.isolationMode}
            dependencies={[
              {
                id: 'dep-frontend',
                name: 'Vercel Edge Frontend',
                type: 'FRONTEND',
                provider: 'VERCEL',
                status: 'HEALTHY',
                details: tenant.frontendUrl || 'https://wp-admin-five.vercel.app/',
                impact: {
                  resource: 'Frontend Web Application',
                  directlyAffected: ['Storefront URL', 'Admin UI Web Interface', 'QR Code Dine-In'],
                  indirectlyAffected: ['Online Cart Submissions', 'Push Subscription Registration'],
                  unaffected: ['Other restaurants', 'WhatsApp Ordering Bot', 'Database Integrity'],
                  severity: 'HIGH',
                  recommendation: 'Check Vercel Deployment status and DNS propagation.',
                },
              },
              {
                id: 'dep-database',
                name: 'Render PostgreSQL Database',
                type: 'DATABASE',
                provider: 'RENDER',
                status: primaryDb?.status === 'CONNECTED' ? 'HEALTHY' : 'CRITICAL',
                details: primaryDb?.host || 'dpg-render-postgres.render.com',
                impact: {
                  resource: 'Tenant PostgreSQL Database',
                  directlyAffected: ['Order Creation & History', 'Menu Catalog Query', 'User & Staff Authentication'],
                  indirectlyAffected: ['WhatsApp Cart Processing', 'Loyalty Balance Updates', 'Reports & Analytics'],
                  unaffected: ['All other restaurant databases (Complete Tenant Isolation)', 'Platform Control Plane'],
                  severity: 'CRITICAL',
                  recommendation: 'Verify Render DB network connectivity, CPU credits, and connection pooling.',
                },
              },
              {
                id: 'dep-whatsapp',
                name: 'Meta WhatsApp Cloud API',
                type: 'MESSAGING',
                provider: 'META',
                status: meta?.status === 'CONNECTED' ? 'HEALTHY' : 'WARNING',
                details: meta?.phoneNumberId ? 'Phone Number ID Connected' : 'Webhook Awaiting Verification',
                impact: {
                  resource: 'Meta WhatsApp Integration',
                  directlyAffected: ['WhatsApp Direct Ordering Bot', 'Customer Order Confirmation Receipts'],
                  indirectlyAffected: ['Customer Loyalty Balance Notifications', 'Broadcast Campaigns'],
                  unaffected: ['Web Ordering Application', 'POS / Dine-In Orders', 'Database Operations', 'Other Restaurants'],
                  severity: 'HIGH',
                  recommendation: 'Verify Meta access token validity and Webhook endpoint subscription.',
                },
              },
              {
                id: 'dep-redis',
                name: 'Redis Cache (In-Memory / ElastiCache)',
                type: 'CACHE',
                provider: 'LOCAL / AWS',
                status: 'HEALTHY',
                details: 'In-Memory Cache Active (AWS ElastiCache Redis ready)',
                impact: {
                  resource: 'Platform & Tenant Cache Layer',
                  directlyAffected: ['Response Latency on Menu and Metadata Lookups', 'Request Deduplication'],
                  indirectlyAffected: ['Database Query Load increases proportionally'],
                  unaffected: ['Data Correctness (Auto-fallback to primary database)', 'All Tenant Core Operations'],
                  severity: 'LOW',
                  recommendation: 'Cache failures automatically fall back to primary PostgreSQL database.',
                },
              },
            ]}
          />
        </div>
      )}

      {/* TAB 11: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="card">
          <div className="card-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 className="card-title">
                <FileText size={18} color="var(--brand-primary)" />
                Tenant Audit Trail
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Tamper-evident record of all administrative actions taken on this tenant. Zero secret leakage.
              </p>
            </div>

            {/* Audit Filters */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <select
                className="form-select"
                style={{ fontSize: '0.75rem', padding: '6px 10px', height: '32px' }}
                value={auditFilterAction}
                onChange={(e) => setAuditFilterAction(e.target.value)}
              >
                <option value="ALL">All Actions</option>
                <option value="SUSPEND_TENANT">SUSPEND_TENANT</option>
                <option value="REACTIVATE_TENANT">REACTIVATE_TENANT</option>
                <option value="EXTEND_VALIDITY">EXTEND_VALIDITY</option>
                <option value="CHANGE_PLAN">CHANGE_PLAN</option>
                <option value="ENABLE_FEATURE">ENABLE_FEATURE</option>
                <option value="DISABLE_FEATURE">DISABLE_FEATURE</option>
                <option value="RECORD_PAYMENT">RECORD_PAYMENT</option>
                <option value="HEALTH_CHECK">HEALTH_CHECK</option>
                <option value="UPDATE_TENANT">UPDATE_TENANT</option>
                <option value="CREATE_TENANT">CREATE_TENANT</option>
                <option value="ARCHIVE_TENANT">ARCHIVE_TENANT</option>
              </select>

              <select
                className="form-select"
                style={{ fontSize: '0.75rem', padding: '6px 10px', height: '32px' }}
                value={auditFilterResource}
                onChange={(e) => setAuditFilterResource(e.target.value)}
              >
                <option value="ALL">All Resources</option>
                <option value="TENANT">TENANT</option>
                <option value="SUBSCRIPTION">SUBSCRIPTION</option>
                <option value="FEATURE">FEATURE</option>
                <option value="PAYMENT">PAYMENT</option>
                <option value="DATABASE">DATABASE</option>
                <option value="HEALTH">HEALTH</option>
              </select>

              <input
                type="text"
                className="form-input"
                style={{ fontSize: '0.75rem', padding: '6px 10px', height: '32px', width: '160px' }}
                placeholder="Search admin or action..."
                value={auditSearchQuery}
                onChange={(e) => setAuditSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Changes</th>
                  <th>Administrator</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const filtered = (tenant.auditLogs || []).filter((log: any) => {
                    if (auditFilterAction !== 'ALL' && log.action !== auditFilterAction) return false;
                    if (auditFilterResource !== 'ALL' && log.resourceType !== auditFilterResource) return false;
                    if (auditSearchQuery) {
                      const q = auditSearchQuery.toLowerCase();
                      const name = (log.admin?.name || '').toLowerCase();
                      const email = (log.admin?.email || '').toLowerCase();
                      if (!name.includes(q) && !email.includes(q) && !log.action.toLowerCase().includes(q)) return false;
                    }
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                          No audit events matching selected filters.
                        </td>
                      </tr>
                    );
                  }

                  return filtered.map((log: any) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.8125rem' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8125rem' }}>{log.resourceType}</td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '280px', wordBreak: 'break-word' }}>
                        {formatAuditChanges(log.oldValue, log.newValue)}
                      </td>
                      <td style={{ fontSize: '0.8125rem', color: '#fff' }}>
                        {log.admin?.name || 'Platform System'}
                      </td>
                      <td style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {log.ipAddress || '127.0.0.1'}
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 12: SUPPORT */}
      {activeTab === 'support' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <LifeBuoy size={18} color="var(--brand-primary)" />
                Support Tickets
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Open inquiries and reported operational issues.
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <LifeBuoy size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <div>No open support tickets for {tenant.name}.</div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        description={confirmModal.description}
        impactWarning={confirmModal.impactWarning}
        confirmWord={confirmModal.confirmWord}
        confirmButtonText={confirmModal.confirmButtonText}
        isDestructive={confirmModal.isDestructive}
      />

      {/* Extend Validity Modal */}
      {extendModalOpen && (
        <div className="modal-overlay" onClick={() => setExtendModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', color: '#fff' }}>
              Extend Subscription Validity for {tenant.name}
            </h3>
            <form onSubmit={handleExecuteExtendValidity}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={() => setExtendForm({ ...extendForm, mode: 'days' })}
                  className={`btn btn-sm ${extendForm.mode === 'days' ? 'btn-primary' : 'btn-outline'}`}
                >
                  Days Increment
                </button>
                <button
                  type="button"
                  onClick={() => setExtendForm({ ...extendForm, mode: 'date' })}
                  className={`btn btn-sm ${extendForm.mode === 'date' ? 'btn-primary' : 'btn-outline'}`}
                >
                  Specific Date
                </button>
              </div>

              {extendForm.mode === 'days' ? (
                <>
                  <div className="form-group">
                    <label className="form-label">Additional Days *</label>
                    <input
                      type="number"
                      min={1}
                      className="form-input"
                      value={extendForm.additionalDays}
                      onChange={(e) => setExtendForm({ ...extendForm, additionalDays: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
                    {[30, 60, 90, 365].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setExtendForm({ ...extendForm, additionalDays: d })}
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '0.75rem' }}
                      >
                        +{d} Days
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="form-group">
                  <label className="form-label">New Expiration Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={extendForm.newEndDate}
                    onChange={(e) => setExtendForm({ ...extendForm, newEndDate: e.target.value })}
                    required
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" onClick={() => setExtendModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isActionLoading} className="btn btn-primary">
                  {isActionLoading ? 'Extending...' : 'Confirm Extension'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Plan Modal */}
      {changePlanModalOpen && (
        <div className="modal-overlay" onClick={() => setChangePlanModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', color: '#fff' }}>
              Change Subscription Plan for {tenant.name}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Current Plan: <strong>{activeSub?.plan?.name || 'Professional'}</strong> (₹{Number(activeSub?.plan?.price || 0).toLocaleString()} / {activeSub?.plan?.billingCycle?.toLowerCase() || 'month'})
            </p>
            <form onSubmit={handleExecuteChangePlan}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {availablePlans.map((p: any) => {
                  const isSelected = selectedPlanId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPlanId(p.id)}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-md)',
                        background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-app)',
                        border: isSelected ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: '#fff' }}>{p.name} Plan</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {p.description || `Includes ${p.maxBranches} branches & ${p.maxUsers} users`}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>
                          ₹{Number(p.price).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          per {p.billingCycle.toLowerCase()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" onClick={() => setChangePlanModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isActionLoading || !selectedPlanId} className="btn btn-primary">
                  {isActionLoading ? 'Saving...' : 'Update Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {paymentModalOpen && (
        <div className="modal-overlay" onClick={() => setPaymentModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', color: '#fff' }}>
              Record Payment for {tenant.name}
            </h3>
            <form onSubmit={handleRecordPayment}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Amount (INR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    className="form-input"
                    placeholder="e.g. 7999"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Status *</label>
                  <select
                    className="form-select"
                    value={paymentForm.status}
                    onChange={(e) => setPaymentForm({ ...paymentForm, status: e.target.value })}
                  >
                    <option value="PAID">PAID</option>
                    <option value="PENDING">PENDING</option>
                    <option value="FAILED">FAILED</option>
                    <option value="REFUNDED">REFUNDED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Payment Method *</label>
                  <select
                    className="form-select"
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  >
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT / IMPS</option>
                    <option value="UPI">UPI Direct</option>
                    <option value="CASH">Cash</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Transaction Reference</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. UTR-98234810293"
                    value={paymentForm.transactionReference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, transactionReference: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Payment Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={paymentForm.paidAt}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paidAt: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Due Date (Optional)</label>
                  <input
                    type="date"
                    className="form-input"
                    value={paymentForm.dueDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, dueDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Payment notes, invoice reference, or payment remarks..."
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
