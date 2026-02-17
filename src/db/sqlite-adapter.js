import { BaseAdapter } from './base-adapter.js';
import fs from 'fs';
import path from 'path';

/**
 * SQLite adapter using better-sqlite3
 */
export class SQLiteAdapter extends BaseAdapter {
  constructor(connectionString) {
    super(connectionString);
    
    // Extract file path from sqlite:// or sqlite3://
    // sqlite:///tmp/foo.db → /tmp/foo.db (absolute)
    // sqlite://mydb.db → mydb.db (relative)
    this.dbPath = connectionString.replace(/^sqlite3?:\/\//, '');
  }

  async connect() {
    try {
      // Try to import better-sqlite3
      const Database = (await import('better-sqlite3')).default;
      
      // Ensure directory exists
      const dir = path.dirname(this.dbPath);
      if (dir && dir !== '.' && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      this.connection = new Database(this.dbPath);
      this.connection.pragma('journal_mode = WAL'); // Better concurrency
      
    } catch (err) {
      if (err.code === 'ERR_MODULE_NOT_FOUND' || err.code === 'MODULE_NOT_FOUND') {
        throw new Error(
          'SQLite driver not found. Install it with:\n  npm install better-sqlite3'
        );
      }
      throw err;
    }
  }

  async disconnect() {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
  }

  async query(sql, params = []) {
    if (!this.connection) {
      throw new Error('Not connected to database');
    }
    
    const stmt = this.connection.prepare(sql);
    return stmt.all(...params);
  }

  async execute(sql, params = []) {
    if (!this.connection) {
      throw new Error('Not connected to database');
    }
    
    const stmt = this.connection.prepare(sql);
    const result = stmt.run(...params);
    
    return {
      affectedRows: result.changes,
      insertId: result.lastInsertRowid
    };
  }

  async getTables() {
    const rows = await this.query(
      "SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY name"
    );
    
    const tables = [];
    for (const row of rows) {
      const countResult = await this.query(`SELECT COUNT(*) as count FROM ${this.quoteIdentifier(row.name)}`);
      tables.push({
        name: row.name,
        type: row.type,
        rows: countResult[0].count
      });
    }
    
    return tables;
  }

  async getTableSchema(tableName) {
    const rows = await this.query(`PRAGMA table_info(${this.quoteIdentifier(tableName)})`);
    
    return rows.map(row => ({
      name: row.name,
      type: row.type,
      nullable: row.notnull === 0,
      default: row.dflt_value,
      primaryKey: row.pk === 1
    }));
  }

  async getInfo() {
    const tables = await this.getTables();
    const totalRows = tables.reduce((sum, t) => sum + t.rows, 0);
    
    let size = 0;
    if (fs.existsSync(this.dbPath)) {
      size = fs.statSync(this.dbPath).size;
    }
    
    return {
      type: 'SQLite',
      path: this.dbPath,
      size: size,
      sizeFormatted: formatBytes(size),
      tables: tables.length,
      totalRows
    };
  }

  async ensureMigrationsTable() {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS mpx_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL
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
