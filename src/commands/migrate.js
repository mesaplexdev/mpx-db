import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import Table from 'cli-table3';
import { createConnection } from '../db/connection.js';
import { resolveConnection } from './query.js';

const MIGRATIONS_DIR = './migrations';

/**
 * Initialize migrations directory
 */
export async function initMigrations() {
  if (fs.existsSync(MIGRATIONS_DIR)) {
    console.log(chalk.yellow('Migrations directory already exists'));
    return;
  }
  
  fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
  
  // Create README
  const readme = `# Database Migrations

This directory contains database migration files.

## File naming convention

Migrations are named: \`YYYYMMDD_HHMMSS_description.sql\`

Example: \`20260215_143022_create_users_table.sql\`

## Migration format

Each migration file should contain SQL statements:

\`\`\`sql
-- Up migration
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL
);

-- Down migration (optional, after -- DOWN marker)
-- DOWN
DROP TABLE users;
\`\`\`

## Commands

- \`mpx-db migrate create <description>\` - Create new migration
- \`mpx-db migrate status <connection>\` - Show migration status
- \`mpx-db migrate up <connection>\` - Run pending migrations
- \`mpx-db migrate down <connection>\` - Rollback last migration
`;
  
  fs.writeFileSync(path.join(MIGRATIONS_DIR, 'README.md'), readme);
  
  console.log(chalk.green('✓ Migrations directory created'));
  console.log(chalk.gray(`  ${MIGRATIONS_DIR}/`));
}

/**
 * Create new migration file
 */
export async function createMigration(description) {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log(chalk.yellow('Migrations directory not found. Run: mpx-db migrate init'));
    return;
  }
  
  // Generate timestamp-based filename
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+/, '')
    .replace('T', '_');
  
  const slug = description
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  
  const filename = `${timestamp}_${slug}.sql`;
  const filepath = path.join(MIGRATIONS_DIR, filename);
  
  const template = `-- Migration: ${description}
-- Created: ${new Date().toISOString()}

-- Up migration
-- Write your SQL here


-- Down migration (rollback)
-- DOWN

`;
  
  fs.writeFileSync(filepath, template);
  
  console.log(chalk.green('✓ Created migration'));
  console.log(chalk.gray(`  ${filepath}`));
}

/**
 * Get all migration files
 */
function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }
  
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();
}

/**
 * Parse migration file (split up/down)
 */
function parseMigration(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');
  const parts = content.split(/^--\s*DOWN\s*$/m);
  
  return {
    up: parts[0].trim(),
    down: parts[1]?.trim() || null
  };
}

/**
 * Show migration status
 */
export async function showMigrationStatus(target) {
  let db;
  
  try {
    const connectionString = await resolveConnection(target);
    db = await createConnection(connectionString);
    
    // Ensure migrations table exists
    await db.ensureMigrationsTable();
    
    // Get applied migrations
    const applied = await db.getAppliedMigrations();
    const appliedNames = new Set(applied.map(m => m.name));
    
    // Get migration files
    const files = getMigrationFiles();
    
    if (files.length === 0) {
      console.log(chalk.yellow('No migration files found'));
      console.log(chalk.gray('Create one with: mpx-db migrate create <description>'));
      return;
    }
    
    const table = new Table({
      head: ['Migration', 'Status', 'Applied'].map(h => chalk.cyan(h)),
      style: { head: [], border: ['gray'] }
    });
    
    for (const file of files) {
      const name = file.replace('.sql', '');
      const isApplied = appliedNames.has(name);
      const appliedRecord = applied.find(m => m.name === name);
      
      table.push([
        chalk.white(name),
        isApplied ? chalk.green('Applied') : chalk.yellow('Pending'),
        appliedRecord ? chalk.gray(new Date(appliedRecord.applied_at).toLocaleString()) : chalk.gray('-')
      ]);
    }
    
    console.log(table.toString());
    
    const pending = files.filter(f => !appliedNames.has(f.replace('.sql', '')));
    console.log(chalk.gray(`\n${applied.length} applied, ${pending.length} pending`));
    
  } catch (err) {
    console.error(chalk.red(`✗ ${err.message}`));
    process.exit(1);
  } finally {
    if (db) {
      await db.disconnect();
    }
  }
}

/**
 * Run pending migrations
 */
export async function runMigrations(target) {
  let db;
  
  try {
    const connectionString = await resolveConnection(target);
    db = await createConnection(connectionString);
    
    await db.ensureMigrationsTable();
    
    const applied = await db.getAppliedMigrations();
    const appliedNames = new Set(applied.map(m => m.name));
    
    const files = getMigrationFiles();
    const pending = files.filter(f => !appliedNames.has(f.replace('.sql', '')));
    
    if (pending.length === 0) {
      console.log(chalk.green('✓ All migrations up to date'));
      return;
    }
    
    console.log(chalk.cyan(`Running ${pending.length} migration(s)...\n`));
    
    for (const file of pending) {
      const name = file.replace('.sql', '');
      const filepath = path.join(MIGRATIONS_DIR, file);
      const migration = parseMigration(filepath);
      
      console.log(chalk.gray(`→ ${name}`));
      
      // Execute migration (split by semicolon for multiple statements)
      // Remove comment lines first, then split
      const cleanedSQL = migration.up
        .split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n');
      
      const statements = cleanedSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      for (const statement of statements) {
        await db.execute(statement);
      }
      
      await db.recordMigration(name);
      
      console.log(chalk.green(`  ✓ Applied`));
    }
    
    console.log(chalk.green(`\n✓ ${pending.length} migration(s) applied`));
    
  } catch (err) {
    console.error(chalk.red(`\n✗ Migration failed: ${err.message}`));
    process.exit(1);
  } finally {
    if (db) {
      await db.disconnect();
    }
  }
}

/**
 * Rollback last migration
 */
export async function rollbackMigration(target) {
  let db;
  
  try {
    const connectionString = await resolveConnection(target);
    db = await createConnection(connectionString);
    
    await db.ensureMigrationsTable();
    
    const applied = await db.getAppliedMigrations();
    
    if (applied.length === 0) {
      console.log(chalk.yellow('No migrations to rollback'));
      return;
    }
    
    const last = applied[applied.length - 1];
    const filepath = path.join(MIGRATIONS_DIR, `${last.name}.sql`);
    
    if (!fs.existsSync(filepath)) {
      console.error(chalk.red(`✗ Migration file not found: ${filepath}`));
      process.exit(1);
    }
    
    const migration = parseMigration(filepath);
    
    if (!migration.down) {
      console.error(chalk.red(`✗ No down migration found in ${last.name}`));
      process.exit(1);
    }
    
    console.log(chalk.cyan(`Rolling back: ${last.name}`));
    
    // Execute rollback (split by semicolon for multiple statements)
    // Remove comment lines first, then split
    const cleanedSQL = migration.down
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');
    
    const statements = cleanedSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const statement of statements) {
      await db.execute(statement);
    }
    
    await db.removeMigration(last.name);
    
    console.log(chalk.green('✓ Rolled back'));
    
  } catch (err) {
    console.error(chalk.red(`✗ Rollback failed: ${err.message}`));
    process.exit(1);
  } finally {
    if (db) {
      await db.disconnect();
    }
  }
}
