// @ts-ignore
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { DataSource } from 'typeorm';

// Load .env from backend directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function prepare() {
  const testUrl =
    process.env.DATABASE_TEST_URL ||
    'postgresql://postgres:postgres@localhost:5433/meeting_room_booking_test_db';

  const parsed = new URL(testUrl);
  const targetDbName = parsed.pathname.replace(/^\//, '');

  console.log(`🔍 Preparing test database: "${targetDbName}"...`);

  // Connect to default 'postgres' database to check/create target database
  const serverUrl = new URL(testUrl);
  serverUrl.pathname = '/postgres';

  const client = new Client({ connectionString: serverUrl.toString() });
  await client.connect();

  try {
    const res = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [targetDbName],
    );
    if (res.rowCount === 0) {
      console.log(`📦 Database "${targetDbName}" does not exist. Creating...`);
      await client.query(`CREATE DATABASE "${targetDbName}"`);
      console.log(`✅ Created database "${targetDbName}".`);
    } else {
      console.log(`✅ Database "${targetDbName}" already exists.`);
    }
  } finally {
    await client.end();
  }

  // Connect to the test database to ensure required extensions exist
  const testDbClient = new Client({ connectionString: testUrl });
  await testDbClient.connect();
  try {
    await testDbClient.query('CREATE EXTENSION IF NOT EXISTS btree_gist;');
    await testDbClient.query('CREATE EXTENSION IF NOT EXISTS citext;');
  } finally {
    await testDbClient.end();
  }

  // Run TypeORM migrations on test database
  console.log(`🔄 Running migrations on "${targetDbName}"...`);
  const testDataSource = new DataSource({
    type: 'postgres',
    url: testUrl,
    synchronize: false,
    entities: [path.join(__dirname, '../src/**/*.entity{.ts,.js}')],
    migrations: [path.join(__dirname, '../src/database/migrations/*{.ts,.js}')],
  });

  await testDataSource.initialize();
  await testDataSource.runMigrations();
  await testDataSource.destroy();

  console.log(`🎉 Test database "${targetDbName}" is ready for E2E tests!`);
}

prepare()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Failed to prepare test database:', err);
    process.exit(1);
  });
