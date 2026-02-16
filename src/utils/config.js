import fs from 'fs';
import path from 'path';
import os from 'os';
import { encrypt, decrypt } from './crypto.js';

const CONFIG_DIR = path.join(os.homedir(), '.mpx-db');
const CONNECTIONS_FILE = path.join(CONFIG_DIR, 'connections.json');

/**
 * Ensure config directory exists
 */
function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Load all saved connections
 */
export function loadConnections() {
  ensureConfigDir();
  
  if (!fs.existsSync(CONNECTIONS_FILE)) {
    return {};
  }
  
  const data = JSON.parse(fs.readFileSync(CONNECTIONS_FILE, 'utf8'));
  
  // Decrypt passwords
  const connections = {};
  for (const [name, conn] of Object.entries(data)) {
    connections[name] = {
      ...conn,
      url: conn.encrypted ? decrypt(conn.url) : conn.url
    };
  }
  
  return connections;
}

/**
 * Save a connection
 */
export function saveConnection(name, url) {
  ensureConfigDir();
  
  const connections = {};
  if (fs.existsSync(CONNECTIONS_FILE)) {
    const data = JSON.parse(fs.readFileSync(CONNECTIONS_FILE, 'utf8'));
    Object.assign(connections, data);
  }
  
  // Parse URL to extract type
  const type = url.split(':')[0];
  
  connections[name] = {
    type,
    url: encrypt(url),
    encrypted: true,
    createdAt: new Date().toISOString()
  };
  
  fs.writeFileSync(CONNECTIONS_FILE, JSON.stringify(connections, null, 2), { mode: 0o600 });
}

/**
 * Delete a connection
 */
export function deleteConnection(name) {
  ensureConfigDir();
  
  if (!fs.existsSync(CONNECTIONS_FILE)) {
    return false;
  }
  
  const connections = JSON.parse(fs.readFileSync(CONNECTIONS_FILE, 'utf8'));
  
  if (!connections[name]) {
    return false;
  }
  
  delete connections[name];
  fs.writeFileSync(CONNECTIONS_FILE, JSON.stringify(connections, null, 2), { mode: 0o600 });
  
  return true;
}

/**
 * Get a specific connection
 */
export function getConnection(name) {
  const connections = loadConnections();
  return connections[name] || null;
}

/**
 * Load project config (.mpx-db.yaml)
 */
export function loadProjectConfig() {
  const configPath = path.join(process.cwd(), '.mpx-db.yaml');
  
  if (!fs.existsSync(configPath)) {
    return null;
  }
  
  // We'll parse YAML when needed, for now just check existence
  return configPath;
}
