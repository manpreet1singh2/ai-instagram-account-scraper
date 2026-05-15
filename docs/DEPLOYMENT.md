# Deployment Guide

## Prerequisites
- Docker 24+
- Docker Compose v2+
- Domain name (for production)
- SSL certificate (Let's Encrypt recommended)

## Quick Deploy

```bash
git clone https://github.com/manpreet1singh2/ai-instagram-account-scraper.git
cd ai-instagram-account-scraper
cp .env.example .env
# Edit .env with your API keys
docker-compose up -d
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend npm run seed
```

## Environment Variables (Required)

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key for AI analysis |
| `RAPIDAPI_KEY` | RapidAPI key for Instagram data |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Random 32+ char secret |

## Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Change all default passwords
- [ ] Configure SSL/TLS
- [ ] Set up database backups
- [ ] Configure log rotation
- [ ] Enable monitoring (Prometheus/Grafana)
- [ ] Set up error tracking (Sentry)
