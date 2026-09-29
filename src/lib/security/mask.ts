/**
 * Masks sensitive strings like Phone Number IDs, Hostnames, Database URLs, and Keys.
 */
export function maskString(str: string | null | undefined, visibleChars: number = 4): string {
  if (!str) return '—';
  if (str.length <= visibleChars) return '****';
  const visible = str.slice(-visibleChars);
  return '•'.repeat(Math.min(str.length - visibleChars, 8)) + visible;
}

export function maskHost(host: string | null | undefined): string {
  if (!host) return '—';
  const parts = host.split('.');
  if (parts.length > 2) {
    return `${parts[0].slice(0, 4)}••••.${parts.slice(1).join('.')}`;
  }
  return maskString(host, 6);
}

export function maskPhoneNumberId(id: string | null | undefined): string {
  if (!id) return 'Not Configured';
  if (id.length <= 4) return '****';
  return `ID-••••${id.slice(-4)}`;
}

export function sanitizeAuditSnapshot(data: any): string | null {
  if (!data) return null;
  try {
    const copy = JSON.parse(JSON.stringify(data));
    const redactKeys = [
      'password',
      'passwordHash',
      'token',
      'secret',
      'connectionString',
      'DATABASE_URL',
      'FIRST_TENANT_DATABASE_URL',
      'accessToken',
      'apiKey',
    ];

    const recurse = (obj: any): void => {
      if (!obj || typeof obj !== 'object') return;
      for (const key of Object.keys(obj)) {
        if (redactKeys.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
          obj[key] = '[REDACTED_SECRET]';
        } else if (typeof obj[key] === 'object') {
          recurse(obj[key]);
        }
      }
    };

    recurse(copy);
    return JSON.stringify(copy);
  } catch {
    return '[UNSERIALIZABLE_DATA]';
  }
}
