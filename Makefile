.PHONY: help metrics metrics-summary metrics-tail metrics-raw metrics-clean tickets tickets-todo verify check type-check test

help:
	@echo "Footics Development & Metrics Commands"
	@echo "======================================"
	@echo "  make metrics-summary (or make metrics) : Display aggregate token usage summary"
	@echo "  make metrics-tail [N=5]               : Show the N most recent session token records"
	@echo "  make metrics-raw                      : Output raw JSONL token logs"
	@echo "  make metrics-clean                    : Clear token usage logs"
	@echo "  make tickets                          : List all Regista tickets"
	@echo "  make tickets-todo                     : List actionable (TODO) tickets"
	@echo "  make verify                           : Run full project verification (check + type-check + test)"
	@echo "  make check                            : Run Biome check"
	@echo "  make type-check                       : Run TypeScript type check"
	@echo "  make test                             : Run Vitest tests"

metrics: metrics-summary

metrics-summary:
	@node scripts/metrics/summary-tokens.js summary

metrics-tail:
	@node scripts/metrics/summary-tokens.js tail $(if $(N),$(N),5)

metrics-raw:
	@node scripts/metrics/summary-tokens.js raw

metrics-clean:
	@node scripts/metrics/summary-tokens.js clean

tickets:
	@node .agents/scripts/list-tickets.js

tickets-todo:
	@node .agents/scripts/list-tickets.js --todo

verify:
	@rtk pnpm verify

check:
	@rtk pnpm check

type-check:
	@rtk pnpm type-check

test:
	@rtk pnpm test
