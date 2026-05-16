# 🤖 AI Instagram Intelligence System

> Enterprise-grade platform — AI niche detection, engagement analysis, lead scoring for Instagram public accounts.

![Version](https://img.shields.io/badge/version-1.0.0-blue?style=flat-square) ![Node](https://img.shields.io/badge/node-18+-brightgreen?style=flat-square) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square)

---

## 🚀 One-Command Deploy (Local)

```bash
git clone https://github.com/manpreet1singh2/ai-instagram-account-scraper.git
cd ai-instagram-account-scraper
chmod +x start.sh && ./start.sh
```

Open **http://localhost:3000**

**Demo credentials:**
| Role  | Email              | Password    |
|-------|--------------------|-------------|
| Admin | admin@igintel.io   | Admin@12345 |
| Demo  | demo@igintel.io    | Demo@12345  |

---

## 🌐 Free Cloud Deploy

### Railway (Recommended — Free Tier)
1. [railway.app](https://railway.app) → New Project → Connect GitHub repo
2. Add PostgreSQL + Redis plugins
3. Add env vars from `.env.example`
4. Deploy — Railway gives a live URL instantly

### Render.com (Free)
- Backend → New Web Service → `backend/` folder → Add env vars
- Frontend → New Static Site → `frontend/` folder → Build: `npm run build` → Publish: `dist/`
- Add PostgreSQL + Redis from Render dashboard

### VPS (DigitalOcean/Linode)
```bash
sudo apt install -y docker.io docker-compose-plugin git
git clone https://github.com/manpreet1singh2/ai-instagram-account-scraper.git
cd ai-instagram-account-scraper && cp .env.example .env
./start.sh
```

---

## ⚙️ Required API Keys

| Key | Source | Purpose |
|-----|--------|---------|
| `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com) | AI niche detection |
| `RAPIDAPI_KEY` | [rapidapi.com](https://rapidapi.com/search/instagram) | Instagram public data |

---

## 📦 Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion |
| Backend | Node.js 18 + Express + TypeScript |
| Database | PostgreSQL 15 + Prisma ORM |
| Cache | Redis 7 + BullMQ |
| AI | OpenAI GPT-4 Turbo |
| Infra | Docker + Nginx |

---

## 🛠 Make Commands

```bash
make install     # Install all deps
make up          # Start Docker services
make migrate     # Run DB migrations
make seed        # Seed demo data
make logs        # View all logs
make status      # Check service health
make reset       # Full reset + rebuild
```

---

## 📡 API Reference

```
POST /api/auth/login               # Login
POST /api/auth/register            # Register

POST /api/discovery/search         # Start discovery job
GET  /api/discovery/jobs           # List jobs
GET  /api/discovery/jobs/:id       # Job status + progress
GET  /api/discovery/results        # Discovered profiles

GET  /api/profiles                 # All profiles (paginated)
GET  /api/profiles/:id             # Profile + posts
POST /api/profiles/:id/analyze     # Queue AI analysis

GET  /api/analytics/overview       # Dashboard stats
GET  /api/analytics/trends         # 30-day trend
GET  /api/analytics/niches         # Niche breakdown

GET  /api/leads                    # Lead pipeline
POST /api/leads                    # Save profile as lead
PATCH /api/leads/:id               # Update lead status

POST /api/export                   # Start CSV/Excel/JSON export
GET  /api/export/jobs              # Export history
GET  /api/export/download/:file    # Download file

GET  /api/health                   # Health check
```

---

## ⚖️ Compliance
Only processes **publicly available** Instagram data. Respects rate limits. GDPR-compliant.

## 📄 License
MIT
