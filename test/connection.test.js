import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createConnection } from '../src/db/connection.js';
import { saveConnection, loadConnections, deleteConnection, getConnection } from '../src/utils/config.js';

const TEST_DB = './test-data/conn/test.db';
const CONFIG_DIR = path.join(os.homedir(), '.mpx-db');

// Clean up before tests
before(() => {
  fs.rmSync('./test-data/conn', { recursive: true, force: true });
  fs.mkdirSync('./test-data/conn', { recursive: true });
});

// Clean up after tests
after(() => {
  fs.rmSync('./test-data/conn', { recursive: true, force: true });
});

describe('Database Connection', () => {
  test('should create SQLite connection', async () => {
    const db = await createConnection(`sqlite://${TEST_DB}`);
    assert.ok(db);
    assert.strictEqual(db.constructor.name, 'SQLiteAdapter');
    await db.disconnect();
  });

  test('should reject invalid connection string', async () => {
    await assert.rejects(
      async () => await createConnection('invalid://test'),
      /Unsupported database type/
    );
  });

  test('should connect and query', async () => {
    const db = await createConnection(`sqlite://${TEST_DB}`);
    const result = await db.query('SELECT 1 as num');
    assert.strictEqual(result[0].num, 1);
    await db.disconnect();
  });
});

describe('Connection Management', () => {
  test('should save connection', () => {
    saveConnection('test-conn', `sqlite://${TEST_DB}`);
    const connections = loadConnections();
    assert.ok(connections['test-conn']);
    assert.strictEqual(connections['test-conn'].type, 'sqlite');
  });

  test('should load saved connection', () => {
    saveConnection('test-load', `sqlite://${TEST_DB}`);
    const conn = getConnection('test-load');
    assert.ok(conn);
    assert.strictEqual(conn.type, 'sqlite');
  });

  test('should delete connection', () => {
    saveConnection('test-delete', `sqlite://${TEST_DB}`);
    const deleted = deleteConnection('test-delete');
    assert.strictEqual(deleted, true);
    
    const conn = getConnection('test-delete');
    assert.strictEqual(conn, null);
  });

  test('should encrypt connection URL', () => {
    saveConnection('test-encrypt', `sqlite://${TEST_DB}`);
    
    // Read raw file to verify encryption
    const connectionsFile = path.join(CONFIG_DIR, 'connections.json');
    const raw = JSON.parse(fs.readFileSync(connectionsFile, 'utf8'));
    
    assert.ok(raw['test-encrypt'].encrypted);
    assert.notStrictEqual(raw['test-encrypt'].url, `sqlite://${TEST_DB}`);
  });
});
