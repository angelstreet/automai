/**
 * Encryption utilities for sensitive data
 * Uses Node.js crypto for server-side encryption
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// Algorithm to use for encryption (AES 256 with GCM mode for authenticated encryption)
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt sensitive data using AES-GCM
 * @param text The plaintext to encrypt
 * @returns The encrypted text as a string in format iv:authTag:encryptedData
 */
export function encryptValue(text: string): string {
  if (!text) return text;

  try {
    // Get encryption key directly from the environment variable
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      console.error('[@utils:encryption:encryptValue] No encryption key found in environment');
      return text; // Return original text if no key is available
    }

    // Generate a random initialization vector
    const iv = randomBytes(16);

    // Create cipher with key derived from the environment variable
    const cipher = createCipheriv(ALGORITHM, Buffer.from(encryptionKey, 'base64'), iv);

    // Encrypt the data
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get authentication tag (for integrity verification)
    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('[@utils:encryption:encryptValue] Encryption error:', error);
    return text; // Return original text on error
  }
}

/**
 * Decrypt sensitive data that was encrypted with encryptValue
 * @param encryptedText The encrypted text in format iv:authTag:encryptedData
 * @returns The decrypted plaintext
 */
export function decryptValue(encryptedText: string): string {
  if (!encryptedText || !encryptedText.includes(':')) return encryptedText;

  try {
    // Get encryption key directly from the environment variable
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      console.error('[@utils:encryption:decryptValue] No encryption key found in environment');
      return encryptedText; // Return encrypted text if no key is available
    }

    // Split the encrypted text into iv, authTag, and encryptedData
    const [ivHex, authTagHex, encryptedData] = encryptedText.split(':');

    // Validate parts
    if (!ivHex || !authTagHex || !encryptedData) {
      console.error('[@utils:encryption:decryptValue] Invalid encrypted text format');
      return encryptedText;
    }

    // Convert hex strings to Buffers
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedData, 'hex');

    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, Buffer.from(encryptionKey, 'base64'), iv);

    // Set authentication tag for verification
    decipher.setAuthTag(authTag);

    // Decrypt the data
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('[@utils:encryption:decryptValue] Decryption error:', error);
    return encryptedText; // Return encrypted text on error
  }
}