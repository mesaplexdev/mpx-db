import crypto from 'crypto';
import os from 'os';
import fs from 'fs';
import path from 'path';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Get or create encryption key
 */
function getEncryptionKey() {
  const configDir = path.join(os.homedir(), '.mpx-db');
  const keyFile = path.join(configDir, '.key');

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true, mode: 0o700 });
  }

  if (fs.existsSync(keyFile)) {
    return fs.readFileSync(keyFile);
  }

  // Generate new key
  const key = crypto.randomBytes(KEY_LENGTH);
  fs.writeFileSync(keyFile, key, { mode: 0o600 });
  return key;
}

/**
 * Encrypt a string
 */
export function encrypt(text) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Return iv + authTag + encrypted
  return iv.toString('hex') + authTag.toString('hex') + encrypted;
}

/**
 * Decrypt a string
 */
export function decrypt(encrypted) {
  const key = getEncryptionKey();
  
  // Extract iv, authTag, and encrypted data
  const iv = Buffer.from(encrypted.slice(0, IV_LENGTH * 2), 'hex');
  const authTag = Buffer.from(encrypted.slice(IV_LENGTH * 2, (IV_LENGTH + TAG_LENGTH) * 2), 'hex');
  const encryptedData = encrypted.slice((IV_LENGTH + TAG_LENGTH) * 2);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
