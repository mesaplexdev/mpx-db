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

**v1.0 (Current)** ✅
- SQLite, PostgreSQL, MySQL support
- Connection management
- Query execution with beautiful output
- Schema inspection (dump, describe, tables, info)
- Migration system (create, up, down, status)
- Data export (JSON, CSV)

**v1.1 (Planned)**
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
