.PHONY: help install dev start stop restart logs build clean reset migrate seed test lint status

# Colors
GREEN  := \033[0;32m
YELLOW := \033[0;33m
CYAN   := \033[0;36m
RESET  := \033[0m

help: ## Show this help message
	@echo ""
	@echo "  $(CYAN)AI Instagram Intelligence System$(RESET)"
	@echo ""
	@echo "  $(YELLOW)Usage:$(RESET) make [command]"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-15s$(RESET) %s\n", $$1, $$2}'
	@echo ""

install: ## Install all dependencies (backend + frontend)
	@echo "$(CYAN)Installing backend dependencies...$(RESET)"
	cd backend && npm install
	@echo "$(CYAN)Installing frontend dependencies...$(RESET)"
	cd frontend && npm install
	@echo "$(GREEN)✅ All dependencies installed$(RESET)"

dev: ## Start development mode (requires Postgres + Redis running)
	@echo "$(CYAN)Starting in development mode...$(RESET)"
	cd backend && npm run dev &
	cd frontend && npm run dev &
	@echo "$(GREEN)✅ Dev servers started$(RESET)"
	@echo "   Backend  → http://localhost:5000"
	@echo "   Frontend → http://localhost:3000"

start: ## Start all services with Docker
	@bash start.sh

up: ## Docker Compose up (detached)
	docker compose up -d
	@echo "$(GREEN)✅ Services started$(RESET)"

stop: ## Stop all Docker services
	docker compose down
	@echo "$(GREEN)✅ All services stopped$(RESET)"

restart: ## Restart all services
	docker compose restart
	@echo "$(GREEN)✅ Services restarted$(RESET)"

restart-backend: ## Restart only the backend
	docker compose restart backend
	@echo "$(GREEN)✅ Backend restarted$(RESET)"

build: ## Build all Docker images
	docker compose build --no-cache
	@echo "$(GREEN)✅ Images built$(RESET)"

logs: ## Tail logs from all services
	docker compose logs -f

logs-backend: ## Tail backend logs only
	docker compose logs -f backend

logs-frontend: ## Tail frontend logs only
	docker compose logs -f frontend

migrate: ## Run database migrations
	docker compose exec backend npx prisma migrate deploy
	@echo "$(GREEN)✅ Migrations applied$(RESET)"

migrate-dev: ## Run dev database migrations
	cd backend && npx prisma migrate dev

seed: ## Seed database with demo data
	docker compose exec backend npm run seed
	@echo "$(GREEN)✅ Database seeded$(RESET)"

studio: ## Open Prisma Studio (DB browser)
	cd backend && npx prisma studio

test: ## Run backend tests
	cd backend && npm test

lint: ## Lint all code
	cd backend && npm run lint
	cd frontend && npm run lint
	@echo "$(GREEN)✅ Linting complete$(RESET)"

clean: ## Remove containers and volumes (⚠️  data loss)
	@echo "$(YELLOW)⚠️  This will delete all data. Continue? (y/N)$(RESET)"
	@read ans; [ "$$ans" = "y" ] || exit 0
	docker compose down -v --remove-orphans
	@echo "$(GREEN)✅ Cleaned up$(RESET)"

status: ## Show status of all services
	@echo "$(CYAN)Service Status:$(RESET)"
	docker compose ps
	@echo ""
	@echo "$(CYAN)API Health:$(RESET)"
	@curl -sf http://localhost:5000/api/health | python3 -m json.tool 2>/dev/null || echo "  Backend not reachable"

reset: ## Full reset — clean + rebuild + reseed
	$(MAKE) clean
	$(MAKE) build
	$(MAKE) up
	sleep 15
	$(MAKE) migrate
	$(MAKE) seed
	@echo "$(GREEN)✅ Full reset complete$(RESET)"

pull: ## Pull latest code from GitHub
	git pull origin main
	@echo "$(GREEN)✅ Code updated$(RESET)"

deploy: pull build up migrate ## Full production deploy
	@echo "$(GREEN)✅ Deployed successfully$(RESET)"
