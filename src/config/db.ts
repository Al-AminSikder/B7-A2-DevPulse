import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔄 Core Engine: Initializing PostgreSQL connection pool...');
console.log('🔗 Target Database String:', process.env.DATABASE_URL ? '✅ Found in environment' : '❌ NOT FOUND');

const isProduction = process.env.NODE_ENV === 'production';
const isNeon = process.env.DATABASE_URL?.includes('neon.tech');

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction || isNeon ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.connect()
  .then((client) => {
    console.log('✅ PostgreSQL Database pool connected successfully!');
    client.release();
  })
  .catch((err) => {
    console.error('❌ Critical: Database connection handshake failed!');
    console.error(`📋 Error Details: ${err.message}`);
  });