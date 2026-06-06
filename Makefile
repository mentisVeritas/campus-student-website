.PHONY: help install setup dev build start lint check clean \
        db-push db-migrate db-generate db-seed db-reset

NPM := npm

help: ## Show available commands
	@awk 'BEGIN {FS = ":.*##"; printf "Usage: make \033[36m<target>\033[0m\n\nTargets:\n"} \
		/^[a-zA-Z0-9_-]+:.*##/ {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install npm dependencies
	$(NPM) install

setup: install ## First-time setup (.env, db sync, seed)
	@test -f .env || cp .env.example .env
	@echo "Edit .env if needed."
	$(NPM) run db:push
	$(NPM) run db:seed

dev: ## Start development server
	$(NPM) run dev

build: ## Production build
	$(NPM) run build

start: ## Run production server (after build)
	$(NPM) run start

lint: ## Run ESLint
	$(NPM) run lint

check: lint build ## Lint and build

clean: ## Remove build cache (.next)
	rm -rf .next

db-push: ## Sync schema to database (dev)
	$(NPM) run db:push

db-migrate: ## Apply Prisma migrations (dev)
	$(NPM) run db:migrate

db-generate: ## Regenerate Prisma Client
	$(NPM) run db:generate

db-seed: ## Seed demo data
	$(NPM) run db:seed

db-reset: db-push db-seed ## Sync schema and re-seed database
