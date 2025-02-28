import { Pool } from 'pg';

const pool = new Pool({
  user: 'test_user',
  host: 'localhost',
  database: 'test_db',
  password: 'test_pass',
  port: 5432,
});

export default pool;