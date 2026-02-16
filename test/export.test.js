import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import { createConnection } from '../src/db/connection.js';

const TEST_DB = './test-data/export-test.db';

let db;

before(async () => {
  if (fs.existsSync('./test-data')) {
    fs.rmSync('./test-data', { recursive: true });
  }
  fs.mkdirSync('./test-data', { recursive: true });
  
  db = await createConnection(`sqlite://${TEST_DB}`);
  
  // Create and populate test table
  await db.execute(`
    CREATE TABLE employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      department TEXT,
      salary INTEGER
    )
  `);
  
  await db.execute("INSERT INTO employees (name, department, salary) VALUES ('Alice', 'Engineering', 120000)");
  await db.execute("INSERT INTO employees (name, department, salary) VALUES ('Bob', 'Sales', 80000)");
  await db.execute("INSERT INTO employees (name, department, salary) VALUES ('Charlie', 'Engineering', 110000)");
});

after(async () => {
  if (db) {
    await db.disconnect();
  }
  if (fs.existsSync('./test-data')) {
    fs.rmSync('./test-data', { recursive: true });
  }
});

describe('Data Export', () => {
  test('should export to JSON', async () => {
    const rows = await db.query('SELECT * FROM employees');
    const json = JSON.stringify(rows, null, 2);
    
    // Ensure directory exists
    if (!fs.existsSync('./test-data')) {
      fs.mkdirSync('./test-data', { recursive: true });
    }
    
    fs.writeFileSync('./test-data/export.json', json);
    
    const exported = JSON.parse(fs.readFileSync('./test-data/export.json', 'utf8'));
    assert.strictEqual(exported.length, 3);
    assert.strictEqual(exported[0].name, 'Alice');
  });

  test('should export to CSV', async () => {
    const rows = await db.query('SELECT * FROM employees');
    
    // Simple CSV export
    const columns = Object.keys(rows[0]);
    const header = columns.join(',');
    const data = rows.map(row => columns.map(c => row[c]).join(',')).join('\n');
    const csv = [header, data].join('\n');
    
    // Ensure directory exists
    if (!fs.existsSync('./test-data')) {
      fs.mkdirSync('./test-data', { recursive: true });
    }
    
    fs.writeFileSync('./test-data/export.csv', csv);
    
    const exported = fs.readFileSync('./test-data/export.csv', 'utf8');
    assert.ok(exported.includes('Alice'));
    assert.ok(exported.includes('Engineering'));
  });

  test('should get row count', async () => {
    const count = await db.getRowCount('employees');
    assert.strictEqual(count, 3);
  });
});
