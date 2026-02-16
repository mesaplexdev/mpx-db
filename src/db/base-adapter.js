/**
 * Base database adapter
 * All adapters must implement these methods
 */
export class BaseAdapter {
  constructor(connectionString) {
    this.connectionString = connectionString;
    this.connection = null;
  }

  /**
   * Connect to database
   */
  async connect() {
    throw new Error('connect() must be implemented');
  }

  /**
   * Disconnect from database
   */
  async disconnect() {
    throw new Error('disconnect() must be implemented');
  }

  /**
   * Execute a query
   * @returns {Array} rows
   */
  async query(sql, params = []) {
    throw new Error('query() must be implemented');
  }

  /**
   * Execute a statement (INSERT, UPDATE, DELETE)
   * @returns {Object} { affectedRows, insertId }
   */
  async execute(sql, params = []) {
    throw new Error('execute() must be implemented');
  }

  /**
   * Get list of tables
   */
  async getTables() {
    throw new Error('getTables() must be implemented');
  }

  /**
   * Get table schema
   */
  async getTableSchema(tableName) {
    throw new Error('getTableSchema() must be implemented');
  }

  /**
   * Get database info (size, table count, etc.)
   */
  async getInfo() {
    throw new Error('getInfo() must be implemented');
  }

  /**
   * Get table row count
   */
  async getRowCount(tableName) {
    const result = await this.query(`SELECT COUNT(*) as count FROM ${tableName}`);
    return result[0].count;
  }

  /**
   * Create migrations table if not exists
   */
  async ensureMigrationsTable() {
    throw new Error('ensureMigrationsTable() must be implemented');
  }

  /**
   * Get applied migrations
   */
  async getAppliedMigrations() {
    const rows = await this.query('SELECT * FROM mpx_migrations ORDER BY id ASC');
    return rows;
  }

  /**
   * Record migration as applied
   */
  async recordMigration(name) {
    await this.execute(
      'INSERT INTO mpx_migrations (name, applied_at) VALUES (?, ?)',
      [name, new Date().toISOString()]
    );
  }

  /**
   * Remove migration record (for rollback)
   */
  async removeMigration(name) {
    await this.execute('DELETE FROM mpx_migrations WHERE name = ?', [name]);
  }
}
