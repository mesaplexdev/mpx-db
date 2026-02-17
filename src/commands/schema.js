import chalk from 'chalk';
import Table from 'cli-table3';
import { createConnection } from '../db/connection.js';
import { resolveConnection } from './query.js';

/**
 * Show database info
 */
export async function showInfo(target, options = {}) {
  let db;
  
  try {
    const connectionString = await resolveConnection(target);
    db = await createConnection(connectionString);
    
    const info = await db.getInfo();
    
    // JSON output
    if (options.json) {
      console.log(JSON.stringify({
        type: info.type,
        database: info.database,
        path: info.path,
        size: info.size,
        sizeFormatted: info.sizeFormatted,
        tables: info.tables,
        totalRows: info.totalRows
      }, null, 2));
    } else {
      console.log(chalk.bold('\nDatabase Information'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(`${chalk.cyan('Type:')}        ${info.type}`);
      if (info.database) {
        console.log(`${chalk.cyan('Database:')}    ${info.database}`);
      }
      if (info.path) {
        console.log(`${chalk.cyan('Path:')}        ${info.path}`);
      }
      console.log(`${chalk.cyan('Size:')}        ${info.sizeFormatted}`);
      console.log(`${chalk.cyan('Tables:')}      ${info.tables}`);
      console.log(`${chalk.cyan('Total Rows:')}  ${info.totalRows.toLocaleString()}`);
      console.log();
    }
    
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message }, null, 2));
    } else {
      console.error(chalk.red(`✗ ${err.message}`));
    }
    process.exit(1);
  } finally {
    if (db) {
      await db.disconnect();
    }
  }
}

/**
 * List all tables
 */
export async function listTables(target, options = {}) {
  let db;
  
  try {
    const connectionString = await resolveConnection(target);
    db = await createConnection(connectionString);
    
    const tables = await db.getTables();
    
    // JSON output
    if (options.json) {
      console.log(JSON.stringify({
        tables: tables.map(t => ({
          name: t.name,
          type: t.type,
          rowCount: t.rows
        }))
      }, null, 2));
      return;
    }
    
    // Human-readable output
    if (tables.length === 0) {
      console.log(chalk.yellow('No tables found'));
      return;
    }
    
    const table = new Table({
      head: ['Table', 'Type', 'Rows'].map(h => chalk.cyan(h)),
      style: { head: [], border: ['gray'] },
      colAligns: ['left', 'left', 'right']
    });
    
    for (const t of tables) {
      table.push([
        chalk.white(t.name),
        chalk.gray(t.type),
        chalk.yellow(t.rows.toLocaleString())
      ]);
    }
    
    console.log(table.toString());
    if (!options.quiet) {
      console.log(chalk.gray(`\n${tables.length} table(s)`));
    }
    
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message }, null, 2));
    } else {
      console.error(chalk.red(`✗ ${err.message}`));
    }
    process.exit(1);
  } finally {
    if (db) {
      await db.disconnect();
    }
  }
}

/**
 * Describe table schema
 */
export async function describeTable(target, tableName, options = {}) {
  let db;
  
  try {
    const connectionString = await resolveConnection(target);
    db = await createConnection(connectionString);
    
    const schema = await db.getTableSchema(tableName);
    
    if (schema.length === 0) {
      if (options.json) {
        console.log(JSON.stringify({ error: `Table "${tableName}" not found` }, null, 2));
      } else {
        console.log(chalk.yellow(`Table "${tableName}" not found or has no columns`));
      }
      return;
    }
    
    // JSON output
    if (options.json) {
      console.log(JSON.stringify({
        table: tableName,
        columns: schema.map(col => ({
          name: col.name,
          type: col.type,
          nullable: col.nullable,
          defaultValue: col.default,
          primaryKey: col.primaryKey
        }))
      }, null, 2));
    } else {
      console.log(chalk.bold(`\nTable: ${tableName}`));
      console.log(chalk.gray('─'.repeat(80)));
      
      const table = new Table({
        head: ['Column', 'Type', 'Nullable', 'Default', 'Key'].map(h => chalk.cyan(h)),
        style: { head: [], border: ['gray'] }
      });
      
      for (const col of schema) {
        table.push([
          chalk.white(col.name),
          chalk.gray(col.type),
          col.nullable ? chalk.green('YES') : chalk.red('NO'),
          col.default ? chalk.yellow(col.default) : chalk.gray('-'),
          col.primaryKey ? chalk.magenta('PRI') : chalk.gray('-')
        ]);
      }
      
      console.log(table.toString());
      console.log();
    }
    
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message }, null, 2));
    } else {
      console.error(chalk.red(`✗ ${err.message}`));
    }
    process.exit(1);
  } finally {
    if (db) {
      await db.disconnect();
    }
  }
}

/**
 * Dump database schema
 */
export async function dumpSchema(target, options = {}) {
  let db;
  
  try {
    const connectionString = await resolveConnection(target);
    db = await createConnection(connectionString);
    
    const info = await db.getInfo();
    const tables = await db.getTables();
    
    let sqlOutput = '';
    
    sqlOutput += `-- Database: ${info.database || info.path}\n`;
    sqlOutput += `-- Type: ${info.type}\n`;
    sqlOutput += `-- Generated: ${new Date().toISOString()}\n\n`;
    
    for (const table of tables) {
      if (table.type !== 'table') continue;
      
      const schema = await db.getTableSchema(table.name);
      
      sqlOutput += `-- Table: ${table.name}\n`;
      sqlOutput += `-- Rows: ${table.rows}\n`;
      
      // This is a simplified dump - real implementations would generate proper DDL
      const cols = schema.map(c => {
        let def = `  ${c.name} ${c.type}`;
        if (!c.nullable) def += ' NOT NULL';
        if (c.default) def += ` DEFAULT ${c.default}`;
        return def;
      });
      
      sqlOutput += `CREATE TABLE "${table.name}" (\n`;
      sqlOutput += cols.join(',\n');
      sqlOutput += '\n);\n\n';
    }
    
    // JSON output
    if (options.json) {
      console.log(JSON.stringify({ sql: sqlOutput }, null, 2));
    } else {
      console.log(sqlOutput);
    }
    
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message }, null, 2));
    } else {
      console.error(chalk.red(`✗ ${err.message}`));
    }
    process.exit(1);
  } finally {
    if (db) {
      await db.disconnect();
    }
  }
}
