# SourcePilot - Local Development and Deployment Guide

## Local Development Setup

### Prerequisites

- Node.js 22.11.0 (use `.nvmrc`)
- Docker and Docker Compose
- Git

### Quick Start (5 minutes)

```bash
# 1. Navigate to project directory
cd /home/kiruba/Data/REA/v01

# 2. Install dependencies
npm install

# 3. Start PostgreSQL and Redis
docker-compose up -d

# 4. Verify services are running
docker-compose ps

# 5. Start backend (Terminal 1)
npm run dev:backend

# 6. Start frontend (Terminal 2)
npm run dev:frontend
```

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api
- **Health Check**: http://localhost:3001/health/ready
- **PostgreSQL**: localhost:5432 (sourcepilot/sourcepilot)
- **Redis**: localhost:6379

### Test the Workflow

```bash
# 1. Open http://localhost:3000 in browser
# 2. Register a new account
# 3. Login with credentials
# 4. Create a notebook
# 5. View notebooks on dashboard
```

## Development Commands

### Installation and Setup

```bash
# Install dependencies (run from root)
npm install

# Install workspace-specific dependencies
npm install -w packages/backend
npm install -w packages/frontend

# Clean install (clears node_modules and reinstalls)
npm ci
```

### Development

```bash
# Start all dev servers
npm run dev

# Start just backend
npm run dev:backend

# Start just frontend
npm run dev:frontend

# Start database services
docker-compose up -d
docker-compose down

# Verify database
docker-compose exec postgres psql -U sourcepilot -d sourcepilot -c "SELECT version();"
```

### Building

```bash
# Build all packages
npm run build

# Build backend only
npm run build:backend

# Build frontend only
npm run build:frontend

# Build shared package
npm run build -w packages/shared
```

### Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:focused

# Run backend tests
npm run test -w packages/backend

# Run frontend tests
npm run test -w packages/frontend
```

### Code Quality

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Quick checks (type-check + lint)
npm run check:fast

# Full CI checks (type-check + lint + test)
npm run check:pr
```

### Database

```bash
# Run migrations
npm run db:migrate

# Seed database (when implemented)
npm run db:seed

# Access database directly
docker-compose exec postgres psql -U sourcepilot -d sourcepilot
```

## Docker Services

### PostgreSQL

```bash
# Start PostgreSQL
docker-compose up -d postgres

# Access database
docker-compose exec postgres psql -U sourcepilot -d sourcepilot

# View logs
docker-compose logs postgres

# Stop PostgreSQL
docker-compose stop postgres
```

### Redis

```bash
# Start Redis
docker-compose up -d redis

# Access Redis CLI
docker-compose exec redis redis-cli

# View logs
docker-compose logs redis

# Stop Redis
docker-compose stop redis
```

### Full Stack

```bash
# Start all services
docker-compose up -d

# View all logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Environment Variables

### Backend (.env or .env.local)

```env
# Database
DATABASE_URL=postgresql://sourcepilot:sourcepilot@localhost:5432/sourcepilot

# Redis
REDIS_URL=redis://localhost:6379

# Server
NODE_ENV=development
PORT=3001
LOG_LEVEL=debug

# Authentication
JWT_SECRET=your-secret-key-change-in-production
SESSION_SECRET=your-session-secret-change-in-production

# CORS
CORS_ORIGIN=http://localhost:3000

# AI Providers (optional)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Search Providers (optional)
SERPAPI_API_KEY=

# Storage
STORAGE_TYPE=local
STORAGE_PATH=./uploads
```

### Frontend (.env.local)

```env
# API
VITE_API_URL=http://localhost:3001/api
VITE_APP_NAME=SourcePilot
```

## Troubleshooting

### PostgreSQL Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Verify connection
docker-compose exec postgres pg_isready -U sourcepilot

# Check logs
docker-compose logs postgres

# Rebuild containers
docker-compose down -v
docker-compose up -d postgres
```

### Backend Won't Start

```bash
# Check Node.js version
node --version  # Should be 22.x

# Clear node_modules and reinstall
rm -rf node_modules
npm install

# Check for port conflicts
lsof -i :3001

# View backend logs
npm run dev:backend  # Shows all console output
```

### Frontend Build Issues

```bash
# Clear Vite cache
rm -rf packages/frontend/dist

# Rebuild
npm run build:frontend

# Check TypeScript errors
npm run type-check -w packages/frontend
```

### Database Migration Issues

```bash
# Check current migrations
docker-compose exec postgres psql -U sourcepilot -d sourcepilot -c "SELECT * FROM migrations;"

# Clear migrations (development only!)
docker-compose exec postgres psql -U sourcepilot -d sourcepilot -c "DROP TABLE migrations CASCADE;"

# Rerun migrations
npm run db:migrate
```

## Production Deployment

### Prerequisites

- Docker registry (Docker Hub, ECR, GCR)
- Kubernetes cluster (optional)
- PostgreSQL managed database
- Redis managed cache
- S3 or equivalent object storage

### Build Production Images

```bash
# Build backend image
docker build -t sourcepilot-backend:latest packages/backend

# Build frontend image
docker build -t sourcepilot-frontend:latest packages/frontend

# Tag for registry
docker tag sourcepilot-backend:latest myregistry/sourcepilot-backend:latest
docker tag sourcepilot-frontend:latest myregistry/sourcepilot-frontend:latest

# Push to registry
docker push myregistry/sourcepilot-backend:latest
docker push myregistry/sourcepilot-frontend:latest
```

### Kubernetes Deployment

```bash
# Create namespace
kubectl create namespace sourcepilot

# Set up ConfigMap for environment variables
kubectl create configmap sourcepilot-config \
  --from-literal=DATABASE_URL=postgresql://... \
  --from-literal=JWT_SECRET=... \
  -n sourcepilot

# Apply manifests
kubectl apply -f k8s/backend.yaml -n sourcepilot
kubectl apply -f k8s/frontend.yaml -n sourcepilot
kubectl apply -f k8s/service.yaml -n sourcepilot

# Check deployment status
kubectl get pods -n sourcepilot
kubectl get services -n sourcepilot
```

### Docker Compose Production

```bash
# Use production docker-compose
docker-compose -f docker-compose.prod.yml up -d

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale api=3
```

## Monitoring

### Health Checks

```bash
# Liveness check (is service running?)
curl http://localhost:3001/health/live

# Readiness check (is service ready to serve traffic?)
curl http://localhost:3001/health/ready

# Database status
docker-compose exec postgres pg_isready -U sourcepilot

# Redis status
docker-compose exec redis redis-cli ping
```

### Logs

```bash
# Backend logs
npm run dev:backend  # Shows in console

# Container logs
docker-compose logs backend -f
docker-compose logs postgres -f
docker-compose logs redis -f

# Filtered logs
docker-compose logs backend | grep ERROR
docker-compose logs postgres | grep "ERROR"
```

### Performance

```bash
# Check container resource usage
docker stats

# Check database performance
docker-compose exec postgres psql -U sourcepilot -d sourcepilot -c "SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Redis memory usage
docker-compose exec redis redis-cli INFO memory
```

## Backup and Restore

### Database Backup

```bash
# Backup
docker-compose exec postgres pg_dump -U sourcepilot sourcepilot > backup.sql

# Compressed backup
docker-compose exec postgres pg_dump -U sourcepilot sourcepilot | gzip > backup.sql.gz

# Backup with custom format
docker-compose exec postgres pg_dump -U sourcepilot -Fc sourcepilot > backup.dump
```

### Database Restore

```bash
# Restore from SQL
docker-compose exec -T postgres psql -U sourcepilot sourcepilot < backup.sql

# Restore from compressed
gunzip -c backup.sql.gz | docker-compose exec -T postgres psql -U sourcepilot sourcepilot

# Restore from custom format
docker-compose exec postgres pg_restore -U sourcepilot -d sourcepilot < backup.dump
```

## Security Checklist

- [ ] Change JWT_SECRET in production
- [ ] Change SESSION_SECRET in production
- [ ] Use HTTPS for all external communication
- [ ] Configure CORS_ORIGIN for production domain
- [ ] Use managed database with automatic backups
- [ ] Enable database encryption at rest
- [ ] Set up API rate limiting
- [ ] Configure firewall rules
- [ ] Enable audit logging
- [ ] Set up monitoring and alerting
- [ ] Use secrets management (AWS Secrets Manager, Vault, etc.)
- [ ] Enable authentication on Redis
- [ ] Configure database user permissions
- [ ] Enable SSL for database connections

---

For more details, see:
- [ARCHITECTURE.md](ARCHITECTURE.md) - System design
- [MASTER_SPECIFICATION.md](MASTER_SPECIFICATION.md) - Feature requirements
- [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md) - Current progress
