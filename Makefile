.PHONY: ast lint-size verify ship map

map:
	bun run /home/watter46/.local/scripts/generate_repo_map.ts $(CURDIR)

ast:
	bun scripts/ast/extract-types.ts $(FILE)

lint-size:
	bun scripts/lint/check-file-size.ts $(FILES)

verify:
	bun scripts/verify/scoped-check.ts

ship:
	bun scripts/git/ship.ts

