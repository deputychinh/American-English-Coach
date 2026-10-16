# American English Coach — one command per task. `make help` lists them.
.DEFAULT_GOAL := help
# `web` and others are also directory names; declare every target phony so make never skips them.
.PHONY: help install vendor-web models doctor api api-lan web build-web serve lint format test test-legacy bench eval openapi e2e ci up down ios-assets ios-sync ios-build ios-run ios-open
SHELL := /bin/bash
BACKEND := cd backend &&
WEB := cd web &&
API_PORT ?= 8765
WEB_PORT ?= 3200

help: ## Show this help
	@grep -E '^[a-z0-9-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "} {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

# --- setup -------------------------------------------------------------------
install: ## Install repo tooling, backend (uv) and web (npm) dependencies, vendor MediaPipe
	npm install
	$(BACKEND) uv sync
	$(WEB) npm install
	$(MAKE) --no-print-directory vendor-web

vendor-web: ## Copy the MediaPipe WASM runtime and download the face model into web/public (not in git)
	$(WEB) node scripts/vendor-mediapipe.mjs

models: ## Download the phoneme model into data/models (checksums in docs/DATA-MANIFEST.json)
	$(BACKEND) uv run python -m app.ml.model_download

doctor: ## Check Python, Node, model files, ports and the macOS `say` voice
	$(BACKEND) uv run python -m app.doctor

# --- run ---------------------------------------------------------------------
api: ## Run the API with reload on :$(API_PORT)
	$(BACKEND) uv run uvicorn app.main:app --reload --host 127.0.0.1 --port $(API_PORT)

api-lan: ## Run the API reachable from phones on this network (0.0.0.0:$(API_PORT)); prints the address
	@echo "Máy chấm: http://$$(ipconfig getifaddr en0 2>/dev/null || hostname -I | awk '{print $$1}'):$(API_PORT)"
	$(BACKEND) COACH_HOST=0.0.0.0 uv run uvicorn app.main:app --host 0.0.0.0 --port $(API_PORT)

web: ## Run the web app in development on :$(WEB_PORT) (proxies /api to the API)
	$(WEB) npm run dev

build-web: ## Build the static web export into web/out (served by the API in production mode)
	$(WEB) npm run build

serve: build-web ## Production mode on one port: API + static web on :$(API_PORT)
	$(BACKEND) COACH_WEB_DIST_DIR=../web/out uv run uvicorn app.main:app --host 127.0.0.1 --port $(API_PORT)

# --- quality -----------------------------------------------------------------
lint: ## Lint and typecheck backend and web
	$(BACKEND) uv run ruff format --check . && uv run ruff check . && uv run mypy
	$(WEB) npm run lint && npm run typecheck
	npx prettier --check .

format: ## Format everything
	$(BACKEND) uv run ruff format . && uv run ruff check --fix .
	npx prettier --write .

test: ## Unit and API tests with coverage (backend + web)
	$(BACKEND) uv run pytest
	$(WEB) npm test

test-legacy: ## Tests of the legacy stdlib app kept under legacy/
	cd legacy && python3 -m unittest discover -s tests -q && node --test tests/lexicon-view.test.mjs

bench: ## Latency benchmark of the phoneme recognizer on this machine
	$(BACKEND) uv run python -m app.eval.bench_phoneme

eval: ## Mispronunciation-detection evaluation on speechocean762 (needs data/datasets)
	$(BACKEND) uv run python -m app.eval.speechocean

openapi: ## Export backend/openapi.json and regenerate the web API types
	$(BACKEND) uv run python -m app.openapi_export
	$(WEB) npm run gen:api

# --- iOS (Capacitor shell around the static web export) ---------------------
XCODE := DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
IOS_SIM ?= iPhone 17

ios-assets: ## Render the app icon and splash from public/icons/icon.svg into the Xcode asset catalog
	$(WEB) node scripts/render-app-assets.mjs && npx capacitor-assets generate --ios --iconBackgroundColor '#C2410C' --splashBackgroundColor '#F5F5F4' --splashBackgroundColorDark '#1C1917'

ios-sync: build-web ## Copy the web build into the iOS project (web/ios)
	$(WEB) npx cap sync ios

ios-build: ios-sync ## Build the iOS app for the simulator (Xcode required)
	cd web/ios/App && $(XCODE) xcodebuild -project App.xcodeproj -scheme App -configuration Debug -sdk iphonesimulator -destination 'platform=iOS Simulator,name=$(IOS_SIM)' -derivedDataPath build build CODE_SIGNING_ALLOWED=NO | tail -3

ios-run: ios-build ## Boot the simulator, install and launch the app
	$(XCODE) xcrun simctl boot "$(IOS_SIM)" 2>/dev/null || true
	open /Applications/Xcode.app/Contents/Developer/Applications/Simulator.app
	$(XCODE) xcrun simctl install booted web/ios/App/build/Build/Products/Debug-iphonesimulator/App.app
	$(XCODE) xcrun simctl launch booted com.deputychinh.americanenglishcoach

ios-open: ios-sync ## Open the Xcode project (sign with your team to run on a real iPhone)
	$(WEB) npx cap open ios

e2e: ## Browser journey with fake camera and microphone (Playwright, needs `make serve`)
	$(WEB) npx playwright test

ci: lint test ## Everything CI runs

# --- docker (optional; the app is local-first) --------------------------------
up: ## Build and run API + web in containers on :$(API_PORT)
	docker compose up -d --build --wait

down: ## Stop the containers
	docker compose down
