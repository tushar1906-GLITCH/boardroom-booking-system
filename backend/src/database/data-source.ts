import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/meeting_room_booking_db';

const AppDataSource = new DataSource({
  type: 'postgres',
  url: dbUrl,
  synchronize: false, // MANDATORY: Schema changes must only happen via migrations
  logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  entities: [path.join(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, 'migrations/*{.ts,.js}')],
  subscribers: [],
});

export default AppDataSource;
