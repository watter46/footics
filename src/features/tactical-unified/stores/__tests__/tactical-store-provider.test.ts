import { describe, expect, it } from 'vitest';
import { DomainTacticalProjectSchema } from '@/lib/types/tactical/domain-hierarchy';
import { createDefaultTacticalProject } from '../tactical-store-provider';

describe('createDefaultTacticalProject', () => {
  it('SSR / Client Hydration Mismatch を防ぐため、決定論的な固定 ID と固定タイムスタンプを返す', () => {
    const project1 = createDefaultTacticalProject();
    const project2 = createDefaultTacticalProject();

    expect(project1).toEqual(project2);
    expect(project1.id).toBe('default-project');
    expect(project1.phases[0]?.id).toBe('default-phase-1');
    expect(project1.phases[0]?.slides[0]?.id).toBe('default-slide-1');
    expect(project1.createdAt).toBe('1970-01-01T00:00:00.000Z');
    expect(project1.updatedAt).toBe('1970-01-01T00:00:00.000Z');
    expect(DomainTacticalProjectSchema.safeParse(project1).success).toBe(true);
  });
});
