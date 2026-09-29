const { Client } = require('pg');

async function testDiscovery() {
  const connectionString = process.env.FIRST_TENANT_DATABASE_URL;
  if (!connectionString) {
    console.error('No FIRST_TENANT_DATABASE_URL provided.');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  await client.connect();

  const rRes = await client.query('SELECT id, name, slug, phone, email, city, state, address, pincode FROM "Restaurant" LIMIT 1;');
  const bRes = await client.query('SELECT COUNT(*) FROM "Branch";');
  const catRes = await client.query('SELECT COUNT(*) FROM "MenuCategory";');
  const iRes = await client.query('SELECT COUNT(*) FROM "MenuItem";');
  const cRes = await client.query('SELECT COUNT(*) FROM "Customer";');
  const oRes = await client.query('SELECT COUNT(*) FROM "Order";');

  console.log('Discovered Restaurant:', rRes.rows[0]);
  console.log('Statistics:', {
    branchesCount: parseInt(bRes.rows[0].count, 10),
    categoriesCount: parseInt(catRes.rows[0].count, 10),
    itemsCount: parseInt(iRes.rows[0].count, 10),
    customersCount: parseInt(cRes.rows[0].count, 10),
    ordersCount: parseInt(oRes.rows[0].count, 10),
  });

  await client.end();
}

testDiscovery().catch(console.error);
