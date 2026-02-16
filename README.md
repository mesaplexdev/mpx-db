# mpx-db

**Database management CLI** — Connect, query, migrate, and manage databases from the terminal.

Stop juggling multiple database tools. `mpx-db` gives you one clean interface for SQLite, PostgreSQL, and MySQL.

## Features

✅ **Multi-database support** — SQLite, PostgreSQL, MySQL  
✅ **Beautiful output** — Colored tables, not raw dumps  
✅ **Connection management** — Save connections, no more copy-pasting URLs  
✅ **Migration system** — Git-friendly SQL migration files  
✅ **Schema operations** — Dump, describe, visualize database structure  
✅ **Data export** — Export to JSON/CSV with one command  
✅ **Secure** — Encrypted credential storage  
✅ **AI-native** — JSON output, MCP server, schema discovery for AI agents  

## Installation

```bash
npm install -g mpx-db

# Install database drivers you need (optional peer deps)
npm install -g better-sqlite3  # For SQLite
npm install -g pg              # For PostgreSQL
npm install -g mysql2          # For MySQL
```

## Quick Start

```bash
# Connect to a database
mpx-db connect sqlite://./mydb.db

# Save a connection for reuse
mpx-db connect --save dev sqlite://./dev.db
mpx-db connect --save prod postgres://user:pass@localhost:5432/mydb

# List saved connections
mpx-db connections list

# Query a database
mpx-db query dev "SELECT * FROM users LIMIT 10"

# Show database info
mpx-db info dev

# List all tables
mpx-db tables dev

# Describe a table
mpx-db describe dev users
```

## Connection Strings

```bash
# SQLite (file-based)
sqlite://./database.db
sqlite:///absolute/path/to/db.sqlite

# PostgreSQL
postgres://user:password@localhost:5432/database
postgresql://user:password@host:5432/db

# MySQL
mysql://user:password@localhost:3306/database
```

## Commands

### Connection Management

```bash
# Test and save a connection
mpx-db connect --save <name> <url>

# List saved connections
mpx-db connections list

# Remove a saved connection
mpx-db connections remove <name>
```

### Querying

```bash
# Run a query
mpx-db query <connection> "SELECT * FROM users WHERE active = 1"

# Query with saved connection
mpx-db query dev "SELECT COUNT(*) FROM orders"
```

### Schema Operations

```bash
# Show database information
mpx-db info <connection>

# List all tables with row counts
mpx-db tables <connection>

# Describe table structure
mpx-db describe <connection> <table>

# Dump entire schema as SQL
mpx-db schema dump <connection>
```

### Migrations

```bash
# Initialize migrations directory
mpx-db migrate init

# Create a new migration
mpx-db migrate create add_users_table

# Show migration status
mpx-db migrate status <connection>

# Run pending migrations
mpx-db migrate up <connection>

# Rollback last migration
mpx-db migrate down <connection>
```

#### Migration File Format

Migrations are SQL files in `./migrations/` directory:

```sql
-- Migration: add_users_table
-- Created: 2026-02-15T10:30:00.000Z

-- Up migration
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- Down migration (rollback)
-- DOWN
DROP INDEX idx_users_email;
DROP TABLE users;
```

### Data Operations

```bash
# Export table data to JSON
mpx-db export dev users --format json

# Export to CSV
mpx-db export dev users --format csv --output data.csv
```

## Examples

### Setting Up a New Project

```bash
# Initialize migrations
mpx-db migrate init

# Create your first migration
mpx-db migrate create create_initial_schema

# Edit migrations/YYYYMMDD_HHMMSS_create_initial_schema.sql
# Add your CREATE TABLE statements

# Connect to database
mpx-db connect --save dev sqlite://./dev.db

# Run migrations
mpx-db migrate up dev

# Verify
mpx-db tables dev
mpx-db info dev
```

### Managing Multiple Environments

```bash
# Save connections for each environment
mpx-db connect --save dev sqlite://./dev.db
mpx-db connect --save staging postgres://user:pass@staging-host/mydb
mpx-db connect --save prod postgres://user:pass@prod-host/mydb

# Run migrations on each
mpx-db migrate up dev
mpx-db migrate up staging
mpx-db migrate up prod

# Compare schemas (visual inspection)
mpx-db schema dump dev > dev-schema.sql
mpx-db schema dump prod > prod-schema.sql
diff dev-schema.sql prod-schema.sql
```

### Daily Workflow

```bash
# Check database status
mpx-db info dev
mpx-db tables dev

# Run a quick query
mpx-db query dev "SELECT COUNT(*) FROM orders WHERE created_at > date('now', '-1 day')"

# Describe a table before modifying it
mpx-db describe dev orders

# Create a migration for changes
mpx-db migrate create add_order_status_field

# Export data for backup/analysis
mpx-db export dev orders --format csv --output orders-backup.csv
```

## AI Agent Usage

`mpx-db` is **AI-native** — designed for both humans and AI agents. Every command supports machine-readable output and schema discovery.

### JSON Output

Add `--json` to any command for structured output:

```bash
# Query with JSON output
mpx-db query dev "SELECT * FROM users LIMIT 3" --json
{
  "success": true,
  "type": "query",
  "rows": [
    { "id": 1, "name": "Alice", "email": "alice@example.com" },
    { "id": 2, "name": "Bob", "email": "bob@example.com" },
    { "id": 3, "name": "Charlie", "email": "charlie@example.com" }
  ],
  "rowCount": 3,
  "duration": 12
}

# List tables with JSON
mpx-db tables dev --json
{
  "tables": [
    { "name": "users", "type": "table", "rowCount": 150 },
    { "name": "orders", "type": "table", "rowCount": 892 }
  ]
}

# Migration status
mpx-db migrate status dev --json
{
  "migrations": [
    { "name": "20260215_100000_create_users", "status": "applied", "appliedAt": "2026-02-15T10:05:00.000Z" },
    { "name": "20260216_120000_add_orders", "status": "pending", "appliedAt": null }
  ]
}
```

### Schema Discovery

Get the full command schema for AI agent integration:

```bash
mpx-db --schema
```

Returns a comprehensive JSON schema describing all commands, flags, inputs, outputs, and examples.

### MCP (Model Context Protocol) Server

Run `mpx-db` as an MCP server for seamless AI agent integration:

```bash
mpx-db mcp
```

#### Claude Desktop Integration

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "mpx-db": {
      "command": "npx",
      "args": ["mpx-db", "mcp"]
    }
  }
}
```

Now Claude can directly query your databases, inspect schemas, and run migrations!

#### Available MCP Tools

- `query` — Execute SQL queries
- `list_tables` — Get all tables with row counts
- `describe_table` — Show table schema
- `get_info` — Database information
- `export_table` — Export table data as JSON
- `get_schema` — Get full command schema

### Quiet Mode

Suppress non-essential output with `--quiet`:

```bash
# Just the data, no banners or progress messages
mpx-db query dev "SELECT COUNT(*) FROM users" --quiet --json
```

### Exit Codes

Predictable exit codes for CI/CD and scripting:

- `0` — Success
- `1` — Error (connection failed, query failed, etc.)

```bash
#!/bin/bash
if mpx-db query dev "SELECT 1" --quiet; then
  echo "Database is up"
else
  echo "Database is down"
  exit 1
fi
```

### Example: AI Agent Workflow

```javascript
// AI agent discovers available commands
const schema = await exec('mpx-db --schema');

// Agent queries database
const result = await exec('mpx-db query dev "SELECT * FROM orders WHERE status = \'pending\'" --json');
const orders = JSON.parse(result.stdout);

// Agent inspects schema
const tables = await exec('mpx-db tables dev --json');

// Agent runs migration
await exec('mpx-db migrate up dev --json --quiet');
```

## Architecture

```
mpx-db/
├── bin/
│   └── mpx-db.js          # CLI entry point
├── src/
│   ├── cli.js             # Command definitions
│   ├── commands/          # Command implementations
│   │   ├── connections.js
│   │   ├── query.js
│   │   ├── schema.js
│   │   ├── migrate.js
│   │   └── data.js
│   ├── db/                # Database adapters
│   │   ├── base-adapter.js
│   │   ├── sqlite-adapter.js
│   │   ├── postgres-adapter.js
│   │   ├── mysql-adapter.js
│   │   └── connection.js
│   └── utils/             # Utilities
│       ├── crypto.js      # Credential encryption
│       └── config.js      # Config management
└── test/                  # Test suite
```

## Security

- **Encrypted credentials** — Connection strings with passwords are encrypted using AES-256-GCM
- **Local storage** — Credentials stored in `~/.mpx-db/connections.json` with 600 permissions
- **Key management** — Encryption key stored in `~/.mpx-db/.key` (auto-generated)

⚠️ **Note:** While credentials are encrypted at rest, this is not a substitute for proper secrets management in production. For production deployments, use environment variables or a secrets manager.

## Database Support

| Database   | Status | Driver Package    | Notes                    |
|------------|--------|-------------------|--------------------------|
| SQLite     | ✅     | better-sqlite3    | File-based, great for dev|
| PostgreSQL | ✅     | pg                | Full support             |
| MySQL      | ✅     | mysql2            | Full support             |

**Note:** Database drivers are optional peer dependencies. Install only what you need:

```bash
npm install -g better-sqlite3  # For SQLite
npm install -g pg              # For PostgreSQL  
npm install -g mysql2          # For MySQL
```

If you try to connect without the required driver, you'll get a helpful error message:

```
✗ SQLite driver not found. Install it with:
  npm install better-sqlite3
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

Test suite includes:
- Connection management (4 tests)
- Schema operations (4 tests)
- Query operations (5 tests)
- Migrations (4 tests)
- Data export (3 tests)

**Total: 23 tests** ✅

## Why mpx-db?

**The problem:** Developers juggle multiple CLI tools (psql, mysql, sqlite3), each with different syntax. Schema changes require hand-written migrations. No easy way to compare schemas across environments.

**The solution:** One tool, consistent interface, automatic schema inspection, git-friendly migrations.

**Inspiration:** Tools like [Skeema](https://www.skeema.io/) prove this model works. But Skeema is MySQL-only and expensive for small teams. `mpx-db` is open source, multi-database, and focused on developer ergonomics.

## Roadmap

**v1.1 (Current)** ✅
- SQLite, PostgreSQL, MySQL support
- Connection management
- Query execution with beautiful output
- Schema inspection (dump, describe, tables, info)
- Migration system (create, up, down, status)
- Data export (JSON, CSV)
- **AI-native features:** JSON output (`--json`), schema discovery (`--schema`), MCP server mode
- **Quiet mode** (`--quiet`) for scripting
- Predictable exit codes

**v1.2 (Planned)**
- Interactive query REPL mode
- Query history and favorites
- Auto-complete for table/column names
- Migration templates (create table, add column, etc.)

**v2.0 (Future)**
- Schema diff between environments
- Auto-generate migrations from schema changes
- Visual schema diagrams (ASCII art)
- Data seeding from JSON/CSV
- Database backup & restore
- Support for MongoDB, Redis

## Contributing

Issues and PRs welcome! This is an open-source project.

## License

MIT

---

**Built with:** Node.js, Commander.js, better-sqlite3, chalk, cli-table3

**Made by Mesaplex** — Build tools that actually work.
