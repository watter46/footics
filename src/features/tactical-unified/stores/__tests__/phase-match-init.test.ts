import { describe, expect, it } from 'vitest';
import { getFormationActualPos } from '@/lib/data/formations';
import { FORMATION_POSITIONS } from '@/lib/data/formations-data';
import { createDefaultProject } from '@/lib/types/tactical-unified';
import { useTacticalUnifiedStore } from '../tactical-unified-store';

describe('Phase match init and batch styling', () => {
  describe('addPhase with matchFormations / matchId', () => {
    it('creates a new phase preserving player squad info and applying initial kickoff formation coordinates', () => {
      const store = useTacticalUnifiedStore.getState();
      const defaultProject = createDefaultProject('test-match-phase');
      const firstSlide = defaultProject.phases[0].slides[0];

      // 第1フェーズのスライドの選手に特定の選手情報（名前、顔写真、背番号）を付与し、座標を動かす
      firstSlide.players = firstSlide.players.map((p, idx) => ({
        ...p,
        id: `player-${p.team}-${idx}`,
        name: `Player ${idx}`,
        shirtNo: `${idx + 1}`,
        style: {
          ...p.style,
          photoUrl: `https://example.com/photo-${idx}.png`,
        },
        x: 10,
        y: 10,
      }));

      // ベンチ選手も1名追加
      firstSlide.players.push({
        id: 'bench-1',
        team: 'home',
        area: 'bench',
        name: 'Bench Player 1',
        shirtNo: '99',
        x: 5,
        y: 95,
        style: {
          ...firstSlide.players[0].style,
          photoUrl: 'https://example.com/bench-1.png',
        },
        connectLines: [],
        badges: [],
      });

      const projectWithMatch = {
        ...defaultProject,
        aspectRatio: '16:9' as const,
        phases: defaultProject.phases.map((ph) => ({
          ...ph,
          aspectRatio: '16:9' as const,
          slides: ph.slides.map((sl) => ({
            ...sl,
            aspectRatio: '16:9' as const,
          })),
        })),
        matchId: 'match-123',
        matchFormations: {
          home: '4-3-3' as const,
          away: '4-2-3-1' as const,
        },
      };

      store.loadProject(projectWithMatch);

      // 新規フェーズを追加
      const newPhaseId = store.addPhase('Phase 2');
      const updatedProject = useTacticalUnifiedStore.getState().project;
      const newPhase = updatedProject.phases.find((ph) => ph.id === newPhaseId);

      expect(newPhase).toBeDefined();
      expect(newPhase?.slides).toHaveLength(1);

      const newSlide = newPhase!.slides[0];

      // 選手データが維持されていることの検証 (ID, 名前, 背番号, 写真)
      const benchPlayer = newSlide.players.find((p) => p.id === 'bench-1');
      expect(benchPlayer).toBeDefined();
      expect(benchPlayer?.name).toBe('Bench Player 1');
      expect(benchPlayer?.style.photoUrl).toBe(
        'https://example.com/bench-1.png',
      );
      expect(benchPlayer?.x).toBe(5);
      expect(benchPlayer?.y).toBe(95);

      // スタメンの座標がキックオフ初期配置 (4-3-3 / 4-2-3-1) になっていること
      const homePitchPlayers = newSlide.players.filter(
        (p) => p.team === 'home' && p.area === 'pitch',
      );
      expect(homePitchPlayers).toHaveLength(11);

      const home433 = FORMATION_POSITIONS['4-3-3'];
      homePitchPlayers.forEach((p, idx) => {
        expect(p.name).toBe(`Player ${idx}`);
        expect(p.style.photoUrl).toBe(`https://example.com/photo-${idx}.png`);
        const expectedDef = home433[idx % home433.length];
        const rawPos = getFormationActualPos(expectedDef, 'home', 'full');
        const expectedX = expectedDef.position === 'GK' ? 7 : rawPos.x;
        const expectedY = expectedDef.position === 'GK' ? 50 : rawPos.y;
        expect(p.x).toBeCloseTo(expectedX, 1);
        expect(p.y).toBeCloseTo(expectedY, 1);
      });
    });
  });

  describe('applyPlayerStyleToPhaseSlides and applyBallScaleToPhaseSlides', () => {
    it('applies player style to all slides in the specified phase for the target team', () => {
      const store = useTacticalUnifiedStore.getState();
      const defaultProject = createDefaultProject('test-batch-style');
      store.loadProject(defaultProject);

      const phaseId = defaultProject.phases[0].id;
      // スライドをもう1つ追加して複数スライドにする
      store.addSlide(undefined, 'full');

      const initialPhase = useTacticalUnifiedStore
        .getState()
        .project.phases.find((ph) => ph.id === phaseId);
      expect(initialPhase?.slides.length).toBeGreaterThanOrEqual(2);

      // home 選手に対して sizeScale: 1.5, insideContent: 'photo' を適用
      (store as any).applyPlayerStyleToPhaseSlides(
        phaseId,
        { sizeScale: 1.5, insideContent: 'photo' },
        'home',
      );

      const updatedPhase = useTacticalUnifiedStore
        .getState()
        .project.phases.find((ph) => ph.id === phaseId);

      for (const slide of updatedPhase!.slides) {
        const homePlayers = slide.players.filter((p) => p.team === 'home');
        const awayPlayers = slide.players.filter((p) => p.team === 'away');

        for (const p of homePlayers) {
          expect(p.style.sizeScale).toBe(1.5);
          expect(p.style.insideContent).toBe('photo');
        }
        for (const p of awayPlayers) {
          expect(p.style.sizeScale).not.toBe(1.5);
        }
      }
    });

    it('applies ball scale to all slides in the specified phase', () => {
      const store = useTacticalUnifiedStore.getState();
      const defaultProject = createDefaultProject('test-ball-scale');
      store.loadProject(defaultProject);

      const phaseId = defaultProject.phases[0].id;
      store.addSlide(undefined, 'full');

      (store as any).applyBallScaleToPhaseSlides(phaseId, 1.8);

      const updatedPhase = useTacticalUnifiedStore
        .getState()
        .project.phases.find((ph) => ph.id === phaseId);

      for (const slide of updatedPhase!.slides) {
        expect(slide.ball.sizeScale).toBe(1.8);
      }
    });
  });
});
