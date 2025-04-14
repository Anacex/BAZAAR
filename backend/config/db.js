const { Pool } = require('pg'); // Fix import
const dotenv = require('dotenv');

dotenv.config();

const pgPool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    max: 20,
    idleTimeoutMillis: 30000
});

// Test PostgreSQL connection
pgPool.connect()
  .then(() => console.log('✅ PostgreSQL connected'))
  .catch(err => console.error('❌ PostgreSQL connection error', err.stack));

module.exports = pgPool;
