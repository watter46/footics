.PHONY: help metrics metrics-summary metrics-tail metrics-raw metrics-clean tickets tickets-todo done

help:
	@echo "Footics Development & Metrics Commands"
	@echo "======================================"
	@echo "  make metrics-summary (or make metrics) : Display aggregate token usage summary"
	@echo "  make metrics-tail [N=5]               : Show the N most recent session token records"
	@echo "  make metrics-raw                      : Output raw JSONL token logs"
	@echo "  make metrics-clean                    : Clear token usage logs"
	@echo "  make tickets                          : List all Regista tickets"
	@echo "  make tickets-todo                     : List actionable (TODO) tickets"
	@echo "  make done <ID...>                     : Complete tickets and commit (e.g. make done L1-CLI-001)"

metrics: metrics-summary

metrics-summary:
	@node .agents/scripts/metrics/summary-tokens.js summary

metrics-tail:
	@node .agents/scripts/metrics/summary-tokens.js tail $(if $(N),$(N),5)

metrics-raw:
	@node .agents/scripts/metrics/summary-tokens.js raw

metrics-clean:
	@node .agents/scripts/metrics/summary-tokens.js clean

tickets:
	@node .agents/scripts/tickets/list.js

tickets-todo:
	@node .agents/scripts/tickets/list.js --todo

done: ## チケットをDONEにしてコミット (例: make done L1-UI-001 L1-UI-002)
	@pnpm ticket:done $(filter-out $@,$(MAKECMDGOALS))

%:
	@:
