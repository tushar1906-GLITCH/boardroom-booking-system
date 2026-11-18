import AppDataSource from '../data-source';
import { runSeed } from './seed';

export async function runReset() {
  console.log('🔄 Resetting database...');

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  // Safety check: verify connected database name
  const dbResult = await AppDataSource.query('SELECT current_database() as db_name');
  const dbName = dbResult[0]?.db_name;
  console.log(`🔒 Verified connected database: "${dbName}"`);

  // Truncate tables with CASCADE
  await AppDataSource.query(`
    TRUNCATE TABLE notifications, bookings, rooms, refresh_tokens, users RESTART IDENTITY CASCADE;
  `);

  console.log('🧹 Cleaned existing tables.');
  await runSeed();
  console.log('🎉 Database successfully reset and seeded!');
}

if (require.main === module) {
  runReset()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Reset failed:', err);
      process.exit(1);
    });
}
