import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import { createConnection } from '../src/db/connection.js';

const TEST_DB = './test-data/schema-test.db';

let db;

before(async () => {
  fs.rmSync('./test-data', { recursive: true, force: true });
  fs.mkdirSync('./test-data', { recursive: true });
  
  db = await createConnection(`sqlite://${TEST_DB}`);
  
  // Create test table
  await db.execute(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Insert test data
  await db.execute("INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com')");
  await db.execute("INSERT INTO users (name, email) VALUES ('Bob', 'bob@example.com')");
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

describe('Schema Operations', () => {
  test('should get table list', async () => {
    const tables = await db.getTables();
    assert.ok(tables.length >= 1);
    assert.ok(tables.some(t => t.name === 'users'));
  });

  test('should get table row count', async () => {
    const tables = await db.getTables();
    const usersTable = tables.find(t => t.name === 'users');
    assert.strictEqual(usersTable.rows, 2);
  });

  test('should get table schema', async () => {
    const schema = await db.getTableSchema('users');
    assert.ok(schema.length >= 4);
    
    const idCol = schema.find(c => c.name === 'id');
    assert.ok(idCol);
    assert.strictEqual(idCol.primaryKey, true);
    
    const nameCol = schema.find(c => c.name === 'name');
    assert.ok(nameCol);
    assert.strictEqual(nameCol.nullable, false);
  });

  test('should get database info', async () => {
    const info = await db.getInfo();
    assert.strictEqual(info.type, 'SQLite');
    assert.ok(info.tables >= 1);
    assert.ok(info.size >= 0); // Size can be 0 for new database
    assert.strictEqual(info.totalRows, 2);
  });
});
