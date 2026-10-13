.PHONY: ast lint-size verify ship map

map:
	bun scripts/map/generate-repo-map.ts $(CURDIR)

ast:
	bun scripts/ast/extract-types.ts $(FILE)

lint-size:
	bun scripts/lint/check-file-size.ts $(FILES)

verify:
	bun scripts/verify/scoped-check.ts

ship:
	bun scripts/git/ship.ts

