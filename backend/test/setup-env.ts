import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from backend directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Force DATABASE_URL to use DATABASE_TEST_URL for all E2E tests
if (process.env.DATABASE_TEST_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_TEST_URL;
}
