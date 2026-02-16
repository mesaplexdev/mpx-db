/**
 * mpx-db - Database management CLI
 * Main exports for programmatic usage
 */

export { createConnection, testConnection } from './db/connection.js';
export { SQLiteAdapter } from './db/sqlite-adapter.js';
export { PostgresAdapter } from './db/postgres-adapter.js';
export { MySQLAdapter } from './db/mysql-adapter.js';
export { 
  saveConnection, 
  loadConnections, 
  deleteConnection, 
  getConnection 
} from './utils/config.js';
