PHONY: help install cdk-install cdk-metadata cdk-diff cdk-notices cdk-clear-lock cdk-lint

help: ## automatically generates a documentation of the available Makefile targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

CDK = docker compose run cdk

build: ## Build the project
	@docker compose --profile all build

up: ## Start workers and persister containers
	@docker compose --profile worker --profile persister up -d --wait

lint: cdk-lint persister-lint ## Run all linters

down: ## Stop all containers
	@docker compose --profile all down

install: cdk-install ## Install dependencies

cdk-install: ## Install CDK dependencies
	${CDK} npm install

cdk-diff: .cdk-clear-lock ## Return CDK diff
	${CDK} npx cdk diff

cdk-bootstrap: .cdk-clear-lock ## Run CDK bootstrap
	${CDK} npx cdk bootstrap

cdk-deploy: .cdk-clear-lock cdk-bootstrap ## Run CDK deploy
	${CDK} npx cdk deploy

cdk-lint: ## Lint CDK
	${CDK} npm run lint

cdk-test: ## Test CDK
	${CDK} npm run test

.cdk-clear-lock: ## Clear CDK lock
	${CDK} rm -rf cdk.out

persister-lint: ## Run golangci-lint
	@docker compose exec persister golangci-lint run

tests-bruno: ## Run Bruno tests
	@docker compose --profile worker build
	@docker compose --profile worker up --force-recreate -d
	@docker compose --profile tests run --rm bruno
