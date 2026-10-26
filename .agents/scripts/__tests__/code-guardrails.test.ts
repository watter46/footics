import { describe, expect, it } from 'bun:test';
import {
  type GuardrailsBaseline,
  validateFileAgainstBaseline,
} from '../lib/code-guardrails';

function createEmptyBaseline(): GuardrailsBaseline {
  return {
    maxLinesOver300: {},
    explicitAny: {},
    reactFc: [],
    customEvent: [],
    tacticalSingleton: [],
    consoleLog: [],
    deepRelativeImport: {},
    eslintDisable: [],
    useClientViolations: [],
    pascalCaseComponents: [],
  };
}

describe('code-guardrails validateFileAgainstBaseline', () => {
  it('passes a clean kebab-case component', () => {
    const code = `
      'use client';
      interface CardProps { title: string }
      export function Card({ title }: CardProps) {
        return <div>{title}</div>;
      }
    `;
    const errs = validateFileAgainstBaseline(
      'src/features/teams/components/player-card.tsx',
      code,
      createEmptyBaseline(),
    );
    expect(errs).toEqual([]);
  });

  it('blocks explicit any and as unknown as in non-baseline files (R1)', () => {
    const code = `export const x: any = 1;`;
    const errs = validateFileAgainstBaseline(
      'src/lib/new-util.ts',
      code,
      createEmptyBaseline(),
    );
    expect(errs.some((e) => e.includes('[R1: Type Safety]'))).toBe(true);
  });

  it('allows frozen baseline count of any, but blocks increase (R1)', () => {
    const baseline = createEmptyBaseline();
    baseline.explicitAny['src/lib/legacy.ts'] = 1;

    expect(
      validateFileAgainstBaseline(
        'src/lib/legacy.ts',
        'export const a: any = 1;',
        baseline,
      ),
    ).toEqual([]);

    const increased = validateFileAgainstBaseline(
      'src/lib/legacy.ts',
      'export const a: any = 1;\nexport const b = 2 as unknown as string;',
      baseline,
    );
    expect(increased.some((e) => e.includes('[R1: Type Safety]'))).toBe(true);
  });

  it('blocks React.FC and forwardRef in new components (R2)', () => {
    const code = `export const Box: React.FC = () => <div />;`;
    const errs = validateFileAgainstBaseline(
      'src/components/ui/new-box.tsx',
      code,
      createEmptyBaseline(),
    );
    expect(errs.some((e) => e.includes('[R2: React 19]'))).toBe(true);
  });

  it('blocks useTacticalUnifiedStore in new files and always in core/ (R4)', () => {
    const baseline = createEmptyBaseline();
    baseline.tacticalSingleton.push(
      'src/features/tactical-unified/core/components/bad.tsx',
    );
    const code = `import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';`;

    // Even if in baseline, core/ is strictly blocked
    const coreErrs = validateFileAgainstBaseline(
      'src/features/tactical-unified/core/components/bad.tsx',
      code,
      baseline,
    );
    expect(coreErrs.some((e) => e.includes('[R4: Store Provider]'))).toBe(true);

    // Non-core new file is blocked
    const newPanelErrs = validateFileAgainstBaseline(
      'src/features/tactical-unified/panels/new-panel.tsx',
      code,
      baseline,
    );
    expect(newPanelErrs.some((e) => e.includes('[R4: Store Provider]'))).toBe(
      true,
    );
  });

  it('blocks CustomEvent and dispatchEvent in new files (R6)', () => {
    const code = `window.dispatchEvent(new CustomEvent('footics-action'));`;
    const errs = validateFileAgainstBaseline(
      'src/hooks/use-new-action.ts',
      code,
      createEmptyBaseline(),
    );
    expect(errs.some((e) => e.includes('[R6: Communication]'))).toBe(true);
  });

  it('blocks console.log, eslint-disable, PascalCase.tsx, and >300 lines (R7, R8)', () => {
    const longCode = Array.from({ length: 305 }, () => 'const x = 1;').join(
      '\n',
    );
    const errs = validateFileAgainstBaseline(
      'src/features/teams/components/NewDialog.tsx',
      `${longCode}\nconsole.log('hi');\n// eslint-disable-next-line`,
      createEmptyBaseline(),
    );
    expect(errs.some((e) => e.includes('[R7: Logging]'))).toBe(true);
    expect(errs.some((e) => e.includes('[R8: File Size]'))).toBe(true);
    expect(errs.some((e) => e.includes('[R8: Tooling]'))).toBe(true);
    expect(errs.some((e) => e.includes('[R8: Naming]'))).toBe(true);
  });

  it('blocks deep relative imports ../../ and use client in pure .ts or app/page.tsx, but allows use client in hooks (R9, R11)', () => {
    const tsCode = `'use client';\nimport { a } from '../../lib/utils';`;
    // Pure util .ts should be blocked for 'use client'
    const utilErrs = validateFileAgainstBaseline(
      'src/features/teams/utils/team-calc.ts',
      tsCode,
      createEmptyBaseline(),
    );
    expect(utilErrs.some((e) => e.includes('[R9: Imports]'))).toBe(true);
    expect(utilErrs.some((e) => e.includes('[R11: Next.js Boundary]'))).toBe(
      true,
    );

    // Custom hook .ts allows 'use client'
    const hookCode = `'use client';\nimport { useState } from 'react';\nexport function useTeam() { return useState(null); }`;
    const hookErrs = validateFileAgainstBaseline(
      'src/features/teams/hooks/use-team.ts',
      hookCode,
      createEmptyBaseline(),
    );
    expect(hookErrs.some((e) => e.includes('[R11: Next.js Boundary]'))).toBe(
      false,
    );

    // app/page.tsx should be blocked for 'use client'
    const pageErrs = validateFileAgainstBaseline(
      'src/app/teams/page.tsx',
      `'use client';\nexport default function Page() { return null; }`,
      createEmptyBaseline(),
    );
    expect(pageErrs.some((e) => e.includes('[R11: Next.js Boundary]'))).toBe(
      true,
    );
  });
});
