import chalk from 'chalk';
import Table from 'cli-table3';
import { saveConnection, loadConnections, deleteConnection } from '../utils/config.js';
import { createConnection } from '../db/connection.js';

/**
 * Handle connect command
 */
export async function handleConnect(url, options) {
  try {
    // Test connection
    console.log(chalk.gray('Testing connection...'));
    const db = await createConnection(url);
    const info = await db.getInfo();
    await db.disconnect();
    
    console.log(chalk.green('✓ Connection successful'));
    console.log(chalk.gray(`  Type: ${info.type}`));
    if (info.database) {
      console.log(chalk.gray(`  Database: ${info.database}`));
    }
    if (info.path) {
      console.log(chalk.gray(`  Path: ${info.path}`));
    }
    
    // Save if requested
    if (options.save) {
      saveConnection(options.save, url);
      console.log(chalk.green(`✓ Saved connection as "${options.save}"`));
    }
    
  } catch (err) {
    console.error(chalk.red('✗ Connection failed'));
    console.error(chalk.red(`  ${err.message}`));
    process.exit(1);
  }
}

/**
 * List saved connections
 */
export async function listConnections() {
  const connections = loadConnections();
  
  if (Object.keys(connections).length === 0) {
    console.log(chalk.yellow('No saved connections'));
    console.log(chalk.gray('\nSave a connection with:'));
    console.log(chalk.gray('  mpx-db connect --save <name> <url>'));
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
export async function removeConnection(name) {
  const deleted = deleteConnection(name);
  
  if (deleted) {
    console.log(chalk.green(`✓ Deleted connection "${name}"`));
  } else {
    console.log(chalk.yellow(`Connection "${name}" not found`));
  }
}
