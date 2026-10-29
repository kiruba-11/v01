# SourcePilot Known Limitations

**Last Updated**: 2026-10-25

## Current Limitations & Edge Cases

1. **AI Provider Fallbacks**:
   - When `OMNIROUTE_API_KEY` or `NVIDIA_API_KEY` are not configured or encounter rate limits/API errors, services automatically fall back to deterministic local pseudo-embeddings and robust structured mock generators for RAG and Studio artifacts.

2. **Multilingual Audio Generation**:
   - Audio Overviews currently generate dual-host podcast scripts and interactive audio player simulations with progress tracking. Direct text-to-speech audio file generation depends on external speech synthesis API availability.

3. **Vector Index Availability**:
   - If the PostgreSQL `pgvector` extension is not installed in the container, RAG vector similarity search falls back gracefully to full-text or source chunk selection.

4. **Client-Side Storage**:
   - Theme preferences and authentication tokens are persisted in browser `localStorage`.
