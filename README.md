# 🤖 AI Instagram Public Account Discovery & Intelligence System

> **Enterprise-grade SaaS platform** for discovering, analyzing, and scoring Instagram public accounts using AI-powered niche detection, engagement analysis, and lead scoring.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Environment Setup](#environment-setup)
- [API Reference](#api-reference)
- [Compliance & Ethics](#compliance--ethics)
- [Deployment](#deployment)

---

## 🌟 Overview

The AI Instagram Public Account Discovery & Intelligence System is a production-ready SaaS platform that helps marketers, agencies, and growth teams identify and analyze Instagram public accounts. The platform uses AI to detect niches, analyze engagement patterns, and score leads automatically.

**⚠️ COMPLIANCE NOTICE**: This system only processes **publicly available data** from Instagram's public-facing endpoints. It strictly follows Instagram's Terms of Service, respects rate limits, and complies with GDPR/CCPA data regulations.

---

## ✨ Features

### 🔍 Discovery Engine
- Smart keyword and hashtag-based account discovery
- Advanced filtering (followers 1K–100K, engagement rate, post frequency)
- Geographic and language targeting
- Niche category detection (50+ categories)

### 🧠 AI Intelligence Layer
- GPT-4 powered niche classification
- Content theme analysis
- Audience sentiment scoring
- Brand safety detection
- Automated lead quality scoring (0–100)

### 📊 Analytics Dashboard
- Real-time discovery metrics
- Engagement rate benchmarking
- Lead pipeline visualization
- Historical trend analysis
- Competitor comparison tools

### 📤 Export & Integrations
- CSV / Excel / JSON export
- HubSpot CRM integration
- Zapier webhook support
- Slack notifications
- REST API for custom integrations

### 🔐 Security & Compliance
- JWT authentication with refresh tokens
- Role-based access control (RBAC)
- Rate limiting & request throttling
- GDPR-compliant data handling
- Audit logging for all operations

### ⚡ Performance
- Redis-backed caching layer
- BullMQ job queue for async processing
- Horizontal scaling support
- 99.9% uptime SLA architecture

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Zustand, React Query |
| **Backend** | Node.js 18+, Express, TypeScript |
| **Database** | PostgreSQL 15, Prisma ORM |
| **Cache** | Redis 7 |
| **Queue** | BullMQ |
| **AI** | OpenAI GPT-4 / Claude API |
| **Auth** | JWT, bcrypt |
| **DevOps** | Docker, Docker Compose, Nginx |
| **Monitoring** | Winston logger, Prometheus metrics |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React SPA)                     │
│  Dashboard │ Discovery │ Analytics │ Leads │ Export │ Settings│
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API / WebSocket
┌──────────────────────────▼──────────────────────────────────┐
│                    BACKEND (Express API)                      │
│  Auth │ Discovery │ Analytics │ AI Engine │ Export │ Webhooks │
└─────┬────────────────────┬────────────────────────┬──────────┘
      │                    │                        │
┌─────▼────┐    ┌──────────▼──────────┐   ┌────────▼─────────┐
│PostgreSQL│    │    Redis Cache +     │   │   BullMQ Jobs    │
│  (Data)  │    │    Session Store     │   │  (Async Tasks)   │
└──────────┘    └─────────────────────┘   └──────────────────┘
                                                   │
                                        ┌──────────▼──────────┐
                                        │  AI Services Layer   │
                                        │  OpenAI / Claude API │
                                        └─────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (recommended)

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/manpreet1singh2/ai-instagram-account-scraper.git
cd ai-instagram-account-scraper

# Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit .env with your API keys
nano .env

# Start all services
docker-compose up -d

# Run database migrations
docker-compose exec backend npx prisma migrate deploy

# Application is live at http://localhost:3000
```

### Option 2: Manual Setup

```bash
# Install backend dependencies
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev

# Install frontend dependencies (new terminal)
cd frontend
npm install
npm run dev
```

---

## ⚙️ Environment Setup

### Required API Keys

```bash
# OpenAI API (for AI niche detection)
OPENAI_API_KEY=sk-...

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/instagram_intel

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secrets
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key

# RapidAPI (for Instagram data - public endpoints only)
RAPIDAPI_KEY=your-rapidapi-key
```

See `.env.example` for full configuration reference.

---

## 📡 API Reference

### Authentication
```
POST /api/auth/register    - Register new account
POST /api/auth/login       - Login
POST /api/auth/refresh     - Refresh JWT token
POST /api/auth/logout      - Logout
```

### Discovery
```
POST /api/discovery/search      - Start discovery job
GET  /api/discovery/jobs        - List discovery jobs
GET  /api/discovery/jobs/:id    - Get job status
GET  /api/discovery/results     - Get discovery results
```

### Profiles
```
GET  /api/profiles              - List discovered profiles
GET  /api/profiles/:id          - Get profile details
POST /api/profiles/:id/analyze  - Trigger AI analysis
PUT  /api/profiles/:id/score    - Update lead score
```

### Analytics
```
GET  /api/analytics/overview    - Dashboard stats
GET  /api/analytics/trends      - Trend data
GET  /api/analytics/niches      - Niche distribution
```

### Export
```
POST /api/export/csv            - Export as CSV
POST /api/export/excel          - Export as Excel
POST /api/export/json           - Export as JSON
GET  /api/export/jobs/:id       - Export job status
```

---

## ⚖️ Compliance & Ethics

This platform is designed with compliance as a first principle:

1. **Public Data Only**: Only processes data publicly visible without authentication
2. **Rate Limiting**: Respects platform rate limits to avoid service disruption
3. **No PII Storage**: Does not store private personal information
4. **GDPR Compliant**: Data retention policies and deletion rights implemented
5. **Terms of Service**: Operates within Instagram's public API guidelines
6. **Opt-Out Support**: Allows accounts to request removal from the database

**Users are responsible for ensuring their use of this platform complies with applicable laws and platform terms of service.**

---

## 🚢 Deployment

### Production Deployment (Docker)

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables for Production

```bash
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

*Built with ❤️ for ethical, data-driven Instagram marketing intelligence.*
