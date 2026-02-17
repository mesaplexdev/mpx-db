import { BaseAdapter } from './base-adapter.js';

/**
 * PostgreSQL adapter using pg
 */
export class PostgresAdapter extends BaseAdapter {
  async connect() {
    try {
      const pkg = await import('pg');
      const { Client } = pkg.default || pkg;
      
      this.connection = new Client({ connectionString: this.connectionString });
      await this.connection.connect();
      
    } catch (err) {
      if (err.code === 'ERR_MODULE_NOT_FOUND' || err.code === 'MODULE_NOT_FOUND') {
        throw new Error(
          'PostgreSQL driver not found. Install it with:\n  npm install pg'
        );
      }
      throw err;
    }
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }

  async query(sql, params = []) {
    if (!this.connection) {
      throw new Error('Not connected to database');
    }
    
    const result = await this.connection.query(sql, params);
    return result.rows;
  }

  async execute(sql, params = []) {
    if (!this.connection) {
      throw new Error('Not connected to database');
    }
    
    const result = await this.connection.query(sql, params);
    
    return {
      affectedRows: result.rowCount,
      insertId: result.rows[0]?.id || null
    };
  }

  async getTables() {
    const rows = await this.query(`
      SELECT 
        table_name as name,
        table_type as type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const tables = [];
    for (const row of rows) {
      const countResult = await this.query(
        `SELECT COUNT(*) as count FROM ${this.quoteIdentifier(row.name)}`
      );
      tables.push({
        name: row.name,
        type: row.type === 'BASE TABLE' ? 'table' : 'view',
        rows: parseInt(countResult[0].count)
      });
    }
    
    return tables;
  }

  async getTableSchema(tableName) {
    const rows = await this.query(`
      SELECT 
        column_name as name,
        data_type as type,
        is_nullable as nullable,
        column_default as "default",
        CASE WHEN c.column_name IN (
          SELECT kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_name = $1
            AND tc.constraint_type = 'PRIMARY KEY'
        ) THEN true ELSE false END as primary_key
      FROM information_schema.columns c
      WHERE table_name = $1
        AND table_schema = 'public'
      ORDER BY ordinal_position
    `, [tableName]);
    
    return rows.map(row => ({
      name: row.name,
      type: row.type,
      nullable: row.nullable === 'YES',
      default: row.default,
      primaryKey: row.primary_key
    }));
  }

  async getInfo() {
    const tables = await this.getTables();
    const totalRows = tables.reduce((sum, t) => sum + t.rows, 0);
    
    const sizeResult = await this.query(`
      SELECT pg_database_size(current_database()) as size
    `);
    const size = parseInt(sizeResult[0].size);
    
    const dbResult = await this.query('SELECT current_database() as name');
    
    return {
      type: 'PostgreSQL',
      database: dbResult[0].name,
      size: size,
      sizeFormatted: formatBytes(size),
      tables: tables.length,
      totalRows
    };
  }

  async recordMigration(name) {
    await this.execute(
      'INSERT INTO mpx_migrations (name, applied_at) VALUES ($1, $2)',
      [name, new Date().toISOString()]
    );
  }

  async removeMigration(name) {
    await this.execute('DELETE FROM mpx_migrations WHERE name = $1', [name]);
  }

  async ensureMigrationsTable() {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS mpx_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
