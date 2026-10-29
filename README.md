# SourcePilot

SourcePilot is a professional, AI-powered research, knowledge intelligence, and learning platform. It enables users to ingest documents from multiple formats, retrieve information using retrieval-augmented generation (RAG), conduct research grounded in source evidence, and generate learning artifacts such as flashcards, quizzes, reports, and presentations.

## Features

- **Multi-Format Ingestion**: Upload PDFs, DOCX, TXT, Markdown, images, audio, video, and more.
- **Source-Grounded AI Chat**: Ask questions with answers grounded in your uploaded sources.
- **Citation Verification**: Every answer includes verifiable citations with passage-level evidence.
- **Research Workflows**: Fast web research and deep cross-source analysis.
- **Studio Learning Artifacts**: Generate flashcards, quizzes, reports, mind maps, infographics, and presentations.
- **Secure Collaboration**: Share notebooks with fine-grained permissions.
- **Enterprise Admin**: Organization management, quotas, feature flags, and audit logs.

## Project Status

This is an early-stage implementation. See [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md) for current progress, [FEATURE_MATRIX.md](FEATURE_MATRIX.md) for detailed feature status, and [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) for constraints.

## Quick Start

### Prerequisites

- Node.js (see `.nvmrc`)
- Docker and Docker Compose
- PostgreSQL (included in Docker Compose)

### Local Development

```bash
# Install dependencies
npm ci

# Set up environment
cp .env.example .env.local

# Start PostgreSQL and Redis
docker-compose up -d

# Run migrations
npm run db:migrate

# Start backend (development)
npm run dev:backend

# Start frontend (development)
npm run dev:frontend
```

The application will be available at `http://localhost:3000`.

### AI Provider Configuration

SourcePilot features a universal multi-provider AI architecture. You can configure your preferred AI provider (OmniRoute, Ollama, Anthropic Claude, OpenAI, NVIDIA NIM, Google Gemini, or generic OpenAI-compatible endpoints) in `.env.local`:

- **Ollama (Local LLM)**:
  ```env
  AI_PROVIDER=ollama
  AI_MODEL=llama3.1
  AI_EMBEDDING_MODEL=nomic-embed-text
  OLLAMA_BASE_URL=http://localhost:11434/v1
  OLLAMA_API_KEY=ollama
  ```
- **OmniRoute / Cloud Providers**: Set `AI_PROVIDER=omniroute` (or `anthropic`, `openai`, `nvidia`, `gemini`) along with the corresponding API key.

### Running Tests

```bash
npm run test:local
npm run test:focused
```

### Production Build

```bash
npm run build
npm run start
```

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for system design, [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) for data models, and [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for API endpoints.

## Security

See [SECURITY.md](SECURITY.md) for security practices, [THREAT_MODEL.md](THREAT_MODEL.md) for threat analysis, and [DATA_RETENTION_POLICY.md](DATA_RETENTION_POLICY.md) for data handling policies.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## License

Proprietary. All rights reserved.
