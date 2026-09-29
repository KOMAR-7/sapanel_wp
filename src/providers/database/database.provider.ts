import { Client } from 'pg';
import { secretResolver } from '../secrets/secrets.provider';

export interface DatabaseHealthResult {
  status: 'CONNECTED' | 'FAILED';
  latencyMs: number;
  pgVersion?: string;
  host?: string;
  databaseName?: string;
  error?: string;
}

export interface DatabaseMetadataResult {
  provider: string;
  engine: string;
  pgVersion?: string;
  databaseName?: string;
  host?: string;
  port?: number;
  region?: string;
  status: string;
  latencyMs?: number;
}

export interface SchemaValidationResult {
  status: 'VALID' | 'PARTIAL' | 'OUTDATED' | 'UNKNOWN';
  foundTables: string[];
  missingTables: string[];
  totalExpected: number;
  migrationStatus?: string;
}

export interface DiscoveredTenantStats {
  restaurant?: {
    id?: string;
    name?: string;
    slug?: string;
    phone?: string;
    email?: string;
    city?: string;
    state?: string;
    address?: string;
    pincode?: string;
    isOpen?: boolean;
    whatsappPhoneNumberId?: string | null;
    whatsappCatalogId?: string | null;
    ownerName?: string | null;
    ownerEmail?: string | null;
    ownerPhone?: string | null;
  };
  branchesCount: number;
  categoriesCount: number;
  itemsCount: number;
  customersCount: number;
  ordersCount: number;
}

export const MINIMUM_REQUIRED_TABLES = [
  'Restaurant',
  'Branch',
  'User',
  'Customer',
  'MenuCategory',
  'MenuItem',
  'Order',
  'OrderItem',
  'WhatsAppCart',
];

export const EXPECTED_TENANT_TABLES = [
  'Restaurant',
  'Branch',
  'User',
  'Customer',
  'MenuCategory',
  'MenuItem',
  'Order',
  'OrderItem',
  'WhatsAppCart',
  'CustomerAddress',
  'CustomerNote',
  'CustomerActivity',
  'MenuItemVariant',
  'MenuItemAddon',
  'OrderStatusHistory',
  'WhatsAppMessageReceipt',
  'WhatsAppCartItem',
  'PointsLedger',
  'CustomerCampaignTemplate',
  'CustomerCampaign',
  'CampaignReceipt',
  'PushSubscription',
  'CategoryItemSelection',
];

export interface DatabaseProvider {
  testConnection(secretReference: string): Promise<DatabaseHealthResult>;
  getMetadata(secretReference: string): Promise<DatabaseMetadataResult>;
  validateSchema(secretReference: string): Promise<SchemaValidationResult>;
  discoverTenant(secretReference: string): Promise<DiscoveredTenantStats>;
  discoverTenantData(secretReference: string): Promise<DiscoveredTenantStats>;
  getHealth(secretReference: string): Promise<DatabaseHealthResult>;
}

export class PostgresDatabaseProvider implements DatabaseProvider {
  private normalizeConnectionString(rawUrl: string): string {
    if (rawUrl.startsWith('prisma+postgres://')) {
      try {
        const u = new URL(rawUrl.replace(/^prisma\+postgres:\/\//, 'http://'));
        const apiKey = u.searchParams.get('api_key');
        if (apiKey) {
          const parts = apiKey.split('.');
          if (parts.length >= 2) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
            if (payload.endpoint) return payload.endpoint;
          }
        }
      } catch (e) {
        console.warn('Failed to parse prisma+postgres url:', e);
      }
    }
    return rawUrl;
  }

  private async getClient(secretReference: string): Promise<{ client: Client; host: string; port: number; dbName: string }> {
    const rawUrl = await secretResolver.resolveSecret(secretReference);
    if (!rawUrl) {
      throw new Error(`Unable to resolve database connection secret for reference: ${secretReference}`);
    }

    const connectionString = this.normalizeConnectionString(rawUrl);
    let host = 'Unknown';
    let port = 5432;
    let dbName = 'Unknown';

    try {
      const parsed = new URL(connectionString.replace(/^postgresql:\/\//, 'http://'));
      host = parsed.hostname;
      port = parsed.port ? parseInt(parsed.port, 10) : 5432;
      dbName = parsed.pathname.replace(/^\//, '');
    } catch {}

    const client = new Client({
      connectionString,
      ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
        ? false
        : { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
      query_timeout: 10000,
    });

    return { client, host, port, dbName };
  }

  async testConnection(secretReference: string): Promise<DatabaseHealthResult> {
    const startTime = Date.now();
    let client: Client | null = null;
    let host = '';
    let dbName = '';

    try {
      const resolved = await this.getClient(secretReference);
      client = resolved.client;
      host = resolved.host;
      dbName = resolved.dbName;

      await client.connect();
      // Requirement 5: Connect to PostgreSQL -> SELECT 1
      await client.query('SELECT 1;');
      const latencyMs = Date.now() - startTime;

      const vRes = await client.query('SELECT version();');
      const pgVersion = vRes.rows[0]?.version?.split(' on ')[0] || 'PostgreSQL';

      return {
        status: 'CONNECTED',
        latencyMs,
        pgVersion,
        host,
        databaseName: dbName,
      };
    } catch (err: any) {
      return {
        status: 'FAILED',
        latencyMs: Date.now() - startTime,
        host,
        databaseName: dbName,
        error: err.message || 'Connection failed',
      };
    } finally {
      if (client) {
        await client.end().catch(() => {});
      }
    }
  }

  async getHealth(secretReference: string): Promise<DatabaseHealthResult> {
    return this.testConnection(secretReference);
  }

  async getMetadata(secretReference: string): Promise<DatabaseMetadataResult> {
    const health = await this.testConnection(secretReference);
    const resolved = await this.getClient(secretReference);
    return {
      provider: 'RENDER',
      engine: 'POSTGRESQL',
      pgVersion: health.pgVersion,
      databaseName: resolved.dbName,
      host: resolved.host,
      port: resolved.port,
      region: 'Singapore',
      status: health.status,
      latencyMs: health.latencyMs,
    };
  }

  async validateSchema(secretReference: string): Promise<SchemaValidationResult> {
    let client: Client | null = null;
    try {
      const resolved = await this.getClient(secretReference);
      client = resolved.client;
      await client.connect();

      const res = await client.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`
      );

      const existingTables = new Set(res.rows.map((r: any) => r.table_name));
      const foundTables: string[] = [];
      const missingTables: string[] = [];

      for (const t of MINIMUM_REQUIRED_TABLES) {
        if (existingTables.has(t)) {
          foundTables.push(t);
        } else {
          missingTables.push(t);
        }
      }

      // Check all expected tables for full inventory
      const allFoundTables: string[] = [];
      for (const t of EXPECTED_TENANT_TABLES) {
        if (existingTables.has(t)) {
          allFoundTables.push(t);
        }
      }

      let status: SchemaValidationResult['status'] = 'VALID';
      if (foundTables.length === 0) {
        status = 'UNKNOWN';
      } else if (missingTables.length > 0 && foundTables.length >= 4) {
        status = 'PARTIAL';
      } else if (missingTables.length > 0) {
        status = 'OUTDATED';
      }

      // Check prisma migration table if present
      let migrationStatus = 'No migrations table detected';
      if (existingTables.has('_prisma_migrations')) {
        const migRes = await client.query(
          `SELECT migration_name, finished_at FROM "_prisma_migrations" ORDER BY finished_at DESC LIMIT 1;`
        );
        if (migRes.rows.length > 0) {
          migrationStatus = `Latest: ${migRes.rows[0].migration_name}`;
        }
      }

      return {
        status,
        foundTables: allFoundTables,
        missingTables,
        totalExpected: MINIMUM_REQUIRED_TABLES.length,
        migrationStatus,
      };
    } catch (err: any) {
      return {
        status: 'UNKNOWN',
        foundTables: [],
        missingTables: MINIMUM_REQUIRED_TABLES,
        totalExpected: MINIMUM_REQUIRED_TABLES.length,
        migrationStatus: `Validation error: ${err.message}`,
      };
    } finally {
      if (client) {
        await client.end().catch(() => {});
      }
    }
  }

  async discoverTenant(secretReference: string): Promise<DiscoveredTenantStats> {
    return this.discoverTenantData(secretReference);
  }

  async discoverTenantData(secretReference: string): Promise<DiscoveredTenantStats> {
    let client: Client | null = null;
    try {
      const resolved = await this.getClient(secretReference);
      client = resolved.client;
      await client.connect();

      let restaurantData: DiscoveredTenantStats['restaurant'];
      try {
        const restRes = await client.query(
          `SELECT id, name, slug, phone, email, city, state, address, pincode, is_open, whatsapp_phone_number_id, whatsapp_catalog_id FROM "Restaurant" LIMIT 1;`
        );
        if (restRes.rows.length > 0) {
          const r = restRes.rows[0];
          restaurantData = {
            id: r.id,
            name: r.name,
            slug: r.slug,
            phone: r.phone,
            email: r.email,
            city: r.city,
            state: r.state,
            address: r.address,
            pincode: r.pincode,
            isOpen: r.is_open,
            whatsappPhoneNumberId: r.whatsapp_phone_number_id,
            whatsappCatalogId: r.whatsapp_catalog_id,
          };
        }
      } catch {}

      // Discover Owner from User table if available
      try {
        const userRes = await client.query(
          `SELECT name, email, phone FROM "User" WHERE role = 'SUPER_ADMIN' LIMIT 1;`
        );
        if (userRes.rows.length > 0 && restaurantData) {
          restaurantData.ownerName = userRes.rows[0].name;
          restaurantData.ownerEmail = userRes.rows[0].email;
          restaurantData.ownerPhone = userRes.rows[0].phone;
        }
      } catch {}

      const getCount = async (tableName: string): Promise<number> => {
        try {
          const res = await client!.query(`SELECT COUNT(*) FROM "${tableName}";`);
          return parseInt(res.rows[0].count, 10);
        } catch {
          return 0;
        }
      };

      const branchesCount = await getCount('Branch');
      const categoriesCount = await getCount('MenuCategory');
      const itemsCount = await getCount('MenuItem');
      const customersCount = await getCount('Customer');
      const ordersCount = await getCount('Order');

      return {
        restaurant: restaurantData,
        branchesCount,
        categoriesCount,
        itemsCount,
        customersCount,
        ordersCount,
      };
    } finally {
      if (client) {
        await client.end().catch(() => {});
      }
    }
  }
}

export const databaseProvider = new PostgresDatabaseProvider();

