# System Architecture

## Overview

```
Client (React SPA)
    ↓  HTTPS
Nginx (Reverse Proxy)
    ├── /api  → Express Backend (Node.js)
    │              ├── PostgreSQL (Prisma ORM)
    │              ├── Redis (Cache + Sessions)
    │              └── BullMQ (Job Queues)
    │                      ├── Discovery Worker
    │                      ├── AI Analysis Worker
    │                      └── Export Worker
    └── /     → React Frontend (Vite build)
```

## Discovery Pipeline

```
User triggers Discovery Job
    ↓
Job created in PostgreSQL (status: PENDING)
    ↓
BullMQ enqueues Discovery job
    ↓
Discovery Worker picks up job
    ↓
Search Instagram by hashtags/keywords (RapidAPI)
    ↓
Rate-limited fetcher (30 req/min)
    ↓
For each discovered username:
    ├── Fetch full profile data
    ├── Check follower range filter
    ├── Detect engagement anomalies (bot check)
    ├── Calculate quick lead score
    ├── Save to PostgreSQL
    └── Queue AI Analysis (if score >= 40)
    ↓
AI Analysis Worker:
    ├── OpenAI GPT-4 niche classification
    ├── Content theme analysis
    ├── Brand safety scoring
    └── Update profile with full AI analysis
    ↓
Job marked COMPLETED
    ↓
User notified (real-time polling)
```

## Lead Scoring Algorithm

Score = Follower Score (0-25) + Engagement Score (0-30) + Activity Score (0-15) + Profile Completeness (0-15) + Brand Safety (0-15)

| Range | Tier      |
|-------|-----------|
| 75-100 | QUALIFIED |
| 55-74  | HOT       |
| 35-54  | WARM      |
| 0-34   | COLD      |

## Security Model

- JWT (15min) + Refresh Token (7 days) rotation
- Redis session caching
- bcrypt password hashing (12 rounds)
- Rate limiting: 100 req/15min per IP
- Helmet.js security headers
- CORS whitelist
- Input validation (express-validator + zod)
- Audit logging for all mutations
