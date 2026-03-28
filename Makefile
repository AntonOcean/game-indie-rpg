SHELL := /bin/bash
.DEFAULT_GOAL := help

PROJECT_ROOT := $(abspath .)

.PHONY: help setup install assets-sync build start stop dev dev-client docker-build docker-up docker-down docker-logs all

help:
	@echo "game-rpg — local commands"
	@echo ""
	@echo "  make setup        copy .env.example -> .env if .env is missing"
	@echo "  make install      npm install (workspaces)"
	@echo "  make assets-sync  copy repo assets/ -> apps/client/public/assets/"
	@echo "  make build        Vite production build (client)"
	@echo "  make start        Express static server (needs apps/client/dist)"
	@echo "  make stop         kill process listening on PORT from .env (default 3000)"
	@echo "  make dev          Vite dev server (client)"
	@echo "  make dev-client   same as dev"
	@echo "  make all          setup + install + assets-sync + build + start"
	@echo "  make docker-build docker compose build"
	@echo "  make docker-up    build and run stack (detached)"
	@echo "  make docker-down  stop stack"
	@echo "  make docker-logs  follow web logs"
	@echo ""
	@echo "First time: make setup && make install && make assets-sync && make dev"
	@echo "Production-like local: make build && make start"

setup:
	@test -f .env || cp .env.example .env
	@echo "setup: .env is ready (created from .env.example if it was missing)"

install: setup
	npm install

assets-sync:
	mkdir -p apps/client/public/assets
	cp -R assets/. apps/client/public/assets/

build: install assets-sync
	npm run build:client

start:
	@bash -lc 'set -a; [[ -f .env ]] && source .env; set +a; cd apps/server && node index.js'

stop:
	@bash -lc 'set -a; [[ -f "$(PROJECT_ROOT)/.env" ]] && source "$(PROJECT_ROOT)/.env"; set +a; P=$${PORT:-3000}; \
	  PIDS=$$(lsof -tiTCP:$$P -sTCP:LISTEN 2>/dev/null || true); \
	  if [[ -z "$$PIDS" ]]; then echo "stop: nothing listening on TCP port $$P"; exit 0; fi; \
	  echo "stop: sending SIGTERM to PID(s) on port $$P: $$PIDS"; \
	  kill $$PIDS 2>/dev/null || true; \
	  sleep 0.3; \
	  PIDS2=$$(lsof -tiTCP:$$P -sTCP:LISTEN 2>/dev/null || true); \
	  if [[ -n "$$PIDS2" ]]; then echo "stop: still listening, sending SIGKILL to $$PIDS2"; kill -9 $$PIDS2 2>/dev/null || true; fi; \
	  echo "stop: port $$P should be free"'

dev dev-client: install assets-sync
	@bash -lc 'set -a; [[ -f .env ]] && source .env; set +a; cd apps/client && npm run dev'

all: setup install assets-sync build start

docker-build:
	docker compose build

docker-up: docker-build
	docker compose up -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f web
