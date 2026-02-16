import fs from 'fs';
import chalk from 'chalk';
import { createConnection } from '../db/connection.js';
import { resolveConnection } from './query.js';

/**
 * Export table data to CSV or JSON
 */
export async function exportData(target, tableName, options = {}) {
  let db;
  
  try {
    const connectionString = await resolveConnection(target);
    db = await createConnection(connectionString);
    
    // Query all data
    const rows = await db.query(`SELECT * FROM ${tableName}`);
    
    if (rows.length === 0) {
      if (!options.quiet) {
        console.log(chalk.yellow('No data to export'));
      }
      return;
    }
    
    const format = options.format || 'json';
    const output = options.output;
    
    let content;
    
    if (format === 'json') {
      content = JSON.stringify(rows, null, 2);
    } else if (format === 'csv') {
      content = convertToCSV(rows);
    } else {
      throw new Error(`Unsupported format: ${format}`);
    }
    
    // If output file specified, write to file
    if (output) {
      fs.writeFileSync(output, content);
      if (!options.quiet) {
        console.log(chalk.green(`✓ Exported ${rows.length} rows to ${output}`));
      }
    } else {
      // Write to stdout
      console.log(content);
    }
    
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message }, null, 2));
    } else {
      console.error(chalk.red(`✗ Export failed: ${err.message}`));
    }
    process.exit(1);
  } finally {
    if (db) {
      await db.disconnect();
    }
  }
}

/**
 * Convert rows to CSV
 */
function convertToCSV(rows) {
  if (rows.length === 0) return '';
  
  const columns = Object.keys(rows[0]);
  const header = columns.map(escapeCSV).join(',');
  
  const lines = rows.map(row => {
    return columns.map(col => {
      const val = row[col];
      if (val === null) return '';
      return escapeCSV(String(val));
    }).join(',');
  });
  
  return [header, ...lines].join('\n');
}

/**
 * Escape CSV field
 */
function escapeCSV(field) {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}
