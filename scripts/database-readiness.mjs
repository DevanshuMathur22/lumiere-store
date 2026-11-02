import 'dotenv/config';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.log('DATABASE: NOT CONFIGURED');
  console.log('Mode: sample storefront / no real orders');
  process.exit(0);
}

const client = new pg.Client({
  connectionString,
  connectionTimeoutMillis: 5000,
  statement_timeout: 5000
});

try {
  await client.connect();
  await client.query('BEGIN READ ONLY');

  const info = await client.query(`
    SELECT current_database() AS database,
           current_schema() AS schema,
           version() AS version
  `);

  const tables = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  const names = new Set(
    tables.rows.map(row => row.table_name)
  );

  const required = [
    'User',
    'Product',
    'ProductVariant',
    'Category',
    'Warehouse',
    'InventoryBalance',
    'InventoryReservation',
    'Order',
    'OrderItem',
    'Payment',
    'AuditLog'
  ];

  console.log('DATABASE: CONNECTED');
  console.log('Database:', info.rows[0].database);
  console.log('Schema:', info.rows[0].schema);
  console.log('Tables found:', tables.rowCount);

  for (const name of required) {
    console.log(
      names.has(name) ? 'OK:' : 'MISSING:',
      name
    );
  }

  console.log(
    'Schema readiness:',
    required.every(name => names.has(name))
      ? 'Required tables present'
      : 'Required tables missing'
  );

  console.log('Read-only verification complete.');
} catch (error) {
  console.error(
    'DATABASE CHECK FAILED:',
    error.message
  );
  process.exitCode = 1;
} finally {
  if (client._connected) {
    await client.query('ROLLBACK').catch(() => {});
  }
  await client.end().catch(() => {});
}
