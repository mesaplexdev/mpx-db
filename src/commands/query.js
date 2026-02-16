import chalk from 'chalk';
import Table from 'cli-table3';
import { getConnection } from '../utils/config.js';
import { createConnection } from '../db/connection.js';

/**
 * Execute a query
 */
export async function handleQuery(target, sql, options) {
  let db;
  
  try {
    // Get connection string
    const connectionString = await resolveConnection(target);
    
    // Connect
    db = await createConnection(connectionString);
    
    // Execute query
    const startTime = Date.now();
    const rows = await db.query(sql);
    const duration = Date.now() - startTime;
    
    // Display results
    if (rows.length === 0) {
      console.log(chalk.yellow('No rows returned'));
    } else {
      displayTable(rows);
    }
    
    console.log(chalk.gray(`\n${rows.length} row(s) in ${duration}ms`));
    
  } catch (err) {
    console.error(chalk.red('✗ Query failed'));
    console.error(chalk.red(`  ${err.message}`));
    process.exit(1);
  } finally {
    if (db) {
      await db.disconnect();
    }
  }
}

/**
 * Display query results as table
 */
function displayTable(rows) {
  if (rows.length === 0) return;
  
  const columns = Object.keys(rows[0]);
  
  const table = new Table({
    head: columns.map(c => chalk.cyan(c)),
    style: { head: [], border: ['gray'] }
  });
  
  for (const row of rows) {
    table.push(
      columns.map(col => {
        const val = row[col];
        if (val === null) return chalk.gray('NULL');
        if (typeof val === 'number') return chalk.yellow(val.toString());
        return val.toString();
      })
    );
  }
  
  console.log(table.toString());
}

/**
 * Resolve connection string from target (name or URL)
 */
async function resolveConnection(target) {
  // Check if it's a saved connection name
  const saved = getConnection(target);
  if (saved) {
    return saved.url;
  }
  
  // Check if it looks like a connection URL
  if (target.includes('://')) {
    return target;
  }
  
  throw new Error(
    `Connection "${target}" not found.\n` +
    `  Use a connection URL or save a connection with:\n` +
    `  mpx-db connect --save ${target} <url>`
  );
}

export { resolveConnection };
