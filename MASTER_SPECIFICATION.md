# SourcePilot Master Product Specification

## Overview

SourcePilot is a comprehensive research, knowledge intelligence, and learning platform inspired by publicly observable NotebookLM capabilities. It enables users to ingest documents from multiple sources, perform source-grounded question answering with citation verification, conduct research with evidence evaluation, and generate learning artifacts.

---

## A. Authentication, Onboarding, and User Management

### A.1 Registration and Authentication
- Email/password registration with validation.
- Secure password hashing (bcrypt or equivalent).
- Email verification (send and verify token flow).
- Login with session or JWT token management.
- Password reset with secure token flow.
- OAuth2 integration support (optional for Phase 1).

### A.2 Logout and Session Management
- Server-side session invalidation.
- Secure logout across all devices.
- Session timeout with configurable duration.
- Concurrent session limits where appropriate.

### A.3 Account Settings
- Profile editing (name, avatar, email preferences).
- Password change.
- Account deletion with data purge confirmation.
- Two-factor authentication (optional for Phase 1).

### A.4 Onboarding
- Welcome flow with product tour.
- Optional example notebook for new users.
- Quick start guide.

---

## B. Notebook Workspace and Dashboard

### B.1 Notebook Lifecycle
- Create notebook with name, description, tags.
- Rename, duplicate, archive, restore, delete notebook.
- Notebook list with search, sort (by name, date, favorites), filtering (by tags, status).
- Pin/favorite notebooks.
- View notebook metadata (created date, last modified, owner, permissions).

### B.2 Dashboard
- Overview of recent notebooks.
- Quick access to favorite notebooks.
- Recent conversations and generated artifacts.
- Usage statistics (documents uploaded, conversations held, artifacts created).

### B.3 Permissions and Sharing (Notebook Level)
- Owner can grant viewer or editor roles to collaborators.
- Invitations with email notification.
- Permission revocation.
- Shared-link generation with optional expiration.
- Public sharing toggle (read-only mode).

---

## C. Multiformat Source Ingestion

### C.1 Supported Formats
- **Documents**: PDF, DOCX, TXT, Markdown, RTF, EPUB.
- **Spreadsheets**: CSV, XLSX (with sheet preservation).
- **Presentations**: PPTX.
- **Images**: PNG, JPG, WebP (with OCR when available).
- **Scanned Documents**: TIFF, PDF scans with OCR.
- **Audio**: MP3, WAV, M4A (with transcription when configured).
- **Video**: MP4, WebM (with transcript extraction when configured).
- **Code**: JSON, XML, SQL, Python, JavaScript, and other common formats.
- **Web URLs**: Public HTTP(S) pages and PDFs.
- **YouTube**: Transcript extraction from public videos.
- **Pasted Text**: Direct text input and notes.

### C.2 Upload and Validation
- Drag-and-drop and file picker interface.
- File size validation (with configurable limits per tier).
- MIME type validation.
- Scan for malware/unsafe content (integration optional).
- Duplicate detection by content hash.
- Upload progress indicator.
- Batch upload support.

### C.3 Processing Status
- Display ingestion progress with stages (uploading, validating, extracting, parsing, indexing).
- Show estimated time and completion percentage.
- Allow retry on failure with error details.
- Cancel ongoing ingestion (where safe).

### C.4 Source Metadata Preservation
- Original filename and upload timestamp.
- Content hash for deduplication.
- Document length (pages, words, duration).
- Author, title, creation date (extracted from metadata).
- URL and access timestamp (for web sources).
- OCR confidence score (for scanned docs).

---

## D. Source Management and Intelligence

### D.1 Source Library
- List all sources in a notebook with metadata.
- Preview source content (text excerpt, thumbnail, transcript).
- Search sources by name, content, or metadata.
- View source properties (format, size, ingestion date, status).
- Edit source description and tags.
- Delete sources (with confirmation).

### D.2 Source Versions
- Track multiple ingestions of the same source (e.g., updated PDF).
- Compare versions.
- Revert to previous version (if retained).
- Preserve version history metadata.

### D.3 Source Intelligence
- Extract and display key entities (people, organizations, locations, dates).
- Identify main topics and themes.
- Display source structure (chapters, sections, outline).
- Show linked citations across sources.
- Highlight connections to other documents in the notebook.

---

## E. Retrieval-Augmented Generation (RAG)

### E.1 Content Parsing and Normalization
- Extract text and structure from each source format.
- Preserve logical document hierarchy (chapters, sections).
- Maintain table structure and spatial layout (for tables and forms).
- Extract and preserve code blocks with language identification.
- Handle multi-language content.

### E.2 Chunking and Segmentation
- Configurable chunk size and overlap.
- Semantic-aware chunking (preserve sentence and paragraph boundaries).
- Preserve location metadata (page numbers, slide numbers, timestamps).
- Create overlapping context windows for improved retrieval.

### E.3 Embedding and Indexing
- Configurable embedding provider (OpenAI, Anthropic, Cohere, local models).
- Store embeddings in vector index (pgvector or equivalent).
- Index full-text search capability.
- Metadata filtering by source, date, tags.

### E.4 Retrieval Pipeline
- Execute semantic search on embeddings.
- Optional keyword/BM25 search.
- Hybrid search combining semantic and keyword methods.
- Apply metadata filters (source selection, date ranges).
- Optional reranking for relevance.
- Retrieve top-k results within context limits.

### E.5 Context Assembly
- Assemble retrieved passages into a context window.
- Respect token limits of target AI model.
- Preserve source attribution and location metadata.
- Order results by relevance or source order.

---

## F. AI Research Chat

### F.1 Question-Answering
- Input question or prompt.
- Execute retrieval against selected sources or full notebook.
- Send context to configured AI provider.
- Stream or return full response.
- Display answer with citations.
- Preserve response in conversation history.

### F.2 Conversation Management
- Maintain multi-turn conversation threads.
- Show message history (questions and answers).
- Edit or delete previous messages (with conversation re-indexing).
- Rename conversation threads.
- Export conversation as markdown or PDF.

### F.3 Response Styles
- Concise summary.
- Detailed explanation.
- Pros and cons analysis.
- Timeline or chronological ordering.
- Comparative analysis.
- Actionable bullet points.

### F.4 Follow-Up and Refinement
- Ask follow-up questions within conversation context.
- Regenerate answer with different style.
- Retry with different sources.
- Adjust source selection and re-retrieve.

### F.5 Conversation Persistence
- Save conversations to database.
- Restore conversation history.
- Link conversations to notebook and sources used.
- Optional conversation search and indexing.

---

## G. Citation and Evidence Verification

### G.1 Citation Insertion
- AI inserts citation markers in response text.
- Each citation references a specific passage, page, timestamp.
- Preserve source identity, location, and excerpt text.

### G.2 Citation Verification
- Verify cited passage exists in retrieved context.
- Validate passage belongs to claimed source.
- Check that citation accurately reflects source content.
- Identify hallucinated or unsupported claims.

### G.3 Evidence Navigation
- Click citation to navigate to source passage in document viewer.
- Highlight cited passage with surrounding context.
- Show full source metadata.
- Navigate between related passages and sources.

### G.4 Citation Metadata
- Store: source ID, source version, page/slide/timestamp, passage text, excerpt.
- Preserve original location (page number, line, byte offset where available).
- Track citation context (question, answer fragment).

---

## H. Fast Research

### H.1 Web Search Integration
- Execute configured web search (Google Custom Search, SerpAPI, Bing, etc.).
- Preserve search query, results, URLs, snippets, rank position.
- Retrieve web pages for analysis.
- Extract relevant passages from search results.

### H.2 Quick Research Workflow
- User enters research query.
- System performs web search.
- Display results with source attribution.
- Allow user to review and select results for import.
- Import selected results into notebook.

### H.3 Research Report Generation
- Synthesize search results into a brief report.
- Cite sources in report.
- Export report.

---

## I. Deep Research

### I.1 Research Planning
- Decompose research question into subquestions.
- Plan research strategy (sources to consult, analysis methods).
- Track research progress and gaps.

### I.2 Iterative Research Workflow
- Execute searches for each subquestion.
- Evaluate source relevance and credibility.
- Identify contradictions and conflicts in sources.
- Plan follow-up searches based on findings.
- Synthesize findings across sources.

### I.3 Evidence Evaluation
- Rate source credibility (primary, secondary, tertiary).
- Assess evidence quality and relevance.
- Identify conflicts and reconcile them.
- Track confidence levels in findings.

### I.4 Cross-Source Analysis
- Compare claims across sources.
- Identify points of agreement and disagreement.
- Build evidence matrices.
- Extract timelines and chronologies.
- Create entity relationship maps.

### I.5 Report Generation
- Comprehensive research report with evidence.
- Full citations and source list.
- Clearly distinguish supported claims from speculation.
- Document research methodology and limitations.
- Export report with bibliography.

---

## J. Cross-Source Analysis

### J.1 Comparative Analysis
- Compare narratives, claims, or data across multiple sources.
- Highlight agreements and contradictions.
- Identify omissions and gaps.
- Build comparison matrices (features, timelines, organizations).

### J.2 Entity Extraction and Linking
- Extract entities (people, organizations, locations, products).
- Link entities across sources.
- Build entity graph with relationships.
- Track entity mentions and context.

### J.3 Fact and Claim Extraction
- Extract factual claims from sources.
- Link related claims across sources.
- Identify conflicting claims with sources.
- Rate claim confidence and evidence.

### J.4 Structured Output
- Timeline: chronological ordering of events across sources.
- Entity maps: relationship graphs with entity attributes.
- Evidence matrices: claims vs. sources with evidence.
- Summary tables: comparative data across documents.

---

## K. Studio and Generated Learning Materials

### K.1 Research Reports
- User-customizable research report templates.
- Auto-generated executive summaries, key findings, recommendations.
- Full citations and source list.
- Export as PDF, markdown, Word.

### K.2 Study Guides and Notes
- Auto-generated study guides from source material.
- Key concepts, definitions, learning objectives.
- Section summaries with source references.
- Editable by user.

### K.3 Flashcards
- Auto-generated from extracted concepts and definitions.
- Support for images, code, formulas, and markdown.
- User-editable cards.
- Study progress tracking (new, learning, review, mastered).
- Spaced repetition scheduling (optional).
- Export as APKG (Anki format) or CSV.

### K.4 Quizzes
- Auto-generated multiple-choice, true/false, short-answer questions.
- Answer explanations with source citations.
- Scoring and performance tracking.
- User can retake quizzes and track improvement.
- Export quiz and results.

### K.5 Mind Maps
- Auto-generated interactive mind maps from document structure.
- Hierarchical organization of concepts.
- Clickable nodes link to source passages.
- User can edit and add nodes.
- Export as PNG, SVG, or interactive HTML.

### K.6 Infographics
- Auto-generated visual summaries and data visualizations.
- Charts, timelines, comparison tables, entity maps.
- Integration with source data.
- Export as PNG, SVG, or interactive HTML.

### K.7 Presentations (PPTX)
- Auto-generated slide deck with:
  - Title slide, outline, content slides, summary, Q&A.
  - Speaker notes with citations.
  - Integrated images, charts, and data from sources.
  - Consistent design theme.
- Editable in PowerPoint or equivalent.
- Export as PPTX, PDF, or web slideshow.

### K.8 Audio Overviews
- AI-generated narration script based on source material.
- Text-to-speech (TTS) synthesis with natural voice.
- Speaker notes and timestamps.
- Playback in web interface or export as MP3/WAV.
- Optional music or background audio.
- Transcript synchronized with audio.

### K.9 Video Overviews
- AI-generated script, scenes, and narration.
- Text-to-speech or AI voice narration.
- Visual rendering (slides, images, text overlays).
- Subtitle generation and synchronization.
- Video encoding and export (MP4, WebM).
- Playback in web interface or download.
- Source citations embedded in video.

### K.10 Artifact Management
- List generated artifacts with metadata (type, creation date, source).
- Preview artifacts.
- Regenerate artifacts with different parameters.
- Delete artifacts.
- Export artifacts in appropriate formats.
- Track artifact generation history.

---

## L. Notes and Knowledge Organization

### L.1 Notes Creation
- Create notes within notebook (independent of sources).
- Support for text, images, links, code, and markdown.
- Attach notes to specific sources or conversations.
- Organize notes with tags and folders.

### L.2 Knowledge Organization
- Tag notes and sources with custom tags.
- Organize into folders and collections.
- Link notes (create relationships and cross-references).
- Full-text search over notes.

### L.3 Note Export
- Export notes as markdown or plain text.
- Export with source references and citations.

---

## M. Search and Navigation

### M.1 Global Search
- Full-text search across:
  - Notebook names and descriptions.
  - Source titles, content, and metadata.
  - Extracted entities and topics.
  - Conversation history (if enabled).
  - Note content.
  - Generated artifact content.
- Search filters by type, date, tags, source.
- Ranking by relevance and recency.

### M.2 Notebook Navigation
- Breadcrumb navigation showing current notebook.
- Sidebar with notebook structure (sources, conversations, artifacts, notes).
- Quick-access panels for recent items.
- Favorites and pinned items.

---

## N. Import, Export, and Portability

### N.1 Import Workflows
- Import markdown files with embedded source links.
- Import existing notes and notebooks from compatible formats.
- Import from external services (e.g., Notion via API).
- Bulk import multiple files.

### N.2 Export Workflows
- Export notebook as HTML archive (self-contained).
- Export conversations as markdown or PDF.
- Export sources with metadata as JSON.
- Export all notes as markdown or plain text.
- Export artifacts in native formats (PPTX, APKG, etc.).
- Export complete notebook backup (all data).

### N.3 Data Portability
- Generate complete data export in standard formats.
- Include all sources, conversations, notes, artifacts, metadata.
- Support for migration to other platforms.

---

## O. Enterprise Administration

### O.1 Organizations
- Create and manage organizations.
- Invite users to organization.
- Define organization roles (admin, member).
- Manage shared organization notebooks.

### O.2 User Management
- Admin view of all users in organization.
- User provisioning and deprovisioning.
- Role assignment and management.
- Activity logging and audit trail.

### O.3 Quotas and Limits
- Per-user quotas (documents uploaded, storage used, conversations, artifacts).
- Per-organization quotas.
- Enforcement and warnings when approaching limits.
- Tiered plans with different quotas.

### O.4 Provider Configuration
- Admin configures AI providers (API keys, models, rate limits).
- Embedding provider selection and configuration.
- Search provider configuration.
- TTS/voice provider configuration.
- Video rendering provider (if external).

### O.5 Feature Flags
- Admin toggles experimental features on/off.
- Per-organization feature availability.
- Gradual rollout of new features.

### O.6 Audit Logs
- Log all administrative actions.
- Log user account changes, permission changes, data deletions.
- Searchable audit log interface.
- Export audit log.

### O.7 Settings and Policies
- Configure password policies (complexity, expiration).
- Configure data retention and deletion policies.
- Configure security settings (IP whitelisting, SSO).
- Configure branding (logo, colors, domain).

---

## P. Design System and Frontend Experience

### P.1 Design System
- Consistent component library (buttons, inputs, dialogs, cards, lists, tables).
- Light and dark theme support.
- Accessible color contrast (WCAG AA minimum).
- Responsive layout for desktop, tablet, mobile.
- Original branding and visual identity.

### P.2 Typography and Spacing
- Consistent font family, sizes, and weights.
- Readable line height and spacing.
- Proper heading hierarchy.

### P.3 State Management
- Loading states with spinners or skeleton screens.
- Empty states with guidance.
- Error states with helpful messages.
- Success states with confirmation feedback.
- Disabled states with explanations.

### P.4 Navigation
- Main navigation with notebook and account menus.
- Breadcrumb navigation.
- Quick-access panels and shortcuts.
- Search bar with history.

### P.5 Mobile Responsiveness
- Touch-friendly interface (larger buttons, appropriate spacing).
- Responsive layouts for small screens.
- Bottom navigation or collapsible menu on mobile.
- Optimized performance for mobile networks.

### P.6 Accessibility
- Keyboard navigation (Tab, Enter, Escape, arrow keys).
- Screen reader support (ARIA labels, semantic HTML).
- Focus indicators for keyboard users.
- Color not the only means of conveying information.
- Resizable text (browser zoom support).
- Captions and transcripts for media.

### P.7 Internationalization
- Support for multiple languages (English as baseline, add others as needed).
- RTL support for RTL languages.
- Locale-appropriate date and number formatting.
- Configurable language in user settings.

---

## Q. Backend Architecture and APIs

### Q.1 API Design
- RESTful API with standard HTTP methods and status codes.
- Versioned API (v1, v2) for compatibility.
- JSON request/response bodies.
- Pagination for list endpoints (limit, offset).
- Filtering and sorting parameters.
- Structured error responses with error codes.

### Q.2 Core Endpoints
- **Auth**: POST /auth/register, POST /auth/login, POST /auth/logout, POST /auth/refresh, POST /auth/password-reset
- **Users**: GET /users/me, PATCH /users/me, DELETE /users/me
- **Notebooks**: GET /notebooks, POST /notebooks, GET /notebooks/{id}, PATCH /notebooks/{id}, DELETE /notebooks/{id}
- **Sources**: GET /notebooks/{id}/sources, POST /notebooks/{id}/sources, GET /sources/{id}, PATCH /sources/{id}, DELETE /sources/{id}
- **Chat**: POST /notebooks/{id}/chat, GET /notebooks/{id}/conversations, GET /conversations/{id}, POST /conversations/{id}/messages
- **Research**: POST /notebooks/{id}/research, GET /research-jobs/{id}
- **Artifacts**: GET /notebooks/{id}/artifacts, POST /notebooks/{id}/artifacts, GET /artifacts/{id}, PATCH /artifacts/{id}, DELETE /artifacts/{id}
- **Admin**: (organization management, user management, audit logs, configuration)

### Q.3 Request/Response Validation
- Validate all input parameters (type, format, range).
- Return 400 Bad Request with validation errors.
- Use schema validation library (e.g., Zod, Joi).

### Q.4 Authentication and Authorization
- Bearer token authentication (JWT or session cookie).
- Verify token on protected endpoints.
- Return 401 Unauthorized if missing/invalid token.
- Return 403 Forbidden if user lacks permission.

### Q.5 Pagination and Filtering
- Support limit/offset pagination.
- Support filtering by multiple criteria.
- Support sorting by multiple fields.
- Return total count in response.

### Q.6 Rate Limiting
- Rate limit per user/IP (configurable).
- Return 429 Too Many Requests when exceeded.
- Include retry-after header.

### Q.7 Async Operations and Job Tracking
- Long-running operations return job ID.
- Provide endpoint to query job status.
- Webhook or polling for job completion notification.
- Store job history and logs.

---

## R. Data Architecture

### R.1 Core Entities

#### Users
```
id, email, password_hash, name, avatar_url, created_at, updated_at, deleted_at
```

#### Organizations
```
id, name, owner_id, created_at, updated_at
```

#### OrganizationMembers
```
id, organization_id, user_id, role (admin, member), created_at
```

#### Notebooks
```
id, organization_id, owner_id, name, description, tags, created_at, updated_at, archived_at, deleted_at
```

#### NotebookPermissions
```
id, notebook_id, user_id, role (viewer, editor), created_at, revoked_at
```

#### Sources
```
id, notebook_id, file_name, file_type, file_size, file_hash, content_preview, extraction_status, created_at, updated_at, deleted_at
```

#### SourceVersions
```
id, source_id, version_number, file_hash, created_at
```

#### SourceChunks
```
id, source_id, chunk_index, content, location_metadata (page, slide, timestamp), created_at
```

#### Embeddings
```
id, chunk_id, embedding_vector, created_at
```

#### Conversations
```
id, notebook_id, user_id, title, created_at, updated_at
```

#### Messages
```
id, conversation_id, role (user, assistant), content, citations, created_at
```

#### Citations
```
id, message_id, source_id, chunk_id, passage_text, location_metadata, created_at
```

#### Notes
```
id, notebook_id, user_id, title, content, tags, created_at, updated_at, deleted_at
```

#### Artifacts
```
id, notebook_id, user_id, artifact_type, title, content, status, created_at, updated_at, deleted_at
```

#### ResearchJobs
```
id, notebook_id, user_id, query, status, results, created_at, updated_at
```

#### Jobs (Generic)
```
id, user_id, job_type, status, progress, result, error, created_at, updated_at
```

#### AuditLogs
```
id, user_id, action, entity_type, entity_id, changes, created_at
```

#### SharedLinks
```
id, notebook_id, created_by_id, token, expires_at, access_count, created_at
```

### R.2 Indexing and Foreign Keys
- Index on (notebook_id, user_id) for efficient queries.
- Index on (source_id) for source lookups.
- Index on (conversation_id) for message history.
- Index on full-text search columns (notebook name, source content).
- Foreign key constraints with appropriate cascade rules.

### R.3 Migrations
- Version migrations with semantic versioning.
- Reversible migrations where possible.
- Document schema changes.
- Test migrations on production data size.

---

## S. AI Provider Abstraction and Configuration

### S.1 Provider Interface
```
class AIProvider {
  generateCompletion(prompt, context, model, params): Promise<string>
  streamCompletion(prompt, context, model, params): AsyncIterator<string>
  listModels(): Promise<Model[]>
  validateCredentials(): Promise<boolean>
}
```

### S.2 Supported Providers
- OpenAI (GPT-4, GPT-3.5)
- Anthropic Claude (Claude 3 Opus, Sonnet, Haiku)
- Google Gemini
- Cohere
- Local open-source models (LLaMA, Mistral)
- Configurable via environment or admin interface.

### S.3 Embedding Providers
- OpenAI embeddings
- Cohere embeddings
- HuggingFace embeddings
- Local embeddings (sentence-transformers)

### S.4 Search Providers
- Google Custom Search
- SerpAPI
- Bing Search
- Configurable API keys and limits.

### S.5 Configuration Management
- Store provider configuration in database (encrypted).
- Support per-organization provider configuration.
- Fallback to default provider if organization config unavailable.
- Validate credentials and test connectivity.

### S.6 Error Handling
- Handle provider-specific errors gracefully.
- Retry logic with exponential backoff.
- Fallback to alternative provider if available.
- Log provider errors for debugging.

---

## T. Security, Privacy, and Compliance

### T.1 Authentication Security
- Passwords hashed with bcrypt (salt rounds ≥ 12).
- Sessions use secure, httpOnly cookies or JWTs with short expiration.
- CSRF protection on state-changing endpoints.
- Rate limiting on login attempts.

### T.2 Authorization
- Every protected endpoint validates user permission.
- Notebook-level authorization (viewer vs. editor).
- Organization-level authorization (admin vs. member).
- Server-side authorization (do not trust client-side checks).

### T.3 Data Encryption
- Encrypt sensitive data at rest (passwords, API keys, PII if applicable).
- Use HTTPS for all communication (TLS 1.2+).
- Encrypt provider API keys in database.

### T.4 Input Validation and Output Encoding
- Validate and sanitize all user inputs.
- Encode output to prevent injection attacks.
- Protect against SQL injection (use parameterized queries).
- Protect against XSS (escape HTML, use templating engine safely).
- Protect against SSRF (validate URLs, restrict to allowed domains).

### T.5 Upload Security
- Validate file MIME types and extensions.
- Store uploads outside web root.
- Serve uploads with appropriate headers (Content-Disposition: attachment).
- Scan for malware (integration optional but recommended).
- Limit upload size per tier.

### T.6 Prompt Injection Protection
- Sanitize user-provided prompts.
- Avoid directly concatenating user input into AI prompts.
- Use structured prompt templates.
- Validate AI output for suspicious patterns (e.g., permission grants).

### T.7 Audit and Logging
- Log all authentication events (login, logout, failed attempts).
- Log authorization failures (permission denied).
- Log administrative actions (user creation, permission changes, data deletion).
- Log data access (searches, exports, downloads).
- Do not log sensitive data (passwords, full prompts, API keys).

### T.8 Data Retention and Deletion
- Support user data deletion (right to be forgotten).
- Implement retention policies (e.g., delete inactive accounts after 1 year).
- Securely delete data (overwrite or cryptographic erasure).
- Archive or delete conversations after retention period.
- Preserve audit logs for longer period.

### T.9 API Security
- Implement rate limiting per user/IP.
- Validate request size (prevent DoS).
- Implement CORS carefully (allow only trusted origins).
- Use security headers (HSTS, X-Content-Type-Options, CSP).
- Validate and sanitize query parameters.

### T.10 Access Control
- Support fine-grained permissions (viewer, editor roles).
- Enforce permissions on all operations.
- Support permission revocation.
- Audit permission changes.

---

## U. Reliability and Observability

### U.1 Health Checks
- Liveness endpoint: `/health/live` returns 200 if service is running.
- Readiness endpoint: `/health/ready` returns 200 if database, cache, external services are accessible.
- Detailed health status including component status.

### U.2 Structured Logging
- Use JSON-structured logging (e.g., Winston, Pino).
- Include correlation ID in logs for request tracing.
- Log level (debug, info, warn, error) appropriate to severity.
- Do not log sensitive data (passwords, API keys, PII).

### U.3 Monitoring and Alerts
- Monitor API response times, error rates, throughput.
- Monitor database query performance and connection pool.
- Monitor background job processing (queue depth, failure rate).
- Monitor external service health (AI provider, search provider).
- Alert on critical issues (database unavailable, job failures).

### U.4 Error Handling
- Return meaningful error messages (avoid exposing internal details).
- Include error codes for client-side handling.
- Log full error stack traces server-side.
- Retry failed operations with exponential backoff.

### U.5 Graceful Degradation
- If AI provider unavailable, inform user rather than failing silently.
- If search provider unavailable, skip research functionality.
- Queue long-running operations asynchronously.
- Support manual retry of failed jobs.

### U.6 Database Reliability
- Connection pooling with appropriate limits.
- Query timeouts to prevent hanging.
- Transaction support for consistency.
- Backup and restore procedures.
- Monitoring of slow queries and index performance.

---

## V. Testing and Evaluation

### V.1 Unit Tests
- Test parsing and chunking logic with various formats.
- Test citation mapping and verification.
- Test permission checks and authorization.
- Test artifact validation and generation.
- Test provider error handling and retries.
- Aim for >80% code coverage.

### V.2 Integration Tests
- Test notebook lifecycle (create, update, delete).
- Test source upload and ingestion pipeline.
- Test retrieval and chat workflow.
- Test citation generation and verification.
- Test background job processing.
- Test permission enforcement.
- Test export/import workflows.

### V.3 Security Tests
- Test unauthorized access to protected resources.
- Test cross-notebook access (should fail).
- Test cross-organization access (should fail).
- Test SSRF protection (block private IPs, localhost).
- Test malformed file uploads.
- Test path traversal prevention.
- Test rate limiting.
- Test prompt injection resilience.

### V.4 End-to-End Tests
- Register user.
- Create notebook.
- Upload document.
- Wait for indexing to complete.
- Ask question grounded in document.
- Verify citation correctness.
- Navigate to source passage.
- Generate learning artifact (flashcard, quiz).
- Refresh page and verify persistence.
- Test sharing and permission revocation.
- Test export/import.

### V.5 AI Quality Evaluation
- Retrieval quality: Does search return relevant passages?
- Citation correctness: Are citations accurate and well-localized?
- Evidence coverage: Does answer address the question with sufficient evidence?
- Hallucination rate: Does model invent unsupported claims?
- Insufficient-evidence behavior: Does model acknowledge when sources are insufficient?
- Cross-source accuracy: Are comparisons accurate and fair?
- Summary faithfulness: Does summary accurately represent sources?
- Quiz answer correctness: Are generated quiz answers correct and well-explained?

### V.6 Test Automation
- Automated unit and integration tests in CI/CD.
- Automated security checks (SAST, dependency scanning).
- Automated E2E tests (browser automation or API tests).
- Performance benchmarks (query latency, throughput).

---

## W. Deployment and Operations

### W.1 Local Development Environment
- Docker Compose configuration with PostgreSQL, Redis (optional).
- Environment variable configuration (.env file).
- Database migrations on startup.
- Hot reload for code changes.
- Local file storage or S3-compatible storage.

### W.2 Production Deployment
- Docker images for backend and frontend.
- Kubernetes manifests or Docker Compose for orchestration.
- Environment-based configuration (secrets, API keys).
- Health checks and readiness probes.
- Graceful shutdown (drain in-flight requests).
- Database migration as separate job before deployment.

### W.3 Database Migrations
- Version migrations with reversible operations (where possible).
- Run migrations as pre-deployment step.
- Monitor migration progress and rollback if needed.
- Test migrations on production data size.

### W.4 Backup and Restoration
- Daily database backups (full and incremental).
- Store backups in secure location (S3, encrypted).
- Document restore procedures and test regularly.
- Backup file storage and source documents.

### W.5 Monitoring and Observability
- Structured logging to centralized log service (ELK, Grafana Loki).
- Distributed tracing (optional, Jaeger/Zipkin).
- Metrics collection and dashboards (Prometheus, Grafana).
- Alerts on critical issues (database down, high error rate, job failures).

### W.6 Update and Rollback
- Zero-downtime deployments (blue-green or rolling).
- Semantic versioning for releases.
- Changelog with breaking changes noted.
- Rollback procedures (revert to previous Docker image, database migrations).

---

## X. Performance and Scalability

### X.1 Frontend Performance
- Code splitting and lazy loading of routes.
- Minimize bundle size (tree shaking, compression).
- Cache static assets (CSS, JS, images).
- Optimize images (format, size, responsive).
- Measure Web Vitals (LCP, FID, CLS).

### X.2 Backend Performance
- Query optimization (indexes, query plans).
- Connection pooling (database, HTTP).
- Caching (database query results, embeddings, API responses).
- Pagination for large result sets.
- Async processing for long-running operations.

### X.3 Search Performance
- Index optimization for full-text search.
- Vector index optimization for semantic search.
- Limit search results (top-k retrieval).
- Optional search result caching.

### X.4 Scalability
- Stateless backend (can run multiple instances).
- Database connection pooling for multiple backends.
- Asynchronous job processing (background workers).
- Message queue for job distribution.
- Cache layer (Redis) for session and data caching.

### X.5 Load Testing
- Benchmark concurrent user load.
- Measure query latency and throughput.
- Identify bottlenecks and optimize.
- Document performance baselines.

---

## Y. Accessibility and Internationalization

### Y.1 WCAG Compliance
- WCAG 2.1 Level AA compliance as target.
- Keyboard navigation throughout application.
- Screen reader support (ARIA labels, semantic HTML).
- Color contrast ratios ≥ 4.5:1 for normal text, ≥ 3:1 for large text.
- Resizable text and zoom support.
- Captions and transcripts for audio/video.

### Y.2 Keyboard Navigation
- Tab through all interactive elements.
- Enter to activate buttons and links.
- Escape to close dialogs.
- Arrow keys for navigation within lists and menus.
- Focus indicators visible at all times.

### Y.3 Screen Reader Support
- Semantic HTML (<button>, <link>, <form>, <input>, <label>).
- ARIA labels for custom components.
- ARIA roles for custom widgets.
- ARIA live regions for dynamic updates.

### Y.4 Internationalization
- Support multiple languages (English as baseline).
- Translation strings externalized (i18n files).
- RTL support for RTL languages (Arabic, Hebrew).
- Locale-appropriate date, time, number formatting.
- Locale-appropriate sorting and collation.

---

## Z. Billing and Usage Management

### Z.1 Usage Tracking
- Track documents uploaded (count, size).
- Track conversations and messages (count).
- Track artifacts generated (count by type).
- Track storage used (documents, embeddings, backups).
- Track API calls to external providers (for cost tracking).

### Z.2 Quotas and Limits
- Tier-based quotas (free, pro, enterprise).
- Per-user quotas (documents, storage, conversations, artifacts).
- Per-organization quotas (aggregate limits).
- Enforce quotas on write operations.
- Warn users when approaching limits.

### Z.3 Billing
- Monthly billing cycles.
- Usage-based charges (overage fees).
- Seat-based pricing for organizations.
- Invoice generation and payment processing (Stripe, PayPal).
- Billing history and invoice download.

### Z.4 Downgrade Handling
- Graceful handling when user downgrades plan.
- Preserve existing data within new quota.
- Warn user if usage exceeds new limits.
- Archive or delete excess data after grace period.

---

## Implementation Notes

- Use the master specification as the authoritative requirements document.
- Track each feature explicitly as implemented, partially implemented, blocked, or not implemented.
- Do not silently discard requirements; prioritize and document trade-offs.
- Preserve working functionality and existing data when extending the application.
- Follow the execution loop: implement, connect, test, verify, fix, document, continue.
- Collect evidence of working functionality (screenshots, test results, logs).
- Document blockers, dependencies, and known limitations explicitly.
- Update DEVELOPMENT_STATUS.md after each milestone.

