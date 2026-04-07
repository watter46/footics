---
description: Implement a feature autonomously and self-heal any linter or build errors
---
# Feature Implementation Workflow

1. Review the requirement or implementation plan for the target feature.
2. Implement the missing code or changes.
// turbo
3. Run `pnpm run lint` and analyze/fix any issues automatically.
// turbo
4. Run `pnpm run build` to verify the application builds without TypeScript or bundling errors.
5. If errors persist, fix them and repeat step 4. Otherwise, the feature is successfully implemented on code-level.
