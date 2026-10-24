# SourcePilot Database Schema

## Overview

This document describes the PostgreSQL database schema for SourcePilot. The schema is designed to support multi-tenant notebooks, document ingestion, retrieval-augmented generation (RAG), and learning artifact management.

## Core Tables

### users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);
```

**Purpose**: Store user account information
**Indexes**: email (UNIQUE)
**Relations**: 1 user → many notebooks, conversations

### notebooks

```sql
CREATE TABLE notebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  archived_at TIMESTAMP,
  deleted_at TIMESTAMP
);
```

**Purpose**: Group documents and conversations by notebook
**Indexes**: owner_id
**Relations**: 1 notebook → many sources, conversations

### sources

```sql
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES sources(id),
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50),
  file_size INTEGER,
  file_hash VARCHAR(255),
  content_preview TEXT,
  extraction_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);
```

**Purpose**: Store uploaded documents
**Extraction Status**: pending, processing, completed, failed
**Indexes**: notebook_id, file_hash
**Relations**: 1 source → many chunks, citations

### source_chunks

```sql
CREATE TABLE source_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES sources(id),
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  location_metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose**: Store parsed and segmented document content
**Location Metadata Example**:
```json
{
  "page": 5,
  "section": "Introduction",
  "timestamp": "00:05:32",
  "start_offset": 1024,
  "end_offset": 2048
}
```
**Indexes**: source_id, chunk_index

### conversations

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES notebooks(id),
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose**: Store chat conversation threads
**Indexes**: notebook_id, user_id, notebook_id + user_id
**Relations**: 1 conversation → many messages

### messages

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  citations JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose**: Store individual chat messages
**Role**: user | assistant
**Citations Example**:
```json
[
  {
    "source_id": "uuid",
    "chunk_id": "uuid",
    "passage_text": "...",
    "location": { "page": 5 }
  }
]
```
**Indexes**: conversation_id

## Planned Tables (Phase 2+)

### embeddings

```sql
CREATE TABLE embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id UUID NOT NULL REFERENCES source_chunks(id),
  embedding vector(1536),
  provider VARCHAR(50),
  model VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose**: Store vector embeddings for semantic search
**Index**: HNSW or IVFFlat for pgvector

### notes

```sql
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES notebooks(id),
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255),
  content TEXT,
  tags TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);
```

### artifacts

```sql
CREATE TABLE artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES notebooks(id),
  user_id UUID NOT NULL REFERENCES users(id),
  artifact_type VARCHAR(50),
  title VARCHAR(255),
  content JSONB,
  status VARCHAR(50),
  source_ids UUID[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);
```

**Artifact Types**: report, flashcard, quiz, mind_map, infographic, presentation, audio, video

### citations

```sql
CREATE TABLE citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id),
  source_id UUID NOT NULL REFERENCES sources(id),
  chunk_id UUID NOT NULL REFERENCES source_chunks(id),
  passage_text TEXT,
  location_metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose**: Store normalized citation data for analysis and verification

### research_jobs

```sql
CREATE TABLE research_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES notebooks(id),
  user_id UUID NOT NULL REFERENCES users(id),
  query TEXT NOT NULL,
  status VARCHAR(50),
  results JSONB,
  error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose**: Track research and web search jobs

### shared_links

```sql
CREATE TABLE shared_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES notebooks(id),
  created_by_id UUID NOT NULL REFERENCES users(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP,
  access_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### audit_logs

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  changes JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose**: Audit trail for security and compliance

### notebook_permissions

```sql
CREATE TABLE notebook_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES notebooks(id),
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP
);
```

**Role**: viewer | editor | admin

## Indexes

### Performance Critical Indexes

```sql
-- Notebook queries
CREATE INDEX idx_notebooks_owner ON notebooks(owner_id);
CREATE INDEX idx_notebooks_owner_deleted ON notebooks(owner_id, deleted_at);

-- Source queries
CREATE INDEX idx_sources_notebook ON sources(notebook_id);
CREATE INDEX idx_sources_notebook_status ON sources(notebook_id, extraction_status);
CREATE INDEX idx_sources_hash ON sources(file_hash);

-- Chunk retrieval
CREATE INDEX idx_chunks_source ON source_chunks(source_id);
CREATE INDEX idx_chunks_source_index ON source_chunks(source_id, chunk_index);

-- Conversation queries
CREATE INDEX idx_conversations_notebook ON conversations(notebook_id);
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);

-- Message queries
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- Full-text search (when needed)
CREATE INDEX idx_sources_name_search ON sources USING GIN(to_tsvector('english', file_name));
CREATE INDEX idx_chunks_content_search ON source_chunks USING GIN(to_tsvector('english', content));
```

### Vector Search Index (pgvector)

```sql
-- Embeddings approximate nearest neighbor search
CREATE INDEX idx_embeddings_vector ON embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

## Partitioning Strategy (for large scale)

```sql
-- Partition messages by conversation (if > 100M rows)
CREATE TABLE messages_partitioned (
  -- Same schema as messages
) PARTITION BY HASH (conversation_id);

-- Partition chunks by source (if > 1B rows)
CREATE TABLE source_chunks_partitioned (
  -- Same schema as source_chunks
) PARTITION BY HASH (source_id);
```

## Soft Deletion

All core entities support soft deletion via `deleted_at` timestamp:

```sql
-- Query active records
SELECT * FROM notebooks WHERE deleted_at IS NULL;

-- Query deleted records
SELECT * FROM notebooks WHERE deleted_at IS NOT NULL;

-- Cascade soft deletion
UPDATE sources SET deleted_at = NOW() WHERE notebook_id = $1 AND deleted_at IS NULL;
UPDATE source_chunks SET deleted_at = NOW() WHERE source_id IN (SELECT id FROM sources WHERE notebook_id = $1);
```

## Data Retention Policies

### Active Data
- Users: indefinite (until account deletion)
- Notebooks: indefinite
- Sources: indefinite
- Chunks: indefinite
- Conversations: indefinite
- Messages: indefinite

### Audit Logs
- Retention: 1 year minimum
- Deletion: After 7 years (configurable)

### Backups
- Daily full backups for 7 days
- Weekly backups for 1 month
- Monthly backups for 1 year

## Transaction Guarantees

### ACID Compliance
- All writes use transactions
- Foreign key constraints enforced
- Isolation level: READ_COMMITTED (default)

### Long-Running Operations

For operations that might span multiple database calls:

```sql
BEGIN;
  -- Multiple operations
  INSERT INTO sources (...) RETURNING id;
  UPDATE notebooks SET updated_at = NOW() WHERE id = $1;
COMMIT;
```

## Migration Strategy

Migrations are version-controlled in `packages/backend/src/db/migrations/`:

```
001_initial_schema.ts
002_add_embeddings.ts
003_add_permissions.ts
...
```

Each migration:
1. Creates new tables/indexes
2. Alters existing tables
3. Provides rollback (when possible)
4. Includes data migration if needed

## Performance Tuning

### Query Optimization

```sql
-- Analyze query plans
EXPLAIN ANALYZE SELECT ... FROM source_chunks WHERE source_id = $1;

-- Check index usage
SELECT schemaname, tablename, indexname FROM pg_indexes WHERE tablename = 'source_chunks';

-- Check index size
SELECT indexname, pg_size_pretty(pg_relation_size(indexrelid)) FROM pg_stat_user_indexes;
```

### Vacuum and Analyze

```sql
-- Manual maintenance (automatic by default)
VACUUM ANALYZE source_chunks;
REINDEX TABLE source_chunks;
```

## Backup and Recovery

### Full Database Backup

```bash
pg_dump -Fc sourcepilot > sourcepilot.dump

# With compression
pg_dump sourcepilot | gzip > sourcepilot.sql.gz
```

### Point-in-Time Recovery (PITR)

```bash
# WAL archiving configuration
wal_level = replica
archive_mode = on
archive_command = 'cp %p /wal_archive/%f'
```

---

For more details on data architecture, see:
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [MASTER_SPECIFICATION.md](MASTER_SPECIFICATION.md) - Section R
