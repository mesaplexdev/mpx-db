import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { handleConnect, listConnections, removeConnection } from './commands/connections.js';
import { handleQuery } from './commands/query.js';
import { showInfo, listTables, describeTable, dumpSchema } from './commands/schema.js';
import { 
  initMigrations, 
  createMigration, 
  showMigrationStatus, 
  runMigrations, 
  rollbackMigration 
} from './commands/migrate.js';
import { exportData } from './commands/data.js';
import { getSchema } from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

const program = new Command();

// Global options state (passed to commands via options parameter)
let globalOptions = {};

program
  .name('mpx-db')
  .description('Database management CLI - Connect, query, migrate, and manage databases')
  .version(pkg.version)
  .option('--json', 'Output as JSON (machine-readable)')
  .option('-q, --quiet', 'Suppress non-essential output')
  .option('--no-color', 'Disable colored output')
  .option('--schema', 'Output JSON schema describing all commands and flags');

// Error handling — must be set BEFORE .command() so subcommands inherit exitOverride
program.exitOverride();
program.configureOutput({
  writeErr: () => {} // Suppress Commander's own error output; we handle it in the catch below
});

program.hook('preAction', (thisCommand) => {
    // Merge parent options with command options
    const parentOpts = thisCommand.parent?.opts() || {};
    const opts = thisCommand.opts();
    globalOptions = { ...parentOpts, ...opts };
    
    // Disable chalk if JSON mode or --no-color
    if (globalOptions.json || globalOptions.color === false) {
      chalk.level = 0;
    }
  });

// Connect command
program
  .command('connect')
  .description('Test and optionally save a database connection')
  .argument('<url>', 'Connection URL (sqlite://, postgres://, mysql://)')
  .option('-s, --save <name>', 'Save connection with a name')
  .action((url, options) => handleConnect(url, { ...globalOptions, ...options }));

// Connections command
const connections = program
  .command('connections')
  .description('Manage saved connections');

connections
  .command('list')
  .description('List all saved connections')
  .action(() => listConnections(globalOptions));

connections
  .command('remove')
  .description('Remove a saved connection')
  .argument('<name>', 'Connection name')
  .action((name) => removeConnection(name, globalOptions));

// Query command
program
  .command('query')
  .description('Execute a SQL query')
  .argument('<target>', 'Connection name or URL')
  .argument('<sql>', 'SQL query to execute')
  .action((target, sql) => handleQuery(target, sql, globalOptions));

// Info command
program
  .command('info')
  .description('Show database information')
  .argument('<target>', 'Connection name or URL')
  .action((target) => showInfo(target, globalOptions));

// Tables command
program
  .command('tables')
  .description('List all tables')
  .argument('<target>', 'Connection name or URL')
  .action((target) => listTables(target, globalOptions));

// Describe command
program
  .command('describe')
  .description('Show table schema')
  .argument('<target>', 'Connection name or URL')
  .argument('<table>', 'Table name')
  .action((target, table) => describeTable(target, table, globalOptions));

// Schema commands
const schema = program
  .command('schema')
  .description('Schema operations');

schema
  .command('dump')
  .description('Dump database schema as SQL')
  .argument('<target>', 'Connection name or URL')
  .action((target) => dumpSchema(target, globalOptions));

// Migration commands
const migrate = program
  .command('migrate')
  .description('Database migration commands');

migrate
  .command('init')
  .description('Initialize migrations directory')
  .action(() => initMigrations(globalOptions));

migrate
  .command('create')
  .description('Create a new migration file')
  .argument('<description>', 'Migration description')
  .action((description) => createMigration(description, globalOptions));

migrate
  .command('status')
  .description('Show migration status')
  .argument('<target>', 'Connection name or URL')
  .action((target) => showMigrationStatus(target, globalOptions));

migrate
  .command('up')
  .description('Run pending migrations')
  .argument('<target>', 'Connection name or URL')
  .action((target) => runMigrations(target, globalOptions));

migrate
  .command('down')
  .description('Rollback last migration')
  .argument('<target>', 'Connection name or URL')
  .action((target) => rollbackMigration(target, globalOptions));

// Export command
program
  .command('export')
  .description('Export table data')
  .argument('<target>', 'Connection name or URL')
  .argument('<table>', 'Table name')
  .option('-f, --format <format>', 'Output format (json, csv)', 'json')
  .option('-o, --output <file>', 'Output file path')
  .action((target, table, options) => exportData(target, table, { ...globalOptions, ...options }));

// Update subcommand
program
  .command('update')
  .description('Check for updates and optionally install the latest version')
  .option('--check', 'Only check for updates (do not install)')
  .action(async (options) => {
    const { checkForUpdate, performUpdate } = await import('./update.js');
    const jsonMode = globalOptions.json;

    try {
      const info = checkForUpdate();

      if (jsonMode) {
        const output = {
          current: info.current,
          latest: info.latest,
          updateAvailable: info.updateAvailable,
          isGlobal: info.isGlobal
        };

        if (!options.check && info.updateAvailable) {
          try {
            const result = performUpdate(info.isGlobal);
            output.updated = true;
            output.newVersion = result.version;
          } catch (err) {
            output.updated = false;
            output.error = err.message;
          }
        }

        console.log(JSON.stringify(output, null, 2));
        process.exit(0);
        return;
      }

      // Human-readable output
      if (!info.updateAvailable) {
        console.log('');
        console.log(chalk.green.bold(`✓ mpx-db v${info.current} is up to date`));
        console.log('');
        process.exit(0);
        return;
      }

      console.log('');
      console.log(chalk.yellow.bold(`⬆ Update available: v${info.current} → v${info.latest}`));

      if (options.check) {
        console.log(chalk.gray(`Run ${chalk.cyan('mpx-db update')} to install`));
        console.log('');
        process.exit(0);
        return;
      }

      console.log(chalk.gray(`Installing v${info.latest}${info.isGlobal ? ' (global)' : ''}...`));

      const result = performUpdate(info.isGlobal);
      console.log(chalk.green.bold(`✓ Updated to v${result.version}`));
      console.log('');
      process.exit(0);
    } catch (err) {
      if (jsonMode) {
        console.log(JSON.stringify({ error: err.message, code: 'ERR_UPDATE' }, null, 2));
      } else {
        console.error(chalk.red('Error:'), err.message);
        console.error('');
      }
      process.exit(1);
    }
  });

// MCP subcommand
program
  .command('mcp')
  .description('Start MCP (Model Context Protocol) stdio server')
  .action(async () => {
    try {
      const { startMCPServer } = await import('./mcp.js');
      await startMCPServer();
    } catch (err) {
      console.error(JSON.stringify({ error: err.message, code: 'ERR_MCP_START' }));
      process.exit(1);
    }
  });

// Handle --schema before parsing (to avoid argument validation)
if (process.argv.includes('--schema')) {
  console.log(JSON.stringify(getSchema(), null, 2));
  process.exit(0);
}

try {
  await program.parseAsync(process.argv);
} catch (err) {
  // Ignore help and version display "errors"
  if (err.code === 'commander.version') {
    process.exit(0);
  }
  if (err.code !== 'commander.help' && err.code !== 'commander.helpDisplayed') {
    const msg = err.message.startsWith('error:') ? `Error: ${err.message.slice(7)}` : `Error: ${err.message}`;
    console.error(chalk.red(msg));
    process.exit(1);
  }
}
