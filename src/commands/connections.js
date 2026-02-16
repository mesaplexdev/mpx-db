import chalk from 'chalk';
import Table from 'cli-table3';
import { saveConnection, loadConnections, deleteConnection } from '../utils/config.js';
import { createConnection } from '../db/connection.js';

/**
 * Handle connect command
 */
export async function handleConnect(url, options = {}) {
  try {
    // Test connection
    if (!options.quiet && !options.json) {
      console.log(chalk.gray('Testing connection...'));
    }
    
    const db = await createConnection(url);
    const info = await db.getInfo();
    await db.disconnect();
    
    // Save if requested
    let saved = false;
    if (options.save) {
      saveConnection(options.save, url);
      saved = true;
    }
    
    // JSON output
    if (options.json) {
      console.log(JSON.stringify({
        success: true,
        connection: {
          type: info.type,
          database: info.database,
          path: info.path
        },
        saved,
        name: options.save || null
      }, null, 2));
      return;
    }
    
    // Human-readable output
    console.log(chalk.green('✓ Connection successful'));
    console.log(chalk.gray(`  Type: ${info.type}`));
    if (info.database) {
      console.log(chalk.gray(`  Database: ${info.database}`));
    }
    if (info.path) {
      console.log(chalk.gray(`  Path: ${info.path}`));
    }
    
    if (options.save) {
      console.log(chalk.green(`✓ Saved connection as "${options.save}"`));
    }
    
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: err.message }, null, 2));
    } else {
      console.error(chalk.red('✗ Connection failed'));
      console.error(chalk.red(`  ${err.message}`));
    }
    process.exit(1);
  }
}

/**
 * List saved connections
 */
export async function listConnections(options = {}) {
  const connections = loadConnections();
  
  // JSON output
  if (options.json) {
    const connArray = Object.entries(connections).map(([name, conn]) => ({
      name,
      type: conn.type,
      createdAt: new Date(conn.createdAt).toISOString()
    }));
    console.log(JSON.stringify({ connections: connArray }, null, 2));
    return;
  }
  
  // Human-readable output
  if (Object.keys(connections).length === 0) {
    console.log(chalk.yellow('No saved connections'));
    if (!options.quiet) {
      console.log(chalk.gray('\nSave a connection with:'));
      console.log(chalk.gray('  mpx-db connect --save <name> <url>'));
    }
    return;
  }
  
  const table = new Table({
    head: ['Name', 'Type', 'Created'].map(h => chalk.cyan(h)),
    style: { head: [], border: ['gray'] }
  });
  
  for (const [name, conn] of Object.entries(connections)) {
    table.push([
      chalk.white(name),
      chalk.gray(conn.type),
      chalk.gray(new Date(conn.createdAt).toLocaleDateString())
    ]);
  }
  
  console.log(table.toString());
}

/**
 * Delete a saved connection
 */
export async function removeConnection(name, options = {}) {
  const deleted = deleteConnection(name);
  
  // JSON output
  if (options.json) {
    console.log(JSON.stringify({
      success: deleted,
      name,
      message: deleted ? 'Connection deleted' : 'Connection not found'
    }, null, 2));
    return;
  }
  
  // Human-readable output
  if (deleted) {
    console.log(chalk.green(`✓ Deleted connection "${name}"`));
  } else {
    console.log(chalk.yellow(`Connection "${name}" not found`));
  }
}
