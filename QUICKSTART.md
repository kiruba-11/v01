# SourcePilot - Quick Start Guide

## ✅ Status: Ready to Run

All services are configured and ready. Follow these steps to start the application.

## Prerequisites

- Node.js 22.11.0 (or 22.x)
- Docker and Docker Compose
- npm 10.9.0+

## Step 1: Verify Services (5 seconds)

```bash
cd /home/kiruba/Data/REA/v01

# Check Docker services
docker-compose ps

# Expected output:
# PostgreSQL: Up and healthy
# Redis: Up and healthy
```

If services aren't running:
```bash
docker-compose up -d
```

## Step 2: Start Backend (Terminal 1)

```bash
npm run dev:backend
```

Expected output:
```
[32minfo[39m: Database connection successful
[32minfo[39m: Database initialized
[32minfo[39m: Server running on port 3001
```

## Step 3: Start Frontend (Terminal 2)

```bash
npm run dev:frontend
```

Expected output:
```
  VITE v5.4.21  ready in xxx ms

  ➜  Local:   http://localhost:3000/
```

## Step 4: Access Application

Open browser: **http://localhost:3000**

## Step 5: Test the Workflow

1. **Register**: Go to http://localhost:3000/register
   - Email: test@example.com
   - Password: TestPassword123
   - Name: Test User

2. **Login**: http://localhost:3000/login
   - Use credentials from step 1

3. **Create Notebook**:
   - Enter notebook name: "My First Notebook"
   - Click Create

4. **Upload Document**:
   - Click on notebook
   - Click "Click to upload file"
   - Select any PDF or DOCX file
   - Wait for "completed" status

5. **View Sources**:
   - See uploaded file in Sources table
   - Check extraction status

## Troubleshooting

### Port Already in Use

If port 3001 is already in use:
```bash
lsof -i :3001
kill -9 <PID>
```

### Database Connection Error

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# If not, start it
docker-compose up -d postgres

# Verify connection
docker-compose exec postgres pg_isready -U sourcepilot
```

### Frontend Build Error

```bash
# Clear cache and rebuild
cd packages/frontend
rm -rf dist node_modules/.vite
npm run build
```

### Backend Compilation Error

```bash
# Check TypeScript
npm run type-check -w packages/backend

# Rebuild
cd packages/backend
npm run build
```

## API Endpoints (for testing)

```bash
# Health check
curl http://localhost:3001/health/ready

# Create account
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123","name":"Test"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123"}'

# List notebooks (need JWT token)
curl http://localhost:3001/api/notebooks \
  -H "Authorization: Bearer <token>"
```

## Development Commands

```bash
# Full build
npm run build

# Type checking
npm run type-check

# Linting
npm run lint

# Run tests
npm run test

# Check project quality
npm run check:fast
```

## Database Access

```bash
# Connect to database
docker-compose exec postgres psql -U sourcepilot -d sourcepilot

# View tables
\dt

# Exit
\q
```

## Redis Access

```bash
# Connect to Redis
docker-compose exec redis redis-cli

# Check keys
KEYS *

# Exit
exit
```

## Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v
```

## Common Issues

| Issue | Solution |
|-------|----------|
| Blank page in browser | Clear cache (Ctrl+Shift+Delete) and refresh |
| Upload not working | Check backend is running on port 3001 |
| 401 Unauthorized | JWT token expired, login again |
| Database error | Check PostgreSQL is healthy: `docker-compose ps postgres` |
| Slow performance | Check system resources: `docker stats` |

## Next Steps

After verifying the application works:

1. **Explore the Code**:
   - Backend: `packages/backend/src/`
   - Frontend: `packages/frontend/src/`

2. **Read Documentation**:
   - `ARCHITECTURE.md` - System design
   - `DATABASE_SCHEMA.md` - Data models
   - `MASTER_SPECIFICATION.md` - Feature requirements

3. **Phase 3 Preparation** (Vector Search & RAG):
   - Get OpenAI or Anthropic API key
   - Add to `.env.local`
   - Ready to implement embeddings

## Support

For detailed information, see:
- `README.md` - Project overview
- `DEPLOYMENT.md` - Deployment guide
- `DEVELOPMENT_STATUS.md` - Progress tracking
- `IMPLEMENTATION_SUMMARY.md` - What's been built

---

**Status**: ✅ Ready to run  
**Last Updated**: 2026-10-24
