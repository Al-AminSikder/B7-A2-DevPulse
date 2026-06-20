// 1. ALWAYS load environment configurations first!
import dotenv from 'dotenv';
dotenv.config();

// 2. Load application structures and the active database connection pool
import app from './app';
import { pool } from './config/db'; 

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`=============================================`);
  console.log(`  DevPulse Server running on port ${PORT}      `);
  console.log(`  Environment Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`=============================================`);
  
  // 3. This explicitly forces the pool import to activate and execute its connection check loop
  pool.emit('init');
});