import { BaseAdapter } from './base-adapter.js';

/**
 * MySQL adapter using mysql2
 */
export class MySQLAdapter extends BaseAdapter {
  constructor(connectionString) {
    super(connectionString);
    this._identifierQuote = '`';
  }

  async connect() {
    try {
      const mysql = await import('mysql2/promise');
      
      this.connection = await mysql.default.createConnection(this.connectionString);
      
    } catch (err) {
      if (err.code === 'ERR_MODULE_NOT_FOUND' || err.code === 'MODULE_NOT_FOUND') {
        throw new Error(
          'MySQL driver not found. Install it with:\n  npm install mysql2'
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
    
    const [rows] = await this.connection.execute(sql, params);
    return rows;
  }

  async execute(sql, params = []) {
    if (!this.connection) {
      throw new Error('Not connected to database');
    }
    
    const [result] = await this.connection.execute(sql, params);
    
    return {
      affectedRows: result.affectedRows,
      insertId: result.insertId
    };
  }

  async getTables() {
    const rows = await this.query(`
      SELECT 
        TABLE_NAME as name,
        TABLE_TYPE as type
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME
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
        COLUMN_NAME as name,
        COLUMN_TYPE as type,
        IS_NULLABLE as nullable,
        COLUMN_DEFAULT as \`default\`,
        COLUMN_KEY as key_type
      FROM information_schema.COLUMNS
      WHERE TABLE_NAME = ?
        AND TABLE_SCHEMA = DATABASE()
      ORDER BY ORDINAL_POSITION
    `, [tableName]);
    
    return rows.map(row => ({
      name: row.name,
      type: row.type,
      nullable: row.nullable === 'YES',
      default: row.default,
      primaryKey: row.key_type === 'PRI'
    }));
  }

  async getInfo() {
    const tables = await this.getTables();
    const totalRows = tables.reduce((sum, t) => sum + t.rows, 0);
    
    const sizeResult = await this.query(`
      SELECT 
        SUM(data_length + index_length) as size
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
    `);
    const size = parseInt(sizeResult[0].size || 0);
    
    const dbResult = await this.query('SELECT DATABASE() as name');
    
    return {
      type: 'MySQL',
      database: dbResult[0].name,
      size: size,
      sizeFormatted: formatBytes(size),
      tables: tables.length,
      totalRows
    };
  }

  async ensureMigrationsTable() {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS mpx_migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
