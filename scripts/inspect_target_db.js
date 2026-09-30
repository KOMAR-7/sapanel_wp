const fs = require('fs');
const { Client } = require('pg');
const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
const connectionString = match ? match[1] : process.env.DATABASE_URL;

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  await client.connect();
  console.log('Connected to Render database: super_admin_restroconnect');
  const res = await client.query(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema NOT IN ('pg_catalog', 'information_schema') 
    ORDER BY table_schema, table_name;
  `);
  console.log('Existing tables count:', res.rows.length);
  res.rows.forEach(r => console.log(' - ' + r.table_schema + '.' + r.table_name));
  await client.end();
}

check().catch(console.error);
