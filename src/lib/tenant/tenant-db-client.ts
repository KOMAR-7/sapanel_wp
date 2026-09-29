import { Client } from 'pg';
import { resolveTenant } from './tenant-resolver';
import { secretResolver } from '@/providers/secrets/secrets.provider';

export class TenantDatabaseClient {
  /**
   * Strictly enforces tenant isolation:
   * 1. Resolves tenantId server-side
   * 2. Retrieves registered database reference
   * 3. Resolves connection secret securely
   * 4. Executes parameterized query
   */
  async executeTenantQuery<T = any>(
    tenantId: string,
    queryText: string,
    params: any[] = []
  ): Promise<{ rows: T[]; rowCount: number }> {
    const tenant = await resolveTenant(tenantId);
    if (!tenant) {
      throw new Error(`Tenant '${tenantId}' not found.`);
    }

    if (!tenant.secretReference) {
      throw new Error(`Tenant '${tenant.name}' has no registered database connection.`);
    }

    const rawUrl = await secretResolver.resolveSecret(tenant.secretReference);
    if (!rawUrl) {
      throw new Error(`Database connection secret could not be resolved for tenant '${tenant.name}'.`);
    }

    let connectionString = rawUrl;
    if (connectionString.startsWith('prisma+postgres://')) {
      try {
        const u = new URL(connectionString.replace(/^prisma\+postgres:\/\//, 'http://'));
        const apiKey = u.searchParams.get('api_key');
        if (apiKey) {
          const parts = apiKey.split('.');
          if (parts.length >= 2) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
            if (payload.endpoint) connectionString = payload.endpoint;
          }
        }
      } catch {}
    }

    const client = new Client({
      connectionString,
      ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
        ? false
        : { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });

    try {
      await client.connect();
      const result = await client.query(queryText, params);
      return {
        rows: result.rows as T[],
        rowCount: result.rowCount || 0,
      };
    } finally {
      await client.end().catch(() => {});
    }
  }
}

export const tenantDbClient = new TenantDatabaseClient();
