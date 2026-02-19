/**
 * Schema Module
 * 
 * Returns a machine-readable JSON schema describing all commands,
 * flags, inputs, and outputs for AI agent discovery.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

export function getSchema() {
  return {
    tool: 'mpx-db',
    version: pkg.version,
    description: pkg.description,
    homepage: pkg.homepage,
    commands: {
      connect: {
        description: 'Test and optionally save a database connection',
        usage: 'mpx-db connect <url> [options]',
        arguments: {
          url: {
            type: 'string',
            required: true,
            description: 'Connection URL (sqlite://, postgres://, mysql://)'
          }
        },
        flags: {
          '--save': {
            type: 'string',
            description: 'Save connection with a name'
          },
          '--json': {
            type: 'boolean',
            default: false,
            description: 'Output results as structured JSON'
          },
          '--quiet': {
            type: 'boolean',
            default: false,
            description: 'Suppress non-essential output'
          }
        },
        output: {
          json: {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                connection: {
                  type: 'object',
                  properties: {
                    type: { type: 'string', enum: ['sqlite', 'postgres', 'mysql'] },
                    database: { type: 'string' },
                    path: { type: 'string' }
                  }
                },
                saved: { type: 'boolean' },
                name: { type: 'string' }
              }
            }
          }
        },
        exitCodes: {
          0: 'Connection successful',
          1: 'Connection failed'
        }
      },
      'connections list': {
        description: 'List all saved connections',
        usage: 'mpx-db connections list [--json]',
        flags: {
          '--json': {
            type: 'boolean',
            default: false,
            description: 'Output as JSON array'
          },
          '--quiet': {
            type: 'boolean',
            default: false,
            description: 'Suppress non-essential output'
          }
        },
        output: {
          json: {
            schema: {
              type: 'object',
              properties: {
                connections: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      type: { type: 'string' },
                      createdAt: { type: 'string', format: 'date-time' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      'connections remove': {
        description: 'Remove a saved connection',
        usage: 'mpx-db connections remove <name>',
        arguments: {
          name: {
            type: 'string',
            required: true,
            description: 'Connection name'
          }
        },
        flags: {
          '--json': {
            type: 'boolean',
            default: false,
            description: 'Output results as JSON'
          }
        },
        output: {
          json: {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                name: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      },
      query: {
        description: 'Execute a SQL query',
        usage: 'mpx-db query <target> <sql> [--json] [--pdf file.pdf]',
        arguments: {
          target: {
            type: 'string',
            required: true,
            description: 'Connection name or URL'
          },
          sql: {
            type: 'string',
            required: true,
            description: 'SQL query or statement to execute'
          }
        },
        flags: {
          '--json': {
            type: 'boolean',
            default: false,
            description: 'Output results as JSON'
          },
          '--pdf': {
            type: 'string',
            description: 'Export query results as a formatted PDF report'
          },
          '--quiet': {
            type: 'boolean',
            default: false,
            description: 'Suppress non-essential output'
          }
        },
        output: {
          json: {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                type: { type: 'string', enum: ['query', 'statement'] },
                rows: { type: 'array', description: 'For SELECT queries' },
                affectedRows: { type: 'number', description: 'For INSERT/UPDATE/DELETE' },
                insertId: { type: 'number', description: 'For INSERT statements' },
                duration: { type: 'number', description: 'Execution time in milliseconds' }
              }
            }
          }
        },
        exitCodes: {
          0: 'Query executed successfully',
          1: 'Query failed'
        }
      },
      info: {
        description: 'Show database information',
        usage: 'mpx-db info <target> [--json]',
        arguments: {
          target: {
            type: 'string',
            required: true,
            description: 'Connection name or URL'
          }
        },
        flags: {
          '--json': {
            type: 'boolean',
            default: false,
            description: 'Output as JSON'
          },
          '--quiet': {
            type: 'boolean',
            default: false,
            description: 'Suppress non-essential output'
          }
        },
        output: {
          json: {
            schema: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                version: { type: 'string' },
                database: { type: 'string' },
                path: { type: 'string' },
                size: { type: 'number' },
                encoding: { type: 'string' },
                tableCount: { type: 'number' }
              }
            }
          }
        }
      },
      tables: {
        description: 'List all tables',
        usage: 'mpx-db tables <target> [--json]',
        arguments: {
          target: {
            type: 'string',
            required: true,
            description: 'Connection name or URL'
          }
        },
        flags: {
          '--json': {
            type: 'boolean',
            default: false,
            description: 'Output as JSON array'
          },
          '--quiet': {
            type: 'boolean',
            default: false,
            description: 'Suppress non-essential output'
          }
        },
        output: {
          json: {
            schema: {
              type: 'object',
              properties: {
                tables: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      rowCount: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      describe: {
        description: 'Show table schema',
        usage: 'mpx-db describe <target> <table> [--json]',
        arguments: {
          target: {
            type: 'string',
            required: true,
            description: 'Connection name or URL'
          },
          table: {
            type: 'string',
            required: true,
            description: 'Table name'
          }
        },
        flags: {
          '--json': {
            type: 'boolean',
            default: false,
            description: 'Output as JSON'
          },
          '--quiet': {
            type: 'boolean',
            default: false,
            description: 'Suppress non-essential output'
          }
        },
        output: {
          json: {
            schema: {
              type: 'object',
              properties: {
                table: { type: 'string' },
                columns: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      type: { type: 'string' },
                      nullable: { type: 'boolean' },
                      defaultValue: { type: 'string' },
                      primaryKey: { type: 'boolean' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      'schema dump': {
        description: 'Dump database schema as SQL',
        usage: 'mpx-db schema dump <target> [--pdf file.pdf]',
        arguments: {
          target: {
            type: 'string',
            required: true,
            description: 'Connection name or URL'
          }
        },
        flags: {
          '--json': {
            type: 'boolean',
            default: false,
            description: 'Output as JSON with SQL content'
          },
          '--pdf': {
            type: 'string',
            description: 'Export schema as a formatted PDF report'
          },
          '--quiet': {
            type: 'boolean',
            default: false,
            description: 'Suppress non-essential output'
          }
        },
        output: {
          json: {
            schema: {
              type: 'object',
              properties: {
                sql: { type: 'string', description: 'Full schema SQL' }
              }
            }
          }
        }
      },
      'migrate init': {
        description: 'Initialize migrations directory',
        usage: 'mpx-db migrate init',
        flags: {
          '--json': {
            type: 'boolean',
            default: false,
            description: 'Output as JSON'
          }
        },
        output: {
          json: {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                directory: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      },
      'migrate create': {
        description: 'Create a new migration file',
        usage: 'mpx-db migrate create <description>',
        arguments: {
          description: {
            type: 'string',
            required: true,
            description: 'Migration description (e.g., "add_users_table")'
          }
        },
        flags: {
          '--json': {
            type: 'boolean',
            default: false,
            description: 'Output as JSON'
          }
        },
        output: {
          json: {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                filename: { type: 'string' },
                path: { type: 'string' }
              }
            }
          }
        }
      },
      'migrate status': {
        description: 'Show migration status',
        usage: 'mpx-db migrate status <target> [--json]',
        arguments: {
          target: {
            type: 'string',
            required: true,
            description: 'Connection name or URL'
          }
        },
        flags: {
          '--json': {
            type: 'boolean',
            default: false,
            description: 'Output as JSON'
          },
          '--quiet': {
            type: 'boolean',
            default: false,
            description: 'Suppress non-essential output'
          }
        },
        output: {
          json: {
            schema: {
              type: 'object',
              properties: {
                migrations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      status: { type: 'string', enum: ['pending', 'applied'] },
                      appliedAt: { type: 'string', format: 'date-time' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      'migrate up': {
        description: 'Run pending migrations',
        usage: 'mpx-db migrate up <target> [--json]',
        arguments: {
          target: {
            type: 'string',
            required: true,
            description: 'Connection name or URL'
          }
        },
        flags: {
          '--json': {
            type: 'boolean',
            default: false,
            description: 'Output as JSON'
          },
          '--quiet': {
            type: 'boolean',
            default: false,
            description: 'Suppress non-essential output'
          }
        },
        output: {
          json: {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                applied: {
                  type: 'array',
                  items: { type: 'string' }
                },
                count: { type: 'number' }
              }
            }
          }
        }
      },
      'migrate down': {
        description: 'Rollback last migration',
        usage: 'mpx-db migrate down <target> [--json]',
        arguments: {
          target: {
            type: 'string',
            required: true,
            description: 'Connection name or URL'
          }
        },
        flags: {
          '--json': {
            type: 'boolean',
            default: false,
            description: 'Output as JSON'
          },
          '--quiet': {
            type: 'boolean',
            default: false,
            description: 'Suppress non-essential output'
          }
        },
        output: {
          json: {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                rolledBack: { type: 'string' }
              }
            }
          }
        }
      },
      export: {
        description: 'Export table data',
        usage: 'mpx-db export <target> <table> [--format json|csv] [--output file.json]',
        arguments: {
          target: {
            type: 'string',
            required: true,
            description: 'Connection name or URL'
          },
          table: {
            type: 'string',
            required: true,
            description: 'Table name'
          }
        },
        flags: {
          '--format': {
            type: 'string',
            enum: ['json', 'csv'],
            default: 'json',
            description: 'Output format'
          },
          '--output': {
            type: 'string',
            description: 'Output file path'
          },
          '--quiet': {
            type: 'boolean',
            default: false,
            description: 'Suppress non-essential output'
          }
        },
        output: {
          description: 'Exports data to stdout or specified file'
        }
      },
      mcp: {
        description: 'Start MCP (Model Context Protocol) stdio server for AI agent integration',
        usage: 'mpx-db mcp',
        flags: {},
        examples: [
          { command: 'mpx-db mcp', description: 'Start MCP stdio server' }
        ]
      },
      update: {
        description: 'Check for updates and optionally install the latest version',
        usage: 'mpx-db update [--check] [--json]',
        flags: {
          '--check': { description: 'Only check for updates (do not install)', default: false },
          '--json': { description: 'Machine-readable JSON output', default: false }
        },
        examples: [
          { command: 'mpx-db update', description: 'Check and install updates' },
          { command: 'mpx-db update --check', description: 'Just check for updates' },
          { command: 'mpx-db update --check --json', description: 'Check for updates (JSON output)' }
        ]
      }
    },
    mcpConfig: {
      description: 'Add to your MCP client configuration to use mpx-db as an AI tool',
      config: {
        mcpServers: {
          'mpx-db': {
            command: 'npx',
            args: ['mpx-db', 'mcp']
          }
        }
      }
    },
    globalFlags: {
      '--json': {
        type: 'boolean',
        default: false,
        description: 'Output results as structured JSON'
      },
      '--pdf': {
        type: 'string',
        description: 'Export results as a formatted PDF report (supported by query, schema dump)'
      },
      '-q, --quiet': {
        type: 'boolean',
        default: false,
        description: 'Suppress non-essential output'
      },
      '--schema': {
        type: 'boolean',
        default: false,
        description: 'Output this schema as JSON'
      },
      '--version': {
        type: 'boolean',
        description: 'Show version number'
      },
      '--help': {
        type: 'boolean',
        description: 'Show help information'
      }
    },
    exitCodes: {
      0: 'Success',
      1: 'Error (connection failed, query failed, etc.)'
    }
  };
}
