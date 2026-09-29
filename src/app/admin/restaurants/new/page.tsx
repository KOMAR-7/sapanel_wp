'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  UtensilsCrossed,
  Sliders,
  Database,
  Globe,
  Server,
  CreditCard,
  ToggleRight,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Check,
  Activity,
  Search,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Info,
} from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Restaurant Info', icon: UtensilsCrossed },
  { id: 2, title: 'Tenant Config', icon: Sliders },
  { id: 3, title: 'Existing Database', icon: Database },
  { id: 4, title: 'Frontend', icon: Globe },
  { id: 5, title: 'Backend', icon: Server },
  { id: 6, title: 'Subscription', icon: CreditCard },
  { id: 7, title: 'Features', icon: ToggleRight },
  { id: 8, title: 'Review & Register', icon: CheckCircle2 },
];

export default function NewRestaurantPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [importedFromDb, setImportedFromDb] = useState(false);

  // Testing & Discovery states
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: 'CONNECTED' | 'FAILED';
    latencyMs?: number;
    pgVersion?: string;
    host?: string;
    provider?: string;
    region?: string;
    error?: string;
  } | null>(null);

  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryData, setDiscoveryData] = useState<{
    restaurant?: any;
    branchesCount?: number;
    categoriesCount?: number;
    itemsCount?: number;
    customersCount?: number;
    ordersCount?: number;
  } | null>(null);

  const [isValidatingSchema, setIsValidatingSchema] = useState(false);
  const [schemaResult, setSchemaResult] = useState<{
    status: 'VALID' | 'PARTIAL' | 'OUTDATED' | 'UNKNOWN';
    foundCount?: number;
    totalExpected?: number;
    foundTables?: string[];
    missingTables?: string[];
  } | null>(null);

  // Dynamic Plans & Features from DB
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [availableFeatures, setAvailableFeatures] = useState<any[]>([]);

  // Form State
  const [form, setForm] = useState({
    // Step 1: Restaurant Info
    name: 'Spice Route',
    ownerName: 'Saeem Merchant',
    ownerEmail: 'hello@spiceroute.com',
    ownerPhone: '+91 9876543210',
    city: 'Mumbai',
    state: 'Maharashtra',
    address: '123 Food Street',
    pincode: '400001',
    timezone: 'Asia/Kolkata',
    country: 'India',

    // Step 2: Tenant Config
    tenantCode: 'SPICE-001',
    slug: 'spice-route',
    subdomain: 'spiceroute',
    environment: 'production',
    isolationMode: 'DEDICATED_DATABASE',

    // Step 3: Existing Database
    databaseProvider: 'RENDER',
    databaseHost: 'dpg-daham96q1p3s73bb17vg-a.singapore-postgres.render.com',
    databasePort: 5432,
    databaseName: 'restpro_db_render',
    databaseUsername: 'restpro_db_render_user',
    secretReference: 'env:FIRST_TENANT_DATABASE_URL',
    databaseRegion: 'Singapore',
    databaseEnvironment: 'production',

    // Step 4: Frontend
    frontendUrl: 'https://wp-admin-five.vercel.app/',
    frontendHostingProvider: 'VERCEL',
    frontendRegion: 'Singapore',

    // Step 5: Backend
    backendUrl: '',
    backendHostingProvider: 'OTHER',
    backendRegion: 'Singapore',

    // Step 6: Subscription
    planId: '',
    planName: 'Professional',
    startDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    autoRenew: true,
    billingCycle: 'MONTHLY',
    paymentStatus: 'PAID',

    // Step 7: Features
    features: [
      'RESTAURANT_MANAGEMENT',
      'BRANCH_MANAGEMENT',
      'MENU_MANAGEMENT',
      'ORDERS',
      'CUSTOMERS',
      'WHATSAPP_ORDERING',
      'WHATSAPP_CATALOG',
      'ONLINE_ORDERING',
      'LOYALTY',
      'CAMPAIGNS',
      'PUSH_NOTIFICATIONS',
      'MULTI_BRANCH',
      'REPORTS',
      'ANALYTICS',
      'COUPONS',
    ],
  });

  // Load plans and features on mount
  useEffect(() => {
    async function loadCatalog() {
      try {
        const [plansRes, featsRes] = await Promise.all([
          fetch('/api/admin/subscriptions'),
          fetch('/api/admin/features'),
        ]);

        if (plansRes.ok) {
          const plansJson = await plansRes.json();
          if (plansJson.data?.plans) {
            setAvailablePlans(plansJson.data.plans);
            const prof = plansJson.data.plans.find((p: any) => p.name === 'Professional');
            if (prof) {
              setForm((prev) => ({ ...prev, planId: prof.id, planName: prof.name }));
            }
          }
        }

        if (featsRes.ok) {
          const featsJson = await featsRes.json();
          if (featsJson.data?.features) {
            setAvailableFeatures(featsJson.data.features);
          }
        }
      } catch (err) {
        console.warn('Could not load dynamic catalog, using defaults:', err);
      }
    }

    loadCatalog();
  }, []);

  // Auto-generate code and slug when name changes (if user hasn't explicitly customized them)
  function handleNameChange(name: string) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const words = name.trim().split(/\s+/).filter(Boolean);
    let prefix = 'TNT';
    if (words.length > 0) {
      const first = words[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      prefix = first.length >= 3 ? first.slice(0, 5) : (name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase() || 'TNT');
    }
    const code = `${prefix}-001`;

    setForm((prev) => ({
      ...prev,
      name,
      slug: prev.slug === 'spice-route' || !prev.slug ? slug : prev.slug,
      subdomain: prev.subdomain === 'spiceroute' || !prev.subdomain ? slug.replace(/-/g, '') : prev.subdomain,
      tenantCode: prev.tenantCode === 'SPICE-001' || !prev.tenantCode ? code : prev.tenantCode,
    }));
  }

  // Step 3 Actions: Database Test Connection
  async function handleTestConnection() {
    setIsTestingDb(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/admin/tenants/database/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secretReference: form.secretReference,
          provider: form.databaseProvider,
          engine: 'POSTGRESQL',
          region: form.databaseRegion,
          host: form.databaseHost,
          port: Number(form.databasePort),
          databaseName: form.databaseName,
          username: form.databaseUsername,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setTestResult({
          status: 'CONNECTED',
          latencyMs: json.data.latencyMs,
          pgVersion: json.data.pgVersion,
          host: json.data.host || form.databaseHost,
          provider: json.data.provider || form.databaseProvider,
          region: json.data.region || form.databaseRegion,
        });
      } else {
        setTestResult({
          status: 'FAILED',
          error: json.error?.message || 'Database connection test failed.',
        });
      }
    } catch {
      setTestResult({
        status: 'FAILED',
        error: 'Network error while attempting to connect to database.',
      });
    } finally {
      setIsTestingDb(false);
    }
  }

  // Step 3 Actions: Discover Restaurant Data
  async function handleDiscoverData() {
    setIsDiscovering(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/admin/tenants/database/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secretReference: form.secretReference,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setDiscoveryData(json.data);
      } else {
        setErrorMessage(json.error?.message || 'Failed to discover restaurant data.');
      }
    } catch {
      setErrorMessage('Network error during restaurant discovery.');
    } finally {
      setIsDiscovering(false);
    }
  }

  // Step 3 Actions: Validate Tenant Schema
  async function handleValidateSchema() {
    setIsValidatingSchema(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/admin/tenants/database/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secretReference: form.secretReference,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSchemaResult(json.data);
      } else {
        setErrorMessage(json.error?.message || 'Failed to validate schema.');
      }
    } catch {
      setErrorMessage('Network error during schema validation.');
    } finally {
      setIsValidatingSchema(false);
    }
  }

  // Apply discovered metadata to the wizard form
  function applyDiscoveredData() {
    if (!discoveryData?.restaurant) return;
    const r = discoveryData.restaurant;

    setForm((prev) => ({
      ...prev,
      name: r.name || prev.name,
      slug: r.slug || prev.slug,
      subdomain: (r.slug || prev.slug).replace(/-/g, ''),
      ownerName: r.ownerName || prev.ownerName,
      ownerEmail: r.email || r.ownerEmail || prev.ownerEmail,
      ownerPhone: r.phone || r.ownerPhone || prev.ownerPhone,
      city: r.city || prev.city,
      state: r.state || prev.state,
      address: r.address || prev.address,
      pincode: r.pincode || prev.pincode,
    }));

    setImportedFromDb(true);
  }

  function toggleFeature(key: string) {
    setForm((prev) => {
      const exists = prev.features.includes(key);
      return {
        ...prev,
        features: exists ? prev.features.filter((f) => f !== key) : [...prev.features, key],
      };
    });
  }

  // Validate current step before advancing
  async function handleNextStep() {
    setErrorMessage('');

    if (currentStep === 1) {
      if (!form.name.trim()) return setErrorMessage('Restaurant name is required.');
      if (!form.ownerName.trim()) return setErrorMessage('Owner name is required.');
      if (!form.ownerEmail.trim() || !form.ownerEmail.includes('@')) {
        return setErrorMessage('Valid owner email address is required.');
      }
      if (!form.ownerPhone.trim() || form.ownerPhone.length < 8) {
        return setErrorMessage('Valid owner phone number is required.');
      }
    }

    if (currentStep === 2) {
      if (!form.tenantCode.trim()) return setErrorMessage('Tenant code is required.');
      if (!form.slug.trim()) return setErrorMessage('Slug is required.');

      // Check uniqueness against Control Plane DB
      try {
        const checkRes = await fetch(
          `/api/admin/tenants/check-unique?tenantCode=${encodeURIComponent(form.tenantCode)}&slug=${encodeURIComponent(form.slug)}&subdomain=${encodeURIComponent(form.subdomain || '')}`
        );
        if (checkRes.ok) {
          const checkJson = await checkRes.json();
          if (!checkJson.data.tenantCodeAvailable) {
            return setErrorMessage(`Tenant code '${form.tenantCode}' is already in use.`);
          }
          if (!checkJson.data.slugAvailable) {
            return setErrorMessage(`Slug '${form.slug}' is already in use.`);
          }
          if (form.subdomain && !checkJson.data.subdomainAvailable) {
            return setErrorMessage(`Subdomain '${form.subdomain}' is already in use.`);
          }
        }
      } catch (err) {
        console.warn('Uniqueness pre-check error, proceeding to server validation:', err);
      }
    }

    if (currentStep === 3) {
      if (!form.secretReference.trim()) {
        return setErrorMessage('Secret reference is required.');
      }
      if (form.secretReference.includes('://') || form.secretReference.includes('@')) {
        return setErrorMessage('Direct connection strings or passwords are forbidden. Use a managed secret reference (e.g. env:FIRST_TENANT_DATABASE_URL).');
      }
    }

    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
  }

  // Final Registration Action
  async function handleRegister() {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug.trim().toLowerCase(),
          tenantCode: form.tenantCode.trim().toUpperCase(),
          subdomain: form.subdomain ? form.subdomain.trim().toLowerCase() : undefined,
          ownerName: form.ownerName.trim(),
          ownerEmail: form.ownerEmail.trim(),
          ownerPhone: form.ownerPhone.trim(),
          city: form.city || undefined,
          state: form.state || undefined,
          address: form.address || undefined,
          pincode: form.pincode || undefined,
          timezone: form.timezone,
          country: form.country,
          environment: form.environment,
          isolationMode: form.isolationMode,
          frontendUrl: form.frontendUrl || undefined,
          backendUrl: form.backendUrl ? form.backendUrl.trim() : undefined,
          hostingProvider: form.frontendHostingProvider,
          region: form.databaseRegion,
          planId: form.planId || undefined,
          billingCycle: form.billingCycle,
          paymentStatus: form.paymentStatus,
          databaseProvider: form.databaseProvider,
          databaseHost: form.databaseHost,
          databasePort: Number(form.databasePort),
          databaseName: form.databaseName,
          databaseUsername: form.databaseUsername,
          secretReference: form.secretReference,
          initialFeatures: form.features,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorMessage(json.error?.message || 'Failed to onboard restaurant.');
        setIsSubmitting(false);
        return;
      }

      // Redirect to the newly created restaurant detail page or restaurants list (Requirement 22)
      router.push('/admin/restaurants');
    } catch {
      setErrorMessage('Network connection error while onboarding restaurant.');
      setIsSubmitting(false);
    }
  }

  return (
    <AdminLayout
      title="Onboard Restaurant — Tenant #1"
      subtitle="8-Step Platform Onboarding Wizard — Verify Render PostgreSQL & Provision Tenant"
    >
      {/* Wizard Steps Progress Indicator */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
        }}
      >
        {STEPS.map((s) => {
          const isDone = currentStep > s.id;
          const isCurrent = currentStep === s.id;
          const Icon = s.icon;

          return (
            <div
              key={s.id}
              onClick={() => s.id < currentStep && setCurrentStep(s.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: s.id < currentStep ? 'pointer' : 'default',
                opacity: isCurrent ? 1 : isDone ? 0.9 : 0.45,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: isCurrent
                    ? 'var(--brand-primary)'
                    : isDone
                    ? 'rgba(16, 185, 129, 0.2)'
                    : 'var(--bg-elevated)',
                  border: isCurrent
                    ? '1px solid #60a5fa'
                    : isDone
                    ? '1px solid #10b981'
                    : '1px solid var(--border-medium)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isCurrent ? '#fff' : isDone ? '#10b981' : 'var(--text-muted)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                {isDone ? <Check size={14} /> : s.id}
              </div>
              <span
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {s.title}
              </span>
              {s.id !== STEPS.length && (
                <div
                  style={{
                    width: '16px',
                    height: '1px',
                    background: isDone ? '#10b981' : 'var(--border-subtle)',
                    marginLeft: '8px',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {errorMessage && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--status-red-bg)',
            border: '1px solid var(--status-red-border)',
            color: '#fca5a5',
            fontSize: '0.875rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <AlertCircle size={18} color="#f87171" style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Step Panels */}
      <div className="card" style={{ padding: '28px 32px' }}>
        {/* ================= STEP 1: Restaurant Info ================= */}
        {currentStep === 1 && (
          <div>
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>Step 1: Restaurant Information</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Primary establishment contact, address, and operating timezone.
                </p>
              </div>
              {importedFromDb && (
                <span className="badge badge-green" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
                  ✓ Imported from tenant database
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">
                  Restaurant Name *{' '}
                  {importedFromDb && <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 400 }}>(Imported)</span>}
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Spice Route"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Owner / Manager Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Saeem Merchant"
                  value={form.ownerName}
                  onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Owner Email *{' '}
                  {importedFromDb && <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 400 }}>(Imported)</span>}
                </label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="hello@spiceroute.com"
                  value={form.ownerEmail}
                  onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Owner Phone *{' '}
                  {importedFromDb && <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 400 }}>(Imported)</span>}
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="+91 9876543210"
                  value={form.ownerPhone}
                  onChange={(e) => setForm({ ...form, ownerPhone: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Timezone (Default: Asia/Kolkata)</label>
                <select
                  className="form-select"
                  value={form.timezone}
                  onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT +8:00)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
                  <option value="UTC">UTC (Universal)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">City</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">State</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Operating Address</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 123 Food Street, Bandra West"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Pincode</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="400001"
                  value={form.pincode}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Country</label>
                <input type="text" className="form-input" value="India" disabled />
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 2: Tenant Config ================= */}
        {currentStep === 2 && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>Step 2: Tenant Configuration</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Define unique control plane identifiers and environment isolation mode.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Tenant Code * (Unique)</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.tenantCode}
                  onChange={(e) => setForm({ ...form, tenantCode: e.target.value.toUpperCase() })}
                  placeholder="e.g. SPICE-001"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Platform identifier format: SPICE-001 (auto-suggested, fully editable)
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Slug * (Unique)</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
                  placeholder="e.g. spice-route"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  URL-safe key used in multi-tenant resolution
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Subdomain (Unique)</label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={form.subdomain}
                    onChange={(e) => setForm({ ...form, subdomain: e.target.value.toLowerCase() })}
                    style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                    placeholder="spiceroute"
                  />
                  <span
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-medium)',
                      borderLeft: 'none',
                      padding: '10px 14px',
                      fontSize: '0.875rem',
                      color: 'var(--text-muted)',
                      borderTopRightRadius: 'var(--radius-md)',
                      borderBottomRightRadius: 'var(--radius-md)',
                    }}
                  >
                    .restroconnect.com
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Environment</label>
                <select
                  className="form-select"
                  value={form.environment}
                  onChange={(e) => setForm({ ...form, environment: e.target.value })}
                >
                  <option value="production">Production</option>
                  <option value="staging">Staging</option>
                  <option value="development">Development</option>
                </select>
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Isolation Mode</label>
                <select
                  className="form-select"
                  value={form.isolationMode}
                  onChange={(e) => setForm({ ...form, isolationMode: e.target.value })}
                >
                  <option value="DEDICATED_DATABASE">DEDICATED_DATABASE — Dedicated Database Instance (Tenant #1)</option>
                  <option value="SHARED_DATABASE">SHARED_DATABASE — Shared Database (Tenant Isolation Schema)</option>
                  <option value="SHARED_CLUSTER">SHARED_CLUSTER — Shared Cluster</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 3: Existing Database ================= */}
        {currentStep === 3 && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>Step 3: Existing Database Registration</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Register existing Render PostgreSQL database. Test connection, discover statistics, and validate schema.
              </p>
            </div>

            <div
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '0.8125rem',
                color: 'var(--text-secondary)',
              }}
            >
              <ShieldCheck size={20} color="var(--brand-primary)" style={{ flexShrink: 0 }} />
              <div>
                <strong>Zero-Credential Security Rule:</strong> Passwords and full connection strings are NEVER sent to the client, nor stored in plain text. Connections are securely resolved on the server via <span className="code-pill">env:FIRST_TENANT_DATABASE_URL</span>.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div className="form-group">
                <label className="form-label">Database Provider</label>
                <select
                  className="form-select"
                  value={form.databaseProvider}
                  onChange={(e) => setForm({ ...form, databaseProvider: e.target.value })}
                >
                  <option value="RENDER">RENDER (PostgreSQL Singapore)</option>
                  <option value="AWS_RDS">AWS_RDS (PostgreSQL)</option>
                  <option value="AWS_AURORA">AWS_AURORA (PostgreSQL)</option>
                  <option value="LOCAL">LOCAL</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Database Engine</label>
                <input type="text" className="form-input" value="POSTGRESQL" disabled />
              </div>

              <div className="form-group">
                <label className="form-label">Host</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.databaseHost}
                  onChange={(e) => setForm({ ...form, databaseHost: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Port</label>
                <input
                  type="number"
                  className="form-input"
                  value={form.databasePort}
                  onChange={(e) => setForm({ ...form, databasePort: Number(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Database Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.databaseName}
                  onChange={(e) => setForm({ ...form, databaseName: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.databaseUsername}
                  onChange={(e) => setForm({ ...form, databaseUsername: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Region</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.databaseRegion}
                  onChange={(e) => setForm({ ...form, databaseRegion: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Environment</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.databaseEnvironment}
                  onChange={(e) => setForm({ ...form, databaseEnvironment: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Secret Reference * (Encrypted Server Credential Key)</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.secretReference}
                  onChange={(e) => setForm({ ...form, secretReference: e.target.value })}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Resolves to server variable <span className="code-pill">FIRST_TENANT_DATABASE_URL</span> in .env.local without exposing passwords.
                </span>
              </div>
            </div>

            {/* Interactive Database Actions */}
            <div
              style={{
                background: 'var(--bg-app)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                border: '1px solid var(--border-subtle)',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
                    Live Verification & Discovery Tools
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Execute safe read-only queries against the tenant database before registering.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTestingDb}
                    className="btn btn-primary btn-sm"
                  >
                    <Activity size={14} className={isTestingDb ? 'animate-spin' : ''} />
                    <span>{isTestingDb ? 'Testing connection...' : 'Test Connection'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDiscoverData}
                    disabled={isDiscovering}
                    className="btn btn-secondary btn-sm"
                  >
                    <Search size={14} className={isDiscovering ? 'animate-spin' : ''} />
                    <span>{isDiscovering ? 'Discovering database...' : 'Discover Restaurant'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleValidateSchema}
                    disabled={isValidatingSchema}
                    className="btn btn-outline btn-sm"
                  >
                    <CheckCircle2 size={14} className={isValidatingSchema ? 'animate-spin' : ''} />
                    <span>{isValidatingSchema ? 'Validating schema...' : 'Validate Schema'}</span>
                  </button>
                </div>
              </div>

              {/* Test Result Display */}
              {testResult && (
                <div
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    background: testResult.status === 'CONNECTED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: testResult.status === 'CONNECTED' ? '1px solid #10b981' : '1px solid #ef4444',
                    marginBottom: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: testResult.status === 'CONNECTED' ? '#10b981' : '#f87171' }}>
                    {testResult.status === 'CONNECTED' ? (
                      <>
                        <Check size={16} />
                        <span>✓ PostgreSQL connected</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={16} />
                        <span>Database Connection Failed</span>
                      </>
                    )}
                  </div>

                  {testResult.status === 'CONNECTED' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '10px', fontSize: '0.8125rem' }}>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Latency</div>
                        <div style={{ fontWeight: 600, color: '#fff' }}>{testResult.latencyMs} ms</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Engine Version</div>
                        <div style={{ fontWeight: 600, color: '#fff' }}>{testResult.pgVersion}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Provider & Region</div>
                        <div style={{ fontWeight: 600, color: '#fff' }}>{testResult.provider} ({testResult.region})</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Masked Host</div>
                        <div style={{ fontWeight: 600, color: '#fff', fontFamily: 'var(--font-mono)' }}>{testResult.host}</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: '#fca5a5', fontSize: '0.8125rem', marginTop: '6px' }}>
                      {testResult.error}
                    </div>
                  )}
                </div>
              )}

              {/* Discovery Result Display */}
              {discoveryData && (
                <div
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid var(--brand-glow)',
                    marginBottom: '14px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#60a5fa' }}>
                      <Sparkles size={16} />
                      <span>✓ Restaurant Discovered: {discoveryData.restaurant?.name || 'Spice Route'}</span>
                    </div>

                    <button
                      type="button"
                      onClick={applyDiscoveredData}
                      className="btn btn-primary btn-sm"
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    >
                      Apply Discovered Details to Wizard
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginTop: '12px', fontSize: '0.8125rem' }}>
                    <div style={{ background: 'var(--bg-card)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Branches</div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>{discoveryData.branchesCount ?? 'Not available'}</div>
                    </div>
                    <div style={{ background: 'var(--bg-card)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Categories</div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>{discoveryData.categoriesCount ?? 'Not available'}</div>
                    </div>
                    <div style={{ background: 'var(--bg-card)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Menu Items</div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>{discoveryData.itemsCount ?? 'Not available'}</div>
                    </div>
                    <div style={{ background: 'var(--bg-card)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Customers</div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>{discoveryData.customersCount ?? 'Not available'}</div>
                    </div>
                    <div style={{ background: 'var(--bg-card)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Total Orders</div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#10b981' }}>{discoveryData.ordersCount ?? 'Not available'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Schema Validation Result Display */}
              {schemaResult && (
                <div
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    background: schemaResult.status === 'VALID' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                    border: schemaResult.status === 'VALID' ? '1px solid #10b981' : '1px solid #eab308',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: schemaResult.status === 'VALID' ? '#10b981' : '#eab308' }}>
                    <CheckCircle2 size={16} />
                    <span>✓ Schema Status: {schemaResult.status} ({schemaResult.foundCount} / {schemaResult.totalExpected} expected tables found)</span>
                  </div>

                  {schemaResult.foundTables && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                      {schemaResult.foundTables.map((t) => (
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

        {/* ================= STEP 4: Frontend ================= */}
        {currentStep === 4 && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>Step 4: Frontend Application</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Store reference deployment metadata for the customer storefront and staff application.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Frontend Application URL</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://wp-admin-five.vercel.app/"
                  value={form.frontendUrl}
                  onChange={(e) => setForm({ ...form, frontendUrl: e.target.value })}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Active reference deployment for Restaurant #1 on Vercel.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Hosting Provider</label>
                <select
                  className="form-select"
                  value={form.frontendHostingProvider}
                  onChange={(e) => setForm({ ...form, frontendHostingProvider: e.target.value })}
                >
                  <option value="VERCEL">VERCEL (Production Reference)</option>
                  <option value="AWS">AWS CloudFront / S3</option>
                  <option value="RENDER">RENDER Web Service</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Hosting Region</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.frontendRegion}
                  onChange={(e) => setForm({ ...form, frontendRegion: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 5: Backend ================= */}
        {currentStep === 5 && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>Step 5: Backend API Endpoint</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Specify standalone backend API URL if deployed separately from the Next.js frontend.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Backend API URL (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. https://api.spiceroute.restroconnect.com (leave blank if unknown)"
                  value={form.backendUrl}
                  onChange={(e) => setForm({ ...form, backendUrl: e.target.value })}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status:</span>
                  {form.backendUrl.trim() ? (
                    <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>Configured</span>
                  ) : (
                    <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>Not provided</span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Hosting Provider</label>
                <select
                  className="form-select"
                  value={form.backendHostingProvider}
                  onChange={(e) => setForm({ ...form, backendHostingProvider: e.target.value })}
                >
                  <option value="OTHER">OTHER / Combined with Frontend</option>
                  <option value="RENDER">RENDER Web Service</option>
                  <option value="AWS">AWS ECS / Lambda</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Hosting Region</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.backendRegion}
                  onChange={(e) => setForm({ ...form, backendRegion: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 6: Subscription ================= */}
        {currentStep === 6 && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>Step 6: Subscription & Plan</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Assign platform service tier, term validity, and initial payment status.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {(availablePlans.length > 0 ? availablePlans : [
                { id: '1', name: 'Starter', price: 2999, description: '1 Branch, Essential WhatsApp & Web ordering' },
                { id: '2', name: 'Professional', price: 7999, description: '3 Branches, Loyalty, Campaigns, Analytics' },
                { id: '3', name: 'Enterprise', price: 19999, description: 'Unlimited Branches, Dedicated SLA, Custom Domain' },
              ]).map((p: any) => {
                const isSelected = form.planName === p.name || form.planId === p.id;
                return (
                  <div
                    key={p.id || p.name}
                    onClick={() => setForm({ ...form, planId: p.id, planName: p.name })}
                    style={{
                      padding: '16px',
                      borderRadius: 'var(--radius-lg)',
                      background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-app)',
                      border: isSelected ? '2px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ fontWeight: 700, color: isSelected ? '#fff' : 'var(--text-primary)' }}>{p.name}</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--brand-primary)', margin: '4px 0' }}>
                      ₹{p.price?.toLocaleString() || p.price}/mo
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.description}</div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Expiry Date (1 Year Default)</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.expiryDate}
                  onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Initial Payment Status</label>
                <select
                  className="form-select"
                  value={form.paymentStatus}
                  onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}
                >
                  <option value="PAID">PAID (Annual Upfront Received)</option>
                  <option value="PENDING">PENDING (Invoice Generated)</option>
                </select>
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '28px' }}>
                <input
                  type="checkbox"
                  id="autoRenew"
                  checked={form.autoRenew}
                  onChange={(e) => setForm({ ...form, autoRenew: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="autoRenew" style={{ fontSize: '0.875rem', color: '#fff', cursor: 'pointer' }}>
                  Enable Auto Renew
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 7: Features ================= */}
        {currentStep === 7 && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>Step 7: Platform Feature Flags</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Enable or disable SaaS capabilities for this tenant establishment.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {(availableFeatures.length > 0
                ? availableFeatures
                : [
                    { key: 'RESTAURANT_MANAGEMENT', name: 'Restaurant Management' },
                    { key: 'BRANCH_MANAGEMENT', name: 'Branch Management' },
                    { key: 'MENU_MANAGEMENT', name: 'Menu & Category Management' },
                    { key: 'ORDERS', name: 'Order Management' },
                    { key: 'CUSTOMERS', name: 'Customer Database & CRM' },
                    { key: 'WHATSAPP_ORDERING', name: 'WhatsApp Ordering Bot' },
                    { key: 'WHATSAPP_CATALOG', name: 'WhatsApp Catalog Sync' },
                    { key: 'ONLINE_ORDERING', name: 'Online Direct Web Ordering' },
                    { key: 'LOYALTY', name: 'Loyalty & Points System' },
                    { key: 'CAMPAIGNS', name: 'Customer Broadcast Campaigns' },
                    { key: 'PUSH_NOTIFICATIONS', name: 'Web Push Notifications' },
                    { key: 'MULTI_BRANCH', name: 'Multi-Branch Support' },
                    { key: 'REPORTS', name: 'Financial & Sales Reports' },
                    { key: 'ANALYTICS', name: 'Executive Analytics' },
                    { key: 'COUPONS', name: 'Discounts & Coupons' },
                    { key: 'CUSTOM_DOMAIN', name: 'Custom Domain White-label' },
                  ]
              ).map((f: any) => {
                const isChecked = form.features.includes(f.key);
                return (
                  <div
                    key={f.key}
                    onClick={() => toggleFeature(f.key)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      background: isChecked ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-app)',
                      border: isChecked ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff' }}>{f.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{f.key}</div>
                    </div>
                    <span className={`badge ${isChecked ? 'badge-green' : 'badge-gray'}`}>
                      {isChecked ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= STEP 8: Review & Register ================= */}
        {currentStep === 8 && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>Step 8: Review & Register</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Inspect configuration details before committing Tenant #1 to the RESTROCONNECT Control Plane.
              </p>
            </div>

            <div
              style={{
                background: 'var(--bg-app)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px',
                border: '1px solid var(--border-subtle)',
                marginBottom: '24px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '20px',
              }}
            >
              {/* Restaurant Info Summary */}
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Restaurant Information
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#fff', marginTop: '4px' }}>
                  {form.name || '—'}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Owner: {form.ownerName} &bull; {form.ownerPhone}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Email: {form.ownerEmail} &bull; {form.city}, {form.state}
                </div>
              </div>

              {/* Tenant Config Summary */}
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Tenant Routing & Isolation
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span className="code-pill">{form.tenantCode}</span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--brand-cyan)' }}>
                    {form.subdomain}.restroconnect.com
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Slug: {form.slug} &bull; Environment: {form.environment}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Isolation: {form.isolationMode}
                </div>
              </div>

              {/* Database Summary */}
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Database Reference
                </div>
                <div style={{ fontWeight: 600, color: '#fff', marginTop: '4px' }}>
                  {form.databaseProvider} PostgreSQL 16+
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                  Host: {form.databaseHost.slice(0, 4)}••••.{form.databaseHost.split('.').slice(1).join('.')}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  DB: {form.databaseName} &bull; Region: {form.databaseRegion}
                </div>
                <div style={{ marginTop: '4px', display: 'flex', gap: '6px' }}>
                  <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>
                    {testResult?.status === 'CONNECTED' ? 'VERIFIED' : 'READY TO CONNECT'}
                  </span>
                  <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>
                    NO EXPOSED PASSWORDS
                  </span>
                </div>
              </div>

              {/* Deployment Summary */}
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Deployment Endpoints
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#fff', marginTop: '4px', wordBreak: 'break-all' }}>
                  Frontend: {form.frontendUrl || '—'} ({form.frontendHostingProvider})
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Backend: {form.backendUrl ? form.backendUrl : 'Not provided'}
                </div>
              </div>

              {/* Subscription Summary */}
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Subscription
                </div>
                <div style={{ fontWeight: 700, color: 'var(--brand-primary)', marginTop: '4px' }}>
                  {form.planName} Plan &bull; {form.billingCycle}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Validity: {form.startDate} to {form.expiryDate}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Initial Status: {form.paymentStatus} &bull; Auto-renew: {form.autoRenew ? 'Yes' : 'No'}
                </div>
              </div>

              {/* Features Summary */}
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                  Enabled Features ({form.features.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '90px', overflowY: 'auto' }}>
                  {form.features.map((f) => (
                    <span key={f} className="badge badge-blue" style={{ fontSize: '0.65rem' }}>
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Controls */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '28px',
            paddingTop: '20px',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link href="/admin/restaurants" className="btn btn-outline">
              Cancel
            </Link>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="btn btn-secondary"
                disabled={isSubmitting}
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
            )}
          </div>

          {currentStep < 8 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="btn btn-primary"
            >
              <span>Next Step</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRegister}
              disabled={isSubmitting}
              className="btn btn-success"
              style={{ padding: '12px 28px', fontSize: '0.95rem' }}
            >
              <CheckCircle2 size={18} />
              <span>{isSubmitting ? 'Registering Tenant #1...' : 'Register Restaurant'}</span>
            </button>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
