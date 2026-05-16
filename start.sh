#!/bin/bash
set -e

# ═══════════════════════════════════════════════════════════════
#  AI Instagram Intelligence System — Auto-Setup & Launch Script
# ═══════════════════════════════════════════════════════════════

RESET="\033[0m"
BOLD="\033[1m"
GREEN="\033[32m"
BLUE="\033[34m"
YELLOW="\033[33m"
RED="\033[31m"
CYAN="\033[36m"

print_banner() {
  echo -e "${BOLD}${BLUE}"
  echo "  ╔══════════════════════════════════════════════════╗"
  echo "  ║   🤖 AI Instagram Intelligence System v1.0.0    ║"
  echo "  ║      Production Setup & Launch Script            ║"
  echo "  ╚══════════════════════════════════════════════════╝"
  echo -e "${RESET}"
}

log()     { echo -e "${GREEN}  ✅  $1${RESET}"; }
info()    { echo -e "${BLUE}  ℹ️   $1${RESET}"; }
warn()    { echo -e "${YELLOW}  ⚠️   $1${RESET}"; }
error()   { echo -e "${RED}  ❌  $1${RESET}"; exit 1; }
step()    { echo -e "\n${BOLD}${CYAN}  ▶ $1${RESET}"; }

# ── Dependency checks ─────────────────────────────────────────
check_deps() {
  step "Checking dependencies..."
  command -v docker       &>/dev/null || error "Docker not installed. Visit https://docs.docker.com/get-docker/"
  command -v docker compose &>/dev/null || \
  docker compose version  &>/dev/null || error "Docker Compose not installed"
  log "Docker & Docker Compose found"
}

# ── Environment setup ─────────────────────────────────────────
setup_env() {
  step "Setting up environment..."

  if [ ! -f ".env" ]; then
    cp .env.example .env
    warn ".env created from template — please add your API keys"
    warn "Required: OPENAI_API_KEY, RAPIDAPI_KEY"
    echo ""
    echo -e "${YELLOW}  Edit .env now? (y/n): ${RESET}"
    read -r answer
    if [ "$answer" = "y" ]; then
      ${EDITOR:-nano} .env
    fi
  else
    log ".env already exists"
  fi
}

# ── Generate secure secrets ───────────────────────────────────
generate_secrets() {
  step "Generating secure secrets..."
  if grep -q "change-this-secret" .env 2>/dev/null; then
    JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n' | head -c 64)
    JWT_REFRESH=$(openssl rand -base64 48 | tr -d '\n' | head -c 64)
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s/change-this-secret-min-32-chars-now/$JWT_SECRET/" .env
      sed -i '' "s/change-this-refresh-secret-min-32-chars/$JWT_REFRESH/" .env
    else
      sed -i "s/change-this-secret-min-32-chars-now/$JWT_SECRET/" .env
      sed -i "s/change-this-refresh-secret-min-32-chars/$JWT_REFRESH/" .env
    fi
    log "Secure JWT secrets generated"
  else
    log "JWT secrets already configured"
  fi
}

# ── Docker build & start ──────────────────────────────────────
start_services() {
  step "Building & starting Docker services..."

  # Pull base images
  docker compose pull postgres redis nginx --ignore-buildx-config 2>/dev/null || true

  # Build & start
  docker compose up -d --build

  log "All services starting..."
}

# ── Wait for services ─────────────────────────────────────────
wait_for_services() {
  step "Waiting for services to be ready..."
  
  echo -n "  Postgres "
  for i in {1..30}; do
    if docker compose exec -T postgres pg_isready -U iguser &>/dev/null 2>&1; then
      echo -e " ${GREEN}ready${RESET}"
      break
    fi
    echo -n "."
    sleep 2
  done

  echo -n "  Redis    "
  for i in {1..15}; do
    if docker compose exec -T redis redis-cli ping &>/dev/null 2>&1; then
      echo -e " ${GREEN}ready${RESET}"
      break
    fi
    echo -n "."
    sleep 1
  done

  echo -n "  Backend  "
  for i in {1..40}; do
    if curl -sf http://localhost:5000/api/health &>/dev/null; then
      echo -e " ${GREEN}ready${RESET}"
      break
    fi
    echo -n "."
    sleep 3
  done
}

# ── Database migrations ───────────────────────────────────────
run_migrations() {
  step "Running database migrations..."
  docker compose exec -T backend npx prisma migrate deploy && log "Migrations applied"
}

# ── Seed database ─────────────────────────────────────────────
seed_database() {
  step "Seeding database with demo accounts..."
  docker compose exec -T backend node -e "
    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcryptjs');
    const prisma = new PrismaClient();
    async function seed() {
      const hash1 = await bcrypt.hash('Admin@12345', 12);
      const hash2 = await bcrypt.hash('Demo@12345', 12);
      await prisma.user.upsert({ where: { email: 'admin@igintel.io' }, update: {}, create: { email: 'admin@igintel.io', passwordHash: hash1, name: 'Admin', role: 'ADMIN', plan: 'ENTERPRISE', monthlyQuota: 99999 } });
      await prisma.user.upsert({ where: { email: 'demo@igintel.io' }, update: {}, create: { email: 'demo@igintel.io', passwordHash: hash2, name: 'Demo User', role: 'USER', plan: 'PRO', monthlyQuota: 10000 } });
      console.log('Seeded!');
      await prisma.\$disconnect();
    }
    seed().catch(console.error);
  " && log "Demo accounts created"
}

# ── Print success info ────────────────────────────────────────
print_success() {
  echo ""
  echo -e "${BOLD}${GREEN}  ╔══════════════════════════════════════════════════╗${RESET}"
  echo -e "${BOLD}${GREEN}  ║        🎉 SYSTEM IS LIVE AND RUNNING!            ║${RESET}"
  echo -e "${BOLD}${GREEN}  ╚══════════════════════════════════════════════════╝${RESET}"
  echo ""
  echo -e "${BOLD}  📡 Access Points:${RESET}"
  echo -e "     Dashboard  → ${CYAN}http://localhost:3000${RESET}"
  echo -e "     API        → ${CYAN}http://localhost:5000/api${RESET}"
  echo -e "     Health     → ${CYAN}http://localhost:5000/api/health${RESET}"
  echo ""
  echo -e "${BOLD}  🔐 Demo Credentials:${RESET}"
  echo -e "     Admin  → ${YELLOW}admin@igintel.io${RESET} / ${YELLOW}Admin@12345${RESET}"
  echo -e "     Demo   → ${YELLOW}demo@igintel.io${RESET}  / ${YELLOW}Demo@12345${RESET}"
  echo ""
  echo -e "${BOLD}  🐳 Docker Commands:${RESET}"
  echo -e "     View logs   → ${CYAN}docker compose logs -f${RESET}"
  echo -e "     Stop all    → ${CYAN}docker compose down${RESET}"
  echo -e "     Restart     → ${CYAN}docker compose restart${RESET}"
  echo ""
  echo -e "${BOLD}  ⚙️  Next Steps:${RESET}"
  echo -e "     1. Add OPENAI_API_KEY in .env → restart backend"
  echo -e "     2. Add RAPIDAPI_KEY in .env   → restart backend"
  echo -e "     3. Start first discovery job from the dashboard"
  echo ""
}

# ── Main ──────────────────────────────────────────────────────
main() {
  clear
  print_banner
  check_deps
  setup_env
  generate_secrets
  start_services
  wait_for_services
  run_migrations
  seed_database
  print_success
}

main "$@"
