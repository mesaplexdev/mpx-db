/**
 * MCP (Model Context Protocol) Server
 * 
 * Exposes mpx-db capabilities as MCP tools for AI agent integration.
 * Runs over stdio transport.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createConnection } from './db/connection.js';
import { getConnection } from './utils/config.js';
import { getSchema } from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

/**
 * Resolve connection string from target (name or URL)
 */
function resolveConnection(target) {
  const saved = getConnection(target);
  if (saved) {
    return saved.url;
  }
  
  if (target.includes('://')) {
    return target;
  }
  
  throw new Error(`Connection "${target}" not found`);
}

export async function startMCPServer() {
  const server = new Server(
    { name: 'mpx-db', version: pkg.version },
    { capabilities: { tools: {} } }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'query',
          description: 'Execute a SQL query or statement on a database. Returns rows for SELECT queries, or execution details for INSERT/UPDATE/DELETE/DDL statements.',
          inputSchema: {
            type: 'object',
            properties: {
              target: {
                type: 'string',
                description: 'Connection name (saved) or connection URL (sqlite://, postgres://, mysql://)'
              },
              sql: {
                type: 'string',
                description: 'SQL query or statement to execute'
              }
            },
            required: ['target', 'sql']
          }
        },
        {
          name: 'list_tables',
          description: 'List all tables in the database with row counts.',
          inputSchema: {
            type: 'object',
            properties: {
              target: {
                type: 'string',
                description: 'Connection name or URL'
              }
            },
            required: ['target']
          }
        },
        {
          name: 'describe_table',
          description: 'Show the schema/structure of a specific table (columns, types, constraints).',
          inputSchema: {
            type: 'object',
            properties: {
              target: {
                type: 'string',
                description: 'Connection name or URL'
              },
              table: {
                type: 'string',
                description: 'Table name'
              }
            },
            required: ['target', 'table']
          }
        },
        {
          name: 'get_info',
          description: 'Get database information (type, version, size, table count).',
          inputSchema: {
            type: 'object',
            properties: {
              target: {
                type: 'string',
                description: 'Connection name or URL'
              }
            },
            required: ['target']
          }
        },
        {
          name: 'export_table',
          description: 'Export all data from a table as JSON.',
          inputSchema: {
            type: 'object',
            properties: {
              target: {
                type: 'string',
                description: 'Connection name or URL'
              },
              table: {
                type: 'string',
                description: 'Table name'
              }
            },
            required: ['target', 'table']
          }
        },
        {
          name: 'get_schema',
          description: 'Get the full JSON schema describing all mpx-db commands, flags, and output formats.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        }
      ]
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'query': {
          const connectionString = resolveConnection(args.target);
          const db = await createConnection(connectionString);
          
          try {
            const sql = args.sql.trim();
            const isSelectQuery = /^(SELECT|PRAGMA|EXPLAIN|WITH|SHOW|DESCRIBE|DESC)\s/i.test(sql);
            
            const startTime = Date.now();
            let result;
            
            if (isSelectQuery) {
              const rows = await db.query(sql);
              const duration = Date.now() - startTime;
              result = {
                success: true,
                type: 'query',
                rows,
                rowCount: rows.length,
                duration
              };
            } else {
              const execResult = await db.execute(sql);
              const duration = Date.now() - startTime;
              result = {
                success: true,
                type: 'statement',
                affectedRows: execResult.affectedRows,
                insertId: execResult.insertId,
                duration
              };
            }
            
            await db.disconnect();
            
            return {
              content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }]
            };
          } catch (err) {
            await db.disconnect();
            throw err;
          }
        }

        case 'list_tables': {
          const connectionString = resolveConnection(args.target);
          const db = await createConnection(connectionString);
          
          try {
            const tables = await db.getTables();
            await db.disconnect();
            
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({ tables }, null, 2)
              }]
            };
          } catch (err) {
            await db.disconnect();
            throw err;
          }
        }

        case 'describe_table': {
          const connectionString = resolveConnection(args.target);
          const db = await createConnection(connectionString);
          
          try {
            const schema = await db.getTableSchema(args.table);
            await db.disconnect();
            
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({ table: args.table, columns: schema }, null, 2)
              }]
            };
          } catch (err) {
            await db.disconnect();
            throw err;
          }
        }

        case 'get_info': {
          const connectionString = resolveConnection(args.target);
          const db = await createConnection(connectionString);
          
          try {
            const info = await db.getInfo();
            await db.disconnect();
            
            return {
              content: [{
                type: 'text',
                text: JSON.stringify(info, null, 2)
              }]
            };
          } catch (err) {
            await db.disconnect();
            throw err;
          }
        }

        case 'export_table': {
          const connectionString = resolveConnection(args.target);
          const db = await createConnection(connectionString);
          
          try {
            const rows = await db.query(`SELECT * FROM ${args.table}`);
            await db.disconnect();
            
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({ table: args.table, rows, count: rows.length }, null, 2)
              }]
            };
          } catch (err) {
            await db.disconnect();
            throw err;
          }
        }

        case 'get_schema': {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(getSchema(), null, 2)
            }]
          };
        }

        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true
          };
      }
    } catch (err) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: err.message, code: 'ERR_QUERY' }, null, 2)
        }],
        isError: true
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
