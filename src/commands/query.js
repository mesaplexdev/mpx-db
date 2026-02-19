import chalk from 'chalk';
import Table from 'cli-table3';
import { getConnection } from '../utils/config.js';
import { createConnection } from '../db/connection.js';
import { generateQueryPDF } from '../reporters/pdf.js';

/**
 * Execute a query or statement
 */
export async function handleQuery(target, sql, options = {}) {
  let db;
  
  try {
    // Get connection string
    const connectionString = await resolveConnection(target);
    
    // Connect
    db = await createConnection(connectionString);
    
    // Determine if this is a SELECT query or a DML/DDL statement
    const isSelectQuery = isQueryStatement(sql);
    
    // Execute
    const startTime = Date.now();
    
    if (isSelectQuery) {
      // SELECT, PRAGMA, EXPLAIN, WITH - returns rows
      const rows = await db.query(sql);
      const duration = Date.now() - startTime;
      
      // PDF output
      if (options.pdf) {
        await generateQueryPDF(rows, { sql, duration }, options.pdf);
        if (!options.quiet) {
          console.log(chalk.green(`✓ Query report saved to ${options.pdf} (${rows.length} rows)`));
        }
      }
      // JSON output
      else if (options.json) {
        console.log(JSON.stringify({
          success: true,
          type: 'query',
          rows,
          rowCount: rows.length,
          duration
        }, null, 2));
      } else if (!options.quiet) {
        // Display results
        if (rows.length === 0) {
          console.log(chalk.yellow('No rows returned'));
        } else {
          displayTable(rows);
          console.log(chalk.gray(`\n${rows.length} row(s) in ${duration}ms`));
        }
      }
    } else {
      // INSERT, UPDATE, DELETE, CREATE, DROP, ALTER - returns affected rows
      const result = await db.execute(sql);
      const duration = Date.now() - startTime;
      
      // JSON output
      if (options.json) {
        console.log(JSON.stringify({
          success: true,
          type: 'statement',
          affectedRows: result.affectedRows,
          insertId: result.insertId,
          duration
        }, null, 2));
      } else {
        if (!options.quiet) {
          console.log(chalk.green('✓ Statement executed successfully'));
          console.log(chalk.gray(`  Affected rows: ${result.affectedRows}`));
          if (result.insertId) {
            console.log(chalk.gray(`  Insert ID: ${result.insertId}`));
          }
          console.log(chalk.gray(`  Duration: ${duration}ms`));
        }
      }
    }
    
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: err.message }, null, 2));
    } else {
      console.error(chalk.red('✗ Query failed'));
      console.error(chalk.red(`  ${err.message}`));
    }
    process.exit(1);
  } finally {
    if (db) {
      await db.disconnect();
    }
  }
}

/**
 * Determine if SQL is a query (returns rows) or a statement (modifies data)
 */
function isQueryStatement(sql) {
  const trimmed = sql.trim().toUpperCase();
  
  // These keywords indicate a query that returns rows
  const queryKeywords = ['SELECT', 'PRAGMA', 'EXPLAIN', 'WITH', 'SHOW', 'DESCRIBE', 'DESC'];
  
  for (const keyword of queryKeywords) {
    if (trimmed.startsWith(keyword)) {
      return true;
    }
  }
  
  return false;
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
