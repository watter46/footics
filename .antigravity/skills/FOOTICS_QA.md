---
name: FOOTICS_QA
description: Comprehensive UI and Data Integrity verification skill for Footics
---
# FOOTICS QA Skill

## Overview
This skill acts as your ultimate verifying mechanism. Before declaring a feature "complete", invoke this skill to ensure all Footics-specific domain rules, Action Bridge interactions, and UI behaviors function as expected in a running environment.

## Validation Checklist

### 1. Build & Lint Validation
- Verify `pnpm run lint` and `pnpm run build` output zero critical errors.

### 2. UI & Component Validation
- Launch the application locally and use the browser_subagent to interact with the new feature.
- Verify that `dnd-kit` drop zones visually highlight.
- Verify the coordinate mapping logic (0-100 to screen size) is behaving without regressions.

### 3. Data Flow Validation (DuckDB & IndexedDB)
- Verify that modified Data correctly saves to IndexedDB.
- All objects being saved must satisfy the Single Source of Truth defined in `src/lib/schema.ts` (e.g. use Zod `.parse` or `.safeParse`).

If any of these fail, you must analyze the logs or DOM, patch the files, and restart the QA process. Do not stop until all checks pass.
