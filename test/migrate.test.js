import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { createConnection } from '../src/db/connection.js';

const TEST_DB = './test-data/migrate-test.db';
const MIGRATIONS_DIR = './test-data/migrations';

let db;

before(async () => {
  if (fs.existsSync('./test-data')) {
    fs.rmSync('./test-data', { recursive: true });
  }
  fs.mkdirSync('./test-data', { recursive: true });
  fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
  
  db = await createConnection(`sqlite://${TEST_DB}`);
});

after(async () => {
  if (db) {
    await db.disconnect();
  }
  // Give time for file handles to close
  await new Promise(resolve => setTimeout(resolve, 100));
  if (fs.existsSync('./test-data')) {
    try {
      fs.rmSync('./test-data', { recursive: true, force: true });
    } catch (err) {
      // Ignore cleanup errors
    }
  }
});

describe('Migrations', () => {
  test('should create migrations table', async () => {
    await db.ensureMigrationsTable();
    const tables = await db.getTables();
    assert.ok(tables.some(t => t.name === 'mpx_migrations'));
  });

  test('should record migration', async () => {
    await db.ensureMigrationsTable();
    await db.recordMigration('test_migration_001');
    
    const applied = await db.getAppliedMigrations();
    assert.ok(applied.some(m => m.name === 'test_migration_001'));
  });

  test('should remove migration (rollback)', async () => {
    await db.ensureMigrationsTable();
    await db.recordMigration('test_migration_002');
    await db.removeMigration('test_migration_002');
    
    const applied = await db.getAppliedMigrations();
    assert.ok(!applied.some(m => m.name === 'test_migration_002'));
  });

  test('should run migration with SQL', async () => {
    await db.ensureMigrationsTable();
    
    // Create migration file
    const migrationSQL = `
      CREATE TABLE products (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        price REAL
      )
    `;
    
    await db.execute(migrationSQL);
    await db.recordMigration('create_products_table');
    
    // Verify table was created
    const tables = await db.getTables();
    assert.ok(tables.some(t => t.name === 'products'));
    
    // Verify migration was recorded
    const applied = await db.getAppliedMigrations();
    assert.ok(applied.some(m => m.name === 'create_products_table'));
  });
});
