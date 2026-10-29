import { Pool } from 'pg';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('database');

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', { error: err.message });
    });
  }

  return pool;
}

export async function initializeDatabase() {
  const p = getPool();

  // Test connection
  const client = await p.connect();
  try {
    await client.query('SELECT NOW()');
    logger.info('Database connection successful');
  } finally {
    client.release();
  }

  // Run migrations
  await runMigrations();
}

async function runMigrations() {
  const p = getPool();
  const client = await p.connect();

  try {
    // Create migrations table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get list of executed migrations
    const result = await client.query('SELECT name FROM migrations ORDER BY id');
    const executedMigrations = new Set(result.rows.map(r => r.name));

    // List of migrations to run
    const migrations = [
      { name: '001_initial_schema', fn: createInitialSchema },
      { name: '002_vector_search', fn: createVectorSchema },
      { name: '003_add_chunk_deleted_at', fn: addChunkDeletedAtColumn },
      { name: '004_add_source_language', fn: addSourceLanguageColumns },
      { name: '005_add_source_metadata', fn: addSourceMetadataColumns },
    ];

    for (const migration of migrations) {
      if (!executedMigrations.has(migration.name)) {
        logger.info(`Running migration: ${migration.name}`);
        try {
          await migration.fn(client);
          await client.query('INSERT INTO migrations (name) VALUES ($1)', [migration.name]);
          logger.info(`Completed migration: ${migration.name}`);
        } catch (migError: any) {
          logger.warn(`Migration ${migration.name} note: ${migError.message}`);
          // If vector extension isn't installed in postgres container yet, log and continue gracefully
          if (migration.name === '002_vector_search') {
            logger.warn('pgvector extension may not be installed in PostgreSQL; vector search will operate in fallback mode.');
            await client.query('INSERT INTO migrations (name) VALUES ($1)', [migration.name]);
          } else {
            throw migError;
          }
        }
      }
    }
  } finally {
    client.release();
  }
}

async function createInitialSchema(client: any) {
  // Users table
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP
    )
  `);

  // Notebooks table
  await client.query(`
    CREATE TABLE IF NOT EXISTS notebooks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id UUID NOT NULL REFERENCES users(id),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      archived_at TIMESTAMP,
      deleted_at TIMESTAMP
    )
  `);

  // Sources table
  await client.query(`
    CREATE TABLE IF NOT EXISTS sources (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      notebook_id UUID NOT NULL REFERENCES notebooks(id),
      file_name VARCHAR(255) NOT NULL,
      file_type VARCHAR(50),
      file_size INTEGER,
      file_hash VARCHAR(255),
      content_preview TEXT,
      extraction_status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP
    )
  `);

  // Source chunks table
  await client.query(`
    CREATE TABLE IF NOT EXISTS source_chunks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_id UUID NOT NULL REFERENCES sources(id),
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      location_metadata JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP
    )
  `);

  // Conversations table
  await client.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      notebook_id UUID NOT NULL REFERENCES notebooks(id),
      user_id UUID NOT NULL REFERENCES users(id),
      title VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Messages table
  await client.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES conversations(id),
      role VARCHAR(20) NOT NULL,
      content TEXT NOT NULL,
      citations JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Indexes for better query performance
  await client.query('CREATE INDEX IF NOT EXISTS idx_notebooks_owner ON notebooks(owner_id)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_sources_notebook ON sources(notebook_id)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_chunks_source ON source_chunks(source_id)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_conversations_notebook ON conversations(notebook_id)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)');
}

async function createVectorSchema(client: any) {
  await client.query('CREATE EXTENSION IF NOT EXISTS vector');
  await client.query('ALTER TABLE source_chunks ADD COLUMN IF NOT EXISTS embedding vector(1536)');
}

async function addChunkDeletedAtColumn(client: any) {
  await client.query('ALTER TABLE source_chunks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP');
}

async function addSourceLanguageColumns(client: any) {
  await client.query(`
    ALTER TABLE sources
    ADD COLUMN IF NOT EXISTS language VARCHAR(50) DEFAULT 'auto',
    ADD COLUMN IF NOT EXISTS detected_language VARCHAR(50)
  `);
}

async function addSourceMetadataColumns(client: any) {
  await client.query(`
    ALTER TABLE sources
    ADD COLUMN IF NOT EXISTS source_status VARCHAR(50) DEFAULT 'completed',
    ADD COLUMN IF NOT EXISTS status_reason TEXT,
    ADD COLUMN IF NOT EXISTS metadata_json JSONB
  `);
}
