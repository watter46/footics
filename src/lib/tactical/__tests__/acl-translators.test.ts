import { describe, expect, it } from 'vitest';
import { normalizeTacticalProject } from '@/lib/tactical/acl/legacy-project-translator';
import {
  type ScreenshotTranslateInput,
  serializeProjectToScreenshotJson,
  translateScreenshotToProject,
} from '@/lib/tactical/acl/screenshot-translator';
import { DomainTacticalProjectSchema } from '@/lib/types/tactical/domain-hierarchy';

describe('legacy-project-translator', () => {
  it('旧形式 JSON (v2.0.0, slide重複プロパティ, arrowHead, 未完了zone, benchPlayerの不正属性) を新形式 v3.0.0 へロスレス変換する', () => {
    const rawLegacyProject = {
      id: 'proj-legacy-1',
      version: '2.0.0',
      title: 'Legacy Project',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      aspectRatio: '16:9',
      activePhaseId: 'phase-1',
      activeSlideId: 'slide-1',
      phases: [
        {
          id: 'phase-1',
          name: 'First Phase',
          slides: [
            {
              id: 'slide-1',
              index: 0,
              label: 'Slide 1',
              aspectRatio: '9:16', // slide 側に aspectRatio があるレガシーデータ
              boundaryBox: { x: 5, y: 5, width: 90, height: 90, enabled: true },
              pitchAppearance: {
                pitchBackgroundType: 'solid',
                overlayColor: '#000000',
                overlayOpacity: 0.5,
                lineColor: '#ffffff',
                lineWidth: 2,
                lineOpacity: 1,
              },
              players: [
                {
                  id: 'p1',
                  shirtNo: '7',
                  team: 'home',
                  x: 30,
                  y: 40,
                  style: 'number',
                  area: 'pitch',
                  connectLines: [
                    { id: 'cl-1', toPlayerId: 'p2', color: '#ffffff' },
                  ],
                },
                {
                  id: 'p2',
                  shirtNo: '9',
                  team: 'home',
                  x: 35,
                  y: 45,
                  style: 'number',
                  area: 'pitch',
                  connectLines: [],
                },
                {
                  id: 'b1',
                  shirtNo: '12',
                  team: 'home',
                  x: 10,
                  y: 95,
                  style: 'number',
                  area: 'bench',
                  connectLines: [{ id: 'cl-invalid', toPlayerId: 'p1' }], // ベンチ選手に不正な connectLines
                  visionCone: { angle: 45, distance: 30 }, // ベンチ選手に不正な visionCone
                },
              ],
              arrows: [
                {
                  id: 'arr-1',
                  points: [
                    { x: 30, y: 40 },
                    { x: 50, y: 60 },
                  ],
                  arrowHead: false, // 旧プロパティ
                  color: '#ffffff',
                  strokeWidth: 3,
                },
                {
                  id: 'arr-2',
                  points: [
                    { x: 20, y: 20 },
                    { x: 40, y: 40 },
                  ],
                  arrowHead: true,
                  endMarker: 'dot', // 既に新プロパティがある場合は優先
                  color: '#ff0000',
                  strokeWidth: 3,
                },
              ],
              zones: [
                {
                  id: 'zone-complete',
                  shapeType: 'rect',
                  x: 20,
                  y: 20,
                  width: 30,
                  height: 25,
                  color: '#f59e0b',
                  isComplete: true,
                },
                {
                  id: 'zone-incomplete',
                  shapeType: 'polygon',
                  points: [
                    { x: 10, y: 10 },
                    { x: 20, y: 10 },
                  ],
                  color: '#ef4444',
                  isComplete: false, // 未完了ゾーン ➔ 除外対象
                },
              ],
              texts: [
                {
                  id: 'txt-1',
                  x: 50,
                  y: 50,
                  content: 'High Press Trigger',
                  color: '#ffffff',
                },
              ],
              ball: {
                x: 32,
                y: 42,
                visible: true,
              },
            },
          ],
        },
      ],
    };

    const bundle = normalizeTacticalProject(rawLegacyProject);
    const { project, activePhaseId, activeSlideId } = bundle;

    // 1. Project レベルの検証
    expect(project.version).toBe('3.0.0');
    expect(project.id).toBe('proj-legacy-1');
    expect(activePhaseId).toBe('phase-1');
    expect(activeSlideId).toBe('slide-1');

    // 2. Phase レベルの検証 (slide 側の aspectRatio がリフトされ、phase に反映されること)
    const phase = project.phases[0];
    expect(phase.aspectRatio).toBe('9:16');
    expect(phase.boundaryBox).toBeDefined();

    // 3. Slide レベルの検証 (階層重複プロパティが slide から削除されていること)
    const slide = phase.slides[0];
    expect('aspectRatio' in slide).toBe(false);
    expect('boundaryBox' in slide).toBe(false);
    expect('pitchAppearance' in slide).toBe(false);

    // 4. Arrow レベルの検証 (arrowHead: false ➔ endMarker: 'none', 旧プロパティ剥離)
    const arrow1 = slide.arrows.find((a) => a.id === 'arr-1');
    expect(arrow1).toBeDefined();
    expect(arrow1?.endMarker).toBe('none');
    expect(arrow1?.startMarker).toBe('none');
    expect('arrowHead' in (arrow1 as unknown as Record<string, unknown>)).toBe(
      false,
    );

    const arrow2 = slide.arrows.find((a) => a.id === 'arr-2');
    expect(arrow2?.endMarker).toBe('dot');

    // 5. Zone レベルの検証 (未完了ゾーン isComplete: false が除外され、isComplete キーも剥離)
    expect(slide.zones).toHaveLength(1);
    expect(slide.zones[0].id).toBe('zone-complete');
    expect(
      'isComplete' in (slide.zones[0] as unknown as Record<string, unknown>),
    ).toBe(false);

    // 6. Player レベルの検証 (ベンチ選手から不正プロパティが剥離)
    const benchPlayer = slide.players.find((p) => p.id === 'b1');
    expect(benchPlayer).toBeDefined();
    expect(benchPlayer?.area).toBe('bench');
    expect(
      'connectLines' in (benchPlayer as unknown as Record<string, unknown>),
    ).toBe(false);
    expect(
      'visionCone' in (benchPlayer as unknown as Record<string, unknown>),
    ).toBe(false);

    const pitchPlayer = slide.players.find((p) => p.id === 'p1');
    expect(pitchPlayer?.area).toBe('pitch');
    if (pitchPlayer?.area === 'pitch') {
      expect(pitchPlayer.connectLines).toHaveLength(1);
    }

    // 7. Zod スキーマ適合の検証
    const parsed = DomainTacticalProjectSchema.safeParse(project);
    expect(parsed.success).toBe(true);
  });

  it('phases がなく slides のみを持つ古い構造や空データでも安全にデフォルト補正して bundle を返す', () => {
    const rawLegacyProject = {
      id: 'proj-no-phases',
      slides: [
        {
          id: 'slide-flat-1',
          players: [],
        },
      ],
    };

    const bundle = normalizeTacticalProject(rawLegacyProject);
    expect(bundle.project.version).toBe('3.0.0');
    expect(bundle.project.phases).toHaveLength(1);
    expect(bundle.project.phases[0].slides).toHaveLength(1);
    expect(bundle.activePhaseId).toBe(bundle.project.phases[0].id);
    expect(bundle.activeSlideId).toBe(bundle.project.phases[0].slides[0].id);

    const parsed = DomainTacticalProjectSchema.safeParse(bundle.project);
    expect(parsed.success).toBe(true);
  });
});

describe('screenshot-translator', () => {
  it('Extension canvasAnnotations と DomainTacticalProject を相互変換し、往復変換でエンティティ欠損がゼロであること', () => {
    const initialInput: ScreenshotTranslateInput = {
      screenshotId: 'shot-ext-42',
      backgroundImageUrl: 'blob:https://youtube.com/screenshot-uuid',
      aspectRatio: '16:9',
      canvasAnnotationsJson: JSON.stringify({
        arrows: [
          {
            id: 'arr-ext-1',
            arrowType: 'pass',
            points: [
              { x: 10, y: 15 },
              { x: 45, y: 55 },
            ],
            color: '#ffffff',
            strokeWidth: 3,
            startMarker: 'none',
            endMarker: 'arrow',
          },
        ],
        zones: [
          {
            id: 'zone-ext-1',
            shapeType: 'rect',
            x: 25,
            y: 30,
            width: 40,
            height: 20,
            color: '#f59e0b',
            opacity: 0.3,
            strokeWidth: 2,
          },
        ],
        texts: [
          {
            id: 'txt-ext-1',
            x: 50,
            y: 20,
            content: 'Cover Shadow',
            fontSize: 18,
            color: '#ffffff',
            bold: true,
            italic: false,
          },
        ],
        markers: [
          {
            id: 'marker-ext-1',
            team: 'home',
            shirtNo: '8',
            position: 'CMF',
            x: 40,
            y: 50,
            style: 'number',
            area: 'pitch',
            connectLines: [],
            badges: [],
          },
        ],
      }),
    };

    const bundle = translateScreenshotToProject(initialInput);
    const { project, activePhaseId, activeSlideId } = bundle;

    expect(project.id).toBe('shot-ext-42');
    expect(project.version).toBe('3.0.0');
    expect(project.screenshotSourceUrl).toBe(initialInput.backgroundImageUrl);

    const phase = project.phases[0];
    expect(phase.backgroundType).toBe('image');
    expect(phase.backgroundImageUrl).toBe(initialInput.backgroundImageUrl);
    expect(phase.aspectRatio).toBe('16:9');
    expect(activePhaseId).toBe(phase.id);

    const slide = phase.slides[0];
    expect(activeSlideId).toBe(slide.id);
    expect(slide.players).toHaveLength(1);
    expect(slide.players[0].id).toBe('marker-ext-1');
    expect(slide.arrows).toHaveLength(1);
    expect(slide.arrows[0].id).toBe('arr-ext-1');
    expect(slide.zones).toHaveLength(1);
    expect(slide.zones[0].id).toBe('zone-ext-1');
    expect(slide.texts).toHaveLength(1);
    expect(slide.texts[0].id).toBe('txt-ext-1');

    const schemaResult = DomainTacticalProjectSchema.safeParse(project);
    expect(schemaResult.success).toBe(true);

    // 往復変換 (serializeProjectToScreenshotJson)
    const serializedJson = serializeProjectToScreenshotJson(project);
    const parsedData = JSON.parse(serializedJson);

    expect(parsedData.arrows).toHaveLength(1);
    expect(parsedData.arrows[0].id).toBe('arr-ext-1');
    expect(parsedData.zones).toHaveLength(1);
    expect(parsedData.zones[0].id).toBe('zone-ext-1');
    expect(parsedData.texts).toHaveLength(1);
    expect(parsedData.texts[0].id).toBe('txt-ext-1');
    expect(parsedData.markers).toHaveLength(1);
    expect(parsedData.markers[0].id).toBe('marker-ext-1');

    // 再度 translateScreenshotToProject を通した際に完全一致
    const roundTripBundle = translateScreenshotToProject({
      screenshotId: 'shot-ext-42',
      backgroundImageUrl: initialInput.backgroundImageUrl,
      canvasAnnotationsJson: serializedJson,
      aspectRatio: '16:9',
    });
    expect(roundTripBundle.project.phases[0].slides[0].players[0].id).toBe(
      'marker-ext-1',
    );
    expect(roundTripBundle.project.phases[0].slides[0].arrows[0].id).toBe(
      'arr-ext-1',
    );
  });
});
