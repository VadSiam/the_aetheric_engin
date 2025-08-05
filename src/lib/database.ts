// AI-Assisted
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

export interface AsciiMessage {
  id?: number;
  payload: string;
  timestamp: string;
  message_length: number;
}

export interface BinaryMessage {
  id?: number;
  payload: Buffer;
  payload_size: number;
  timestamp: string;
  header_verified: boolean;
}

let db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

export async function initDatabase(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
  if (db) {
    return db;
  }

  const dbPath = path.join(process.cwd(), 'aetheric_engine.db');
  
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Create msgascii table (spec-compliant + minimal enhancements)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS msgascii (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payload TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      message_length INTEGER NOT NULL
    )
  `);

  // Create msgbinary table (spec-compliant + minimal enhancements) 
  await db.exec(`
    CREATE TABLE IF NOT EXISTS msgbinary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payload BLOB NOT NULL,
      payload_size INTEGER NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      header_verified BOOLEAN DEFAULT TRUE
    )
  `);

  // Create indexes for better performance
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_msgascii_timestamp ON msgascii(timestamp);
    CREATE INDEX IF NOT EXISTS idx_msgbinary_timestamp ON msgbinary(timestamp);
  `);

  console.log('🔮 Aetheric Engine database initialized');
  return db;
}

export async function getDatabase(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
  if (!db) {
    return await initDatabase();
  }
  return db;
}

export async function insertAsciiMessage(payload: string): Promise<number> {
  const database = await getDatabase();
  const result = await database.run(
    'INSERT INTO msgascii (payload, message_length) VALUES (?, ?)',
    [payload, payload.length]
  );
  return result.lastID!;
}

export async function insertBinaryMessage(payload: Buffer, payloadSize: number): Promise<number> {
  const database = await getDatabase();
  const result = await database.run(
    'INSERT INTO msgbinary (payload, payload_size) VALUES (?, ?)',
    [payload, payloadSize]
  );
  return result.lastID!;
}

export async function getAsciiMessages(limit: number = 100): Promise<AsciiMessage[]> {
  const database = await getDatabase();
  return await database.all(
    'SELECT * FROM msgascii ORDER BY timestamp DESC LIMIT ?',
    [limit]
  );
}

export async function getBinaryMessages(limit: number = 100): Promise<BinaryMessage[]> {
  const database = await getDatabase();
  return await database.all(
    'SELECT * FROM msgbinary ORDER BY timestamp DESC LIMIT ?',
    [limit]
  );
}

export async function getMessageCounts(): Promise<{ ascii: number; binary: number; total: number }> {
  const database = await getDatabase();
  const asciiCount = await database.get('SELECT COUNT(*) as count FROM msgascii');
  const binaryCount = await database.get('SELECT COUNT(*) as count FROM msgbinary');
  
  return {
    ascii: asciiCount.count,
    binary: binaryCount.count,
    total: asciiCount.count + binaryCount.count
  };
}

export async function clearAllMessages(): Promise<void> {
  const database = await getDatabase();
  await database.exec('DELETE FROM msgascii; DELETE FROM msgbinary;');
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}