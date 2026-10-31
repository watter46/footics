import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/db/schema';
import {
  importMultipleTacticalProjects,
  importTacticalProjectFromJson,
  sanitizeTacticalProjectForImport,
} from '@/lib/db/tactical-projects-import';
import {
  createDefaultProject,
  type TacticalProject,
} from '@/lib/types/tactical-unified';

describe('tactical-projects-import', () => {
  beforeEach(async () => {
    await db.tactical_projects.clear();
  });

  describe('sanitizeTacticalProjectForImport', () => {
    it('truncates overlong texts and titles', () => {
      const longTitle = 'A'.repeat(600);
      const longText = 'B'.repeat(12000);
      const longPhaseName = 'C'.repeat(300);
      const longSlideLabel = 'D'.repeat(300);
      const longArrowLabel = 'E'.repeat(300);
      const longZoneLabel = 'F'.repeat(300);
      const longBadgeLabel = 'G'.repeat(200);

      const raw = {
        title: longTitle,
        phases: [
          {
            name: longPhaseName,
            slides: [
              {
                label: longSlideLabel,
                transitionDurationMs: 40000,
                pauseMs: 20000,
                cameraDurationMs: 80000,
                texts: [{ id: 't1', content: longText }],
                arrows: [{ id: 'a1', label: longArrowLabel }],
                zones: [{ id: 'z1', label: longZoneLabel }],
                players: [
                  {
                    id: 'p1',
                    badges: [{ id: 'b1', label: longBadgeLabel }],
                    visionCone: {
                      enabled: true,
                      angleRad: 7.5,
                      distance: 100,
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      const sanitized = sanitizeTacticalProjectForImport(raw) as Record<
        string,
        unknown
      >;

      expect((sanitized.title as string).length).toBe(500);
      const phase = (
        sanitized.phases as Array<{
          name: string;
          slides: Array<{
            label: string;
            transitionDurationMs: number;
            pauseMs: number;
            cameraDurationMs: number;
            texts: Array<{ content: string }>;
            arrows: Array<{ label: string }>;
            zones: Array<{ label: string }>;
            players: Array<{
              badges: Array<{ label: string }>;
              visionCone: { angleRad: number };
            }>;
          }>;
        }>
      )[0];

      expect(phase.name.length).toBe(200);
      const slide = phase.slides[0];
      expect(slide.label.length).toBe(200);
      expect(slide.transitionDurationMs).toBe(30000);
      expect(slide.pauseMs).toBe(10000);
      expect(slide.cameraDurationMs).toBe(60000);
      expect(slide.texts[0].content.length).toBe(10000);
      expect(slide.arrows[0].label.length).toBe(200);
      expect(slide.zones[0].label.length).toBe(200);
      expect(slide.players[0].badges[0].label.length).toBe(100);
      expect(slide.players[0].visionCone.angleRad).toBe(Math.PI * 2);
    });

    it('returns raw value when input is not an object or is null', () => {
      expect(sanitizeTacticalProjectForImport(null)).toBeNull();
      expect(sanitizeTacticalProjectForImport('string')).toBe('string');
      expect(sanitizeTacticalProjectForImport(123)).toBe(123);
    });
  });

  describe('importTacticalProjectFromJson', () => {
    it('successfully imports project with text between 200 and 10000 characters', async () => {
      const baseProject = createDefaultProject('test-project-1');
      const longText = 'Tactical note: '.repeat(50); // ~750 characters (> 200)
      const project: TacticalProject = {
        ...baseProject,
        phases: [
          {
            ...baseProject.phases[0],
            slides: [
              {
                ...baseProject.phases[0].slides[0],
                texts: [
                  {
                    id: 'text-1',
                    annotationType: 'text',
                    content: longText,
                    x: 100,
                    y: 100,
                    fontSize: 16,
                    color: '#ffffff',
                    bold: false,
                    italic: false,
                  },
                ],
              },
            ],
          },
        ],
      };

      const file = new File([JSON.stringify(project)], 'project.json', {
        type: 'application/json',
      });
      const imported = await importTacticalProjectFromJson(file);

      expect(imported.id).toBeDefined();
      expect(imported.id).not.toBe(baseProject.id);
      expect(imported.phases[0].slides[0].texts[0].content).toBe(longText);
      expect(imported.slides).toBeDefined();
      expect(imported.slides.length).toBeGreaterThan(0);
    });

    it('truncates overlong text (> 10000 characters) and imports successfully', async () => {
      const baseProject = createDefaultProject('test-project-2');
      const overlongText = 'Z'.repeat(12000);
      const rawData = {
        ...baseProject,
        phases: [
          {
            ...baseProject.phases[0],
            slides: [
              {
                ...baseProject.phases[0].slides[0],
                texts: [
                  {
                    id: 'text-1',
                    annotationType: 'text',
                    content: overlongText,
                    x: 50,
                    y: 50,
                    fontSize: 16,
                    color: '#ffffff',
                    bold: false,
                    italic: false,
                  },
                ],
              },
            ],
          },
        ],
      };

      const file = new File([JSON.stringify(rawData)], 'overlong.json', {
        type: 'application/json',
      });
      const imported = await importTacticalProjectFromJson(file);

      expect(imported.phases[0].slides[0].texts[0].content.length).toBe(10000);
      expect(imported.slides.length).toBeGreaterThan(0);
    });

    it('throws formatted error with detailed issue paths when project schema is invalid', async () => {
      const invalidProject = {
        title: 'Broken Project',
        // missing required fields: id, phases, etc.
      };

      const file = new File([JSON.stringify(invalidProject)], 'broken.json', {
        type: 'application/json',
      });

      await expect(importTacticalProjectFromJson(file)).rejects.toThrow(
        /Invalid tactical project JSON format: .*phases:/,
      );
    });

    it('throws error when JSON is invalid unparsable string', async () => {
      const file = new File(['not valid json {{{'], 'corrupt.json', {
        type: 'application/json',
      });

      await expect(importTacticalProjectFromJson(file)).rejects.toThrow(
        'Invalid file format: JSON could not be parsed.',
      );
    });
  });

  describe('importMultipleTacticalProjects', () => {
    it('successfully imports multiple JSON files', async () => {
      const p1 = createDefaultProject('p1');
      const p2 = createDefaultProject('p2');

      const file1 = new File([JSON.stringify(p1)], 'p1.json', {
        type: 'application/json',
      });
      const file2 = new File([JSON.stringify(p2)], 'p2.json', {
        type: 'application/json',
      });

      const result = await importMultipleTacticalProjects([file1, file2]);
      expect(result.errors).toEqual([]);
      expect(result.imported.length).toBe(2);
      expect(result.imported[0].slides.length).toBeGreaterThan(0);
    });

    it('collects detailed error path when JSON file in batch is invalid', async () => {
      const invalid = { title: 'Invalid Batch' };
      const file = new File([JSON.stringify(invalid)], 'bad.json', {
        type: 'application/json',
      });

      const result = await importMultipleTacticalProjects([file]);
      expect(result.imported.length).toBe(0);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toMatch(
        /bad\.json: Invalid tactical project JSON format: .*phases:/,
      );
    });
  });
});
