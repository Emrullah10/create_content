import '@create-content/config/load-env.js';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host:     process.env.POSTGRES_HOST     ?? 'localhost',
  port:     parseInt(process.env.POSTGRES_PORT ?? '5432'),
  user:     process.env.POSTGRES_USER     ?? 'postgres',
  password: process.env.POSTGRES_PASSWORD ?? '',
  database: process.env.POSTGRES_DB       ?? 'postgres',
});

const query = (text, params) => pool.query(text, params);

export default { query, pool };
