import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import { createConnection } from '../src/db/connection.js';

const TEST_DB = './test-data/query-test.db';

let db;

before(async () => {
  if (fs.existsSync('./test-data')) {
    fs.rmSync('./test-data', { recursive: true });
  }
  fs.mkdirSync('./test-data', { recursive: true });
  
  db = await createConnection(`sqlite://${TEST_DB}`);
  
  // Create test table
  await db.execute(`
    CREATE TABLE books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT,
      year INTEGER
    )
  `);
});

after(async () => {
  if (db) {
    await db.disconnect();
  }
  if (fs.existsSync('./test-data')) {
    fs.rmSync('./test-data', { recursive: true });
  }
});

describe('Query Operations', () => {
  test('should insert data', async () => {
    const result = await db.execute(
      'INSERT INTO books (title, author, year) VALUES (?, ?, ?)',
      ['1984', 'George Orwell', 1949]
    );
    
    assert.ok(result.insertId > 0);
    assert.strictEqual(result.affectedRows, 1);
  });

  test('should query data', async () => {
    await db.execute(
      'INSERT INTO books (title, author, year) VALUES (?, ?, ?)',
      ['Brave New World', 'Aldous Huxley', 1932]
    );
    
    const books = await db.query('SELECT * FROM books WHERE author = ?', ['Aldous Huxley']);
    
    assert.strictEqual(books.length, 1);
    assert.strictEqual(books[0].title, 'Brave New World');
    assert.strictEqual(books[0].year, 1932);
  });

  test('should update data', async () => {
    await db.execute(
      'INSERT INTO books (title, author, year) VALUES (?, ?, ?)',
      ['Animal Farm', 'George Orwell', 1945]
    );
    
    const result = await db.execute(
      'UPDATE books SET year = ? WHERE title = ?',
      [1946, 'Animal Farm']
    );
    
    assert.strictEqual(result.affectedRows, 1);
    
    const books = await db.query('SELECT * FROM books WHERE title = ?', ['Animal Farm']);
    assert.strictEqual(books[0].year, 1946);
  });

  test('should delete data', async () => {
    await db.execute(
      'INSERT INTO books (title, author, year) VALUES (?, ?, ?)',
      ['To Delete', 'Someone', 2000]
    );
    
    const result = await db.execute(
      'DELETE FROM books WHERE title = ?',
      ['To Delete']
    );
    
    assert.strictEqual(result.affectedRows, 1);
    
    const books = await db.query('SELECT * FROM books WHERE title = ?', ['To Delete']);
    assert.strictEqual(books.length, 0);
  });

  test('should handle empty results', async () => {
    const books = await db.query('SELECT * FROM books WHERE year = ?', [9999]);
    assert.strictEqual(books.length, 0);
  });
});
