import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Error: DATABASE_URL is not set in backend/.env');
  process.exit(1);
}

const sqlFile = path.resolve(process.cwd(), '../database/schema.sql');

async function runMigrations() {
  const client = new Client({ connectionString });
  await client.connect();
  const sql = await fs.readFile(sqlFile, 'utf8');
  await client.query(sql);
  await client.end();
  console.log('Database migrations applied successfully.');
}

runMigrations().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
