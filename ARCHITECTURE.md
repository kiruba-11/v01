# SourcePilot Architecture

## System Overview

SourcePilot is built as a full-stack web application with clear separation between frontend, backend, and data layers.

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Browser                           │
│  ┌───────────────────────────────────────────────────────┐   │
│  │              React Application (Vite)                 │   │
│  │  - Authentication (Zustand)                           │   │
│  │  - Data fetching (React Query)                        │   │
│  │  - Navigation (React Router)                          │   │
│  └─────────────────────────┬───────────────────────────┘   │
└────────────────────────────┼──────────────────────────────┘
                             │ HTTP/REST
┌────────────────────────────┼──────────────────────────────┐
│                    Backend Server                          │
│  ┌─────────────────────────────────────────────────────┐  │
│  │           Express.js API Server                      │  │
│  │  - Authentication (JWT)                             │  │
│  │  - Notebook management                              │  │
│  │  - Source ingestion                                 │  │
│  │  - RAG pipeline                                     │  │
│  │  - Research and analysis                            │  │
│  │  - Chat service                                     │  │
│  │  - Artifact generation                              │  │
│  └──┬────────────────────────┬────────────────┬────────┘  │
│     │                        │                │            │
└─────┼────────────────────────┼────────────────┼────────────┘
      │                        │                │
   PostgreSQL               Redis            AI Providers
   Database             Cache/Queue       (OpenAI, etc.)
```

## Monorepo Structure

```
sourcepilot/
├── packages/
│   ├── backend/          # Express.js API server
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── db/       # Database setup and migrations
│   │   │   ├── routes/   # API endpoints
│   │   │   ├── middleware/
│   │   │   ├── services/ # Business logic
│   │   │   ├── utils/    # Utilities (logger, etc.)
│   │   │   └── types/
│   │   └── package.json
│   ├── frontend/         # React application
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── pages/    # Page components
│   │   │   ├── components/
│   │   │   ├── store/    # Zustand state
│   │   │   ├── lib/      # Utilities and API client
│   │   │   └── styles/
│   │   └── package.json
│   └── shared/           # Shared types
│       └── src/types.ts
├── docker-compose.yml    # PostgreSQL, Redis
├── .env.example
├── package.json         # Root workspace
└── MASTER_SPECIFICATION.md
```

## Data Architecture

### Core Entities

**Users**
- Unique email, password hash
- Authentication credentials
- Profile information (name, avatar)

**Notebooks**
- Owner-based isolation
- Title, description, tags
- Soft deletion support
- Permission model (future)

**Sources**
- Document storage with metadata
- Original filename, content hash, file type
- Extraction status tracking
- Version history support

**Source Chunks**
- Segments of parsed document content
- Location metadata (page, timestamp, section)
- Associated with embeddings

**Conversations & Messages**
- Multi-turn chat history
- Citation tracking
- User/assistant role distinction

**Embeddings** (planned)
- Vector storage via pgvector
- Associated with chunks
- Configurable provider

### Key Relationships

```
User 1 ─── * Notebook
User 1 ─── * Conversation

Notebook 1 ─── * Source
Notebook 1 ─── * Conversation
Notebook 1 ─── * Note
Notebook 1 ─── * Artifact

Source 1 ─── * Chunk
Source 1 ─── * Citation

Chunk 1 ─── * Embedding

Conversation 1 ─── * Message
Message 1 ─── * Citation

Artifact 1 ─── * Source (references)
```

## API Architecture

### Authentication
- JWT-based stateless authentication
- Bearer token in Authorization header
- Token expiration: 7 days (configurable)

### Endpoints Structure

```
/api/auth
  POST /register          # Create account
  POST /login             # Get JWT token
  POST /logout            # Invalidate token

/api/notebooks
  GET /                   # List user's notebooks
  POST /                  # Create notebook
  GET /:id                # Get notebook details
  PATCH /:id              # Update notebook
  DELETE /:id             # Delete notebook

/api/notebooks/:id/sources
  GET /                   # List sources
  POST /                  # Upload source
  GET /:sourceId          # Get source details
  DELETE /:sourceId       # Delete source

/api/notebooks/:id/chat
  POST /                  # Create message
  GET /conversations      # List conversations
  GET /conversations/:id  # Get conversation

/api/notebooks/:id/research
  POST /fast              # Fast web research
  POST /deep              # Deep research
  GET /jobs/:jobId        # Get research status

/api/notebooks/:id/artifacts
  GET /                   # List artifacts
  POST /                  # Create artifact
  GET /:artifactId        # Get artifact
  DELETE /:artifactId     # Delete artifact
```

### Error Response Format

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

## Backend Services

### Document Ingestion Pipeline

1. **Upload**: Receive file, validate MIME type and size
2. **Storage**: Save to local disk or S3
3. **Extraction**: Parse content based on file type
4. **Chunking**: Segment into overlapping chunks
5. **Indexing**: Generate embeddings and store vectors
6. **Metadata**: Extract and store document metadata

### Retrieval-Augmented Generation

1. **Query**: User question
2. **Retrieval**: Search notebook sources (semantic + keyword)
3. **Ranking**: Rerank results by relevance
4. **Context**: Assemble passages within token limit
5. **Generation**: Send to AI provider with context
6. **Citation**: Map AI responses to source evidence

### Research Pipeline

1. **Planning**: Decompose research question
2. **Search**: Execute web searches
3. **Evaluation**: Assess source credibility
4. **Analysis**: Cross-source comparison
5. **Synthesis**: Generate report with citations

## Frontend State Management

### Zustand Stores

- **auth**: User authentication state, JWT token
- **notebook**: Current notebook context
- **ui**: UI state (loading, modals, errors)

### React Query

- Query keys for cache management
- Automatic refetching and invalidation
- Mutation handlers for create/update/delete

## Database Schema

### PostgreSQL

**Extensions**
- pgvector (for embeddings)
- uuid-ossp (for UUID generation)

**Tables** (see DEVELOPMENT_STATUS.md for details)
- users
- notebooks
- sources
- source_chunks
- embeddings (planned)
- conversations
- messages
- citations
- notes
- artifacts
- shared_links
- audit_logs
- organizations (planned)

### Indexes

- Notebook owner queries: `(owner_id)`
- Source lookups: `(notebook_id, source_id)`
- Chunk retrieval: `(source_id, chunk_index)`
- Conversation history: `(notebook_id, conversation_id)`
- Full-text search: GIN index on content

## AI Provider Integration

### Abstraction Layer

Pluggable provider interface:
- OpenAI GPT-4/3.5
- Anthropic Claude 3
- Google Gemini
- Cohere
- Local open-source models

Configuration via environment variables or admin panel.

### Embedding Providers

- OpenAI embeddings
- Cohere embeddings
- HuggingFace (via proxy)
- Local sentence-transformers

## Deployment Architecture

### Development

- Docker Compose: PostgreSQL, Redis
- npm dev: Vite hot reload (frontend), tsx watch (backend)
- Shared environment variables

### Production

- Docker images for backend and frontend
- Kubernetes deployment (optional)
- PostgreSQL managed database
- Redis managed cache
- S3 or similar for file storage
- CI/CD pipeline

## Security Architecture

### Authentication & Authorization

- Password hashing: bcrypt (salt rounds ≥ 12)
- JWT tokens: 7-day expiration
- CSRF protection: State-based operations
- Rate limiting: Per-user and per-IP

### Data Security

- HTTPS/TLS for all communication
- Encrypted storage of API keys
- Input validation and output encoding
- SQL injection prevention (parameterized queries)
- XSS prevention (template escaping)

### Access Control

- Notebook-level permissions (viewer, editor)
- Organization-level roles (admin, member)
- Server-side authorization verification
- Audit logging of permission changes

## Performance Optimizations

### Frontend

- Code splitting and lazy loading
- Asset minification and compression
- Browser caching headers
- Image optimization
- Bundle size monitoring

### Backend

- Database connection pooling
- Query result caching (Redis)
- Pagination for list endpoints
- Async processing for long operations
- Indexed database queries

### Search

- Full-text search index (PostgreSQL)
- Vector similarity search (pgvector)
- Search result caching
- Reranking for better results

## Observability

### Logging

- Structured JSON logging
- Correlation IDs for request tracing
- Log levels: debug, info, warn, error
- PII redaction

### Monitoring

- API response time metrics
- Database query performance
- Background job status
- External provider health
- Error rates and types

### Health Checks

- `/health/live`: Service alive check
- `/health/ready`: Database and dependency checks

---

This architecture supports the complete feature set defined in the master specification and scales horizontally as needed.

