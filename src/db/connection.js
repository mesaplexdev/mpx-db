import { SQLiteAdapter } from './sqlite-adapter.js';
import { PostgresAdapter } from './postgres-adapter.js';
import { MySQLAdapter } from './mysql-adapter.js';

/**
 * Create database adapter from connection string
 */
export async function createConnection(connectionString) {
  if (!connectionString) {
    throw new Error('Connection string is required');
  }

  let adapter;
  
  // Determine database type from connection string
  if (connectionString.startsWith('sqlite://') || connectionString.startsWith('sqlite3://')) {
    adapter = new SQLiteAdapter(connectionString);
  } else if (connectionString.startsWith('postgres://') || connectionString.startsWith('postgresql://')) {
    adapter = new PostgresAdapter(connectionString);
  } else if (connectionString.startsWith('mysql://')) {
    adapter = new MySQLAdapter(connectionString);
  } else {
    throw new Error(
      `Unsupported database type. Connection string must start with:\n` +
      `  - sqlite:// or sqlite3://\n` +
      `  - postgres:// or postgresql://\n` +
      `  - mysql://`
    );
  }

  await adapter.connect();
  return adapter;
}

/**
 * Test connection
 */
export async function testConnection(connectionString) {
  try {
    const adapter = await createConnection(connectionString);
    await adapter.disconnect();
    return true;
  } catch (err) {
    return false;
  }
}
