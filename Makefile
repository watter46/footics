.PHONY: ast lint-size verify ship

ast:
	npx tsx scripts/ast/extract-types.ts $(FILE)

lint-size:
	npx tsx scripts/lint/check-file-size.ts $(FILES)

verify:
	npx tsx scripts/verify/scoped-check.ts

ship:
	npx tsx scripts/git/ship.ts
