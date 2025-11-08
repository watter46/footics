# Makefile for Next.js Development (without devcontainer)

.PHONY: help up down restart logs build dev install clean lint format test shell ps exec prune stop start rebuild

# Docker Compose commands
up:
	docker compose up -d

down:
	docker compose down

start:
	docker compose start

restart:
	@make down
	@make up

logs:
	docker compose logs -f next

build:
	docker compose build --no-cache

# Development commands (inside container)
dev:
	docker compose exec next pnpm dev

install:
	docker compose exec next pnpm install

install-host:
	pnpm install --frozen-lockfile

# Code quality
lint:
	docker compose exec next pnpm lint

lint-fix:
	docker compose exec next pnpm lint --fix

format:
	docker compose exec next pnpm format

format-check:
	docker compose exec next pnpm format --check

# Testing
test:
	docker compose exec next pnpm test

# Utility commands
clean:
	docker compose down -v
	rm -rf .next

clean-all: clean
	rm -rf node_modules pnpm-lock.yaml

shell:
	docker compose exec next /bin/bash

ps:
	docker compose ps

exec:
	docker compose exec next $(CMD)

prune:
	docker system prune -af --volumes

# Container status
status:
	@echo "=== Container Status ==="
	@docker compose ps
	@echo ""
	@echo "=== Docker Images ==="
	@docker images | grep -E "(REPOSITORY|next)"
	@echo ""
	@echo "=== Docker Volumes ==="
	@docker volume ls | grep -E "(DRIVER|footics)"

# Help command
help:
	@echo "Next.js Development Makefile Commands (without devcontainer):"
	@echo ""
	@echo "🐳 Docker Compose:"
	@echo "  make up         - Start containers in detached mode"
	@echo "  make down       - Stop and remove containers"
	@echo "  make stop       - Stop containers without removing"
	@echo "  make start      - Start stopped containers"
	@echo "  make restart    - Restart containers"
	@echo "  make logs       - Show container logs (follow mode)"
	@echo "  make build      - Build Docker images from scratch"
	@echo "  make rebuild    - Rebuild and restart containers"
	@echo ""
	@echo "💻 Development:"
	@echo "  make dev        - Start Next.js dev server (foreground)"
	@echo "  make install    - Install dependencies in container"
	@echo "  make install-host - Install dependencies on host (for VS Code)"
	@echo ""
	@echo "✨ Code Quality:"
	@echo "  make lint       - Run ESLint"
	@echo "  make lint-fix   - Run ESLint with auto-fix"
	@echo "  make format     - Run Prettier"
	@echo "  make format-check - Check Prettier formatting"
	@echo ""
	@echo "🧪 Testing:"
	@echo "  make test       - Run tests"
	@echo ""
	@echo "🔧 Utility:"
	@echo "  make clean      - Clean containers, volumes, and .next"
	@echo "  make clean-all  - Clean everything including node_modules"
	@echo "  make shell      - Access container shell"
	@echo "  make ps         - Show running containers"
	@echo "  make status     - Show detailed status"
	@echo "  make exec CMD='<command>' - Execute custom command in container"
	@echo "  make prune      - Remove all unused Docker data"
	@echo "  make help       - Show this help message"
	@echo ""
	@echo "📝 Examples:"
	@echo "  make exec CMD='pnpm add react-query'"
	@echo "  make exec CMD='pnpm run build'"