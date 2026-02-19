# mpx-db 🗄️

**Database management CLI — connect, query, migrate, and manage databases from the terminal.**

Stop juggling multiple database tools. One clean interface for SQLite, PostgreSQL, and MySQL.

Part of the [Mesaplex](https://mesaplex.com) developer toolchain.

[![npm version](https://img.shields.io/npm/v/mpx-db.svg)](https://www.npmjs.com/package/mpx-db)
[![License: Dual](https://img.shields.io/badge/license-Dual-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)

## Features

- **Multi-database support** — SQLite, PostgreSQL, MySQL
- **Beautiful output** — Colored tables, not raw dumps
- **Connection management** — Save connections, no more copy-pasting URLs
- **Migration system** — Git-friendly SQL migration files
- **Schema operations** — Dump, describe, visualize database structure
- **Data export** — Export to JSON/CSV with one command
- **Secure** — Encrypted credential storage (AES-256-GCM)
- **MCP server** — Integrates with any MCP-compatible AI agent
- **Self-documenting** — `--schema` returns machine-readable tool description

## Installation

```bash
npm install -g mpx-db
```

Install database drivers you need (optional peer dependencies):

```bash
npm install -g better-sqlite3  # For SQLite
npm install -g pg              # For PostgreSQL
npm install -g mysql2          # For MySQL
```

Or run directly with npx:

```bash
npx mpx-db --help
```

**Requirements:** Node.js 18+ · macOS, Linux, Windows

## Quick Start

```bash
# Connect and save
mpx-db connect --save dev sqlite://./dev.db

# List tables
mpx-db tables dev

# Run a query
mpx-db query dev "SELECT * FROM users LIMIT 10"

# Describe a table
mpx-db describe dev users

# Export data
mpx-db export dev users --format json
```

## Usage

### Connection Management

```bash
mpx-db connect --save <name> <url>     # Save a connection
mpx-db connections list                 # List saved connections
mpx-db connections remove <name>        # Remove a connection
```

Connection string formats:

```
sqlite://./database.db
postgres://user:password@localhost:5432/database
mysql://user:password@localhost:3306/database
```

### Querying

```bash
mpx-db query <connection> "SELECT * FROM users WHERE active = 1"
```

### Schema Operations

```bash
mpx-db info <connection>                # Database information
mpx-db tables <connection>              # List tables with row counts
mpx-db describe <connection> <table>    # Table structure
mpx-db schema dump <connection>         # Dump schema as SQL
```

### Migrations

```bash
mpx-db migrate init                     # Initialize migrations directory
mpx-db migrate create <name>            # Create a new migration
mpx-db migrate status <connection>      # Show migration status
mpx-db migrate up <connection>          # Run pending migrations
mpx-db migrate down <connection>        # Rollback last migration
```

Migration file format (`./migrations/`):

```sql
-- Up migration
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL
);

-- DOWN
DROP TABLE users;
```

### Data Export

```bash
mpx-db export <connection> <table> --format json
mpx-db export <connection> <table> --format csv --output data.csv
```

## AI Agent Usage

mpx-db is designed to be used by AI agents as well as humans.

### JSON Output

Add `--json` to any command for structured, machine-readable output:

```bash
mpx-db query dev "SELECT * FROM users LIMIT 3" --json
```

```json
{
  "success": true,
  "type": "query",
  "rows": [
    { "id": 1, "name": "Alice", "email": "alice@example.com" }
  ],
  "rowCount": 1,
  "duration": 12
}
```

### Schema Discovery

```bash
mpx-db --schema
```

Returns a complete JSON schema describing all commands, flags, inputs, outputs, and examples.

### MCP Integration

Add to your MCP client configuration (Claude Desktop, Cursor, Windsurf, etc.):

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

The MCP server exposes these tools:
- **`query`** — Execute SQL queries
- **`list_tables`** — Get all tables with row counts
- **`describe_table`** — Show table schema
- **`get_info`** — Database information
- **`export_table`** — Export table data as JSON
- **`get_schema`** — Get full command schema

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error (connection failed, query failed, etc.) |

### PDF Reports

Generate professional PDF reports from queries and schema dumps:

```bash
# Schema report — full database structure as PDF
mpx-db schema dump <connection> --pdf schema-report.pdf

# Query results as PDF
mpx-db query <connection> "SELECT * FROM users" --pdf results.pdf
```

PDFs include formatted tables, database metadata, and Mesaplex branding. Great for sharing with teammates or archiving.

### Automation Tips

- Use `--json` for machine-parseable output
- Use `--pdf <file>` for formatted reports
- Use `--quiet` to suppress banners and progress info
- Pipe output to `jq` for filtering
- Check exit codes for pass/fail in CI/CD

## Database Support

| Database   | Driver Package    | Notes                    |
|------------|-------------------|--------------------------|
| SQLite     | better-sqlite3    | File-based, great for dev|
| PostgreSQL | pg                | Full support             |
| MySQL      | mysql2            | Full support             |

Drivers are optional peer dependencies — install only what you need. If a driver is missing, you'll get a helpful error message.

## Security

- **Encrypted credentials** — Connection strings with passwords are encrypted using AES-256-GCM
- **Local storage** — Credentials stored in `~/.mpx-db/connections.json` with 600 permissions
- **Key management** — Encryption key in `~/.mpx-db/.key` (auto-generated)

⚠️ For production, use environment variables or a secrets manager rather than saved connections.

## Free vs Pro

All features are currently available in the free tier.

**Upgrade to Pro:** [https://mesaplex.com/mpx-db](https://mesaplex.com/mpx-db)

## License

Dual License — Free tier for personal use, Pro license for commercial use and advanced features. See [LICENSE](LICENSE) for full terms.

## Links

- **Website:** [https://mesaplex.com](https://mesaplex.com)
- **npm:** [https://www.npmjs.com/package/mpx-db](https://www.npmjs.com/package/mpx-db)
- **GitHub:** [https://github.com/mesaplexdev/mpx-db](https://github.com/mesaplexdev/mpx-db)
- **Support:** support@mesaplex.com

### Related Tools

- **[mpx-scan](https://www.npmjs.com/package/mpx-scan)** — Website security scanner
- **[mpx-api](https://www.npmjs.com/package/mpx-api)** — API testing, mocking, and documentation
- **[mpx-secrets-audit](https://www.npmjs.com/package/mpx-secrets-audit)** — Secret lifecycle tracking and audit

---

**Made with ❤️ by [Mesaplex](https://mesaplex.com)**
