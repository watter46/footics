import { describe, expect, it } from 'vitest';
import { getFormationActualPos } from '@/lib/data/formations';
import { FORMATION_POSITIONS } from '@/lib/data/formations-data';
import { injectMatchToTactical } from '@/lib/tactical/match-to-tactical-bridge';
import { createDefaultProject, type Slide } from '@/lib/types/tactical-unified';
import type { Match } from '@/types';
import { resetSlideKeepSquadData } from '../slide-reset-helpers';
import { useTacticalUnifiedStore } from '../tactical-unified-store';

describe('slide-formation-both-and-match-reset', () => {
  describe('applyFormation with team="both"', () => {
    it('applies formation to both home and away teams simultaneously', () => {
      const store = useTacticalUnifiedStore.getState();
      const defaultProject = createDefaultProject('test-project-both');
      const initialProject = {
        ...defaultProject,
        aspectRatio: '16:9' as const,
        slides: defaultProject.slides.map((s) => ({
          ...s,
          aspectRatio: '16:9' as const,
        })),
      };
      store.loadProject(initialProject);

      const slideId = initialProject.activeSlideId;

      // applyFormation('both') を実行
      store.applyFormation(slideId, '4-3-3', 'full', 'both');

      const updatedSlide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      expect(updatedSlide).toBeDefined();

      const homePlayers = updatedSlide!.players.filter(
        (p) => p.team === 'home' && p.area === 'pitch',
      );
      const awayPlayers = updatedSlide!.players.filter(
        (p) => p.team === 'away' && p.area === 'pitch',
      );

      expect(homePlayers).toHaveLength(11);
      expect(awayPlayers).toHaveLength(11);

      // 4-3-3 の GK の座標検証 (16:9 横ピッチ)
      const homeGk = homePlayers.find((p) => p.position === 'GK');
      const awayGk = awayPlayers.find((p) => p.position === 'GK');
      expect(homeGk?.x).toBe(7);
      expect(homeGk?.y).toBe(50);
      expect(awayGk?.x).toBe(93);
      expect(awayGk?.y).toBe(50);
    });
  });

  describe('resetSlideKeepSquadData with matchFormations', () => {
    it('uses matchFormations coordinates when matchFormations are provided', () => {
      const project = createDefaultProject('test-project-match-reset');
      const slide = project.slides[0];

      // 選手をあえて別の位置に動かす
      const movedSlide: Slide = {
        ...slide,
        players: slide.players.map((p) => ({
          ...p,
          x: 10,
          y: 10,
        })),
      };

      const matchFormations = {
        home: '4-3-3' as const,
        away: '3-5-2' as const,
      };

      const resetSlide = resetSlideKeepSquadData(
        movedSlide,
        '16:9',
        matchFormations,
      );

      const homePlayers = resetSlide.players.filter(
        (p) => p.team === 'home' && p.area === 'pitch',
      );
      const awayPlayers = resetSlide.players.filter(
        (p) => p.team === 'away' && p.area === 'pitch',
      );

      // Home 4-3-3 の各位置と一致することを検証
      const homePositions = FORMATION_POSITIONS['4-3-3'];
      homePlayers.forEach((p, idx) => {
        const expectedDef = homePositions[idx % homePositions.length];
        const rawPos = getFormationActualPos(expectedDef, 'home', 'full');
        const expectedX = expectedDef.position === 'GK' ? 7 : rawPos.x;
        const expectedY = expectedDef.position === 'GK' ? 50 : rawPos.y;
        expect(p.x).toBeCloseTo(expectedX, 1);
        expect(p.y).toBeCloseTo(expectedY, 1);
      });

      // Away 3-5-2 の各位置と一致することを検証
      const awayPositions = FORMATION_POSITIONS['3-5-2'];
      awayPlayers.forEach((p, idx) => {
        const expectedDef = awayPositions[idx % awayPositions.length];
        const rawPos = getFormationActualPos(expectedDef, 'away', 'full');
        const expectedX = expectedDef.position === 'GK' ? 93 : rawPos.x;
        const expectedY = expectedDef.position === 'GK' ? 50 : rawPos.y;
        expect(p.x).toBeCloseTo(expectedX, 1);
        expect(p.y).toBeCloseTo(expectedY, 1);
      });
    });

    it('falls back to default formations when matchFormations are not provided', () => {
      const project = createDefaultProject('test-project-default-reset');
      const slide = project.slides[0];

      const movedSlide: Slide = {
        ...slide,
        players: slide.players.map((p) => ({
          ...p,
          x: 1,
          y: 1,
        })),
      };

      const resetSlide = resetSlideKeepSquadData(movedSlide, '16:9');

      const homeGk = resetSlide.players.find(
        (p) => p.team === 'home' && p.shirtNo === '1',
      );
      expect(homeGk?.x).toBe(7);
      expect(homeGk?.y).toBe(50);
    });
  });

  describe('resetSlideKeepSquad store action with project.matchFormations', () => {
    it('applies matchFormations on resetSlideKeepSquad', () => {
      const store = useTacticalUnifiedStore.getState();
      const defaultProject = createDefaultProject('test-project-action');
      const project = {
        ...defaultProject,
        aspectRatio: '16:9' as const,
        slides: defaultProject.slides.map((s) => ({
          ...s,
          aspectRatio: '16:9' as const,
        })),
      };
      const projectWithMatchFormations = {
        ...project,
        matchFormations: {
          home: '3-4-2-1' as const,
          away: '5-3-2' as const,
        },
      };

      store.loadProject(projectWithMatchFormations);
      const slideId = project.activeSlideId;

      // resetSlideKeepSquad を呼ぶ
      store.resetSlideKeepSquad(slideId);

      const updatedSlide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      expect(updatedSlide).toBeDefined();

      const homePlayers = updatedSlide!.players.filter(
        (p) => p.team === 'home' && p.area === 'pitch',
      );
      const awayPlayers = updatedSlide!.players.filter(
        (p) => p.team === 'away' && p.area === 'pitch',
      );

      // Home 3-4-2-1 の位置検証
      const homePositions = FORMATION_POSITIONS['3-4-2-1'];
      homePlayers.forEach((p, idx) => {
        const expectedDef = homePositions[idx % homePositions.length];
        const rawPos = getFormationActualPos(expectedDef, 'home', 'full');
        const expectedX = expectedDef.position === 'GK' ? 7 : rawPos.x;
        const expectedY = expectedDef.position === 'GK' ? 50 : rawPos.y;
        expect(p.x).toBeCloseTo(expectedX, 1);
        expect(p.y).toBeCloseTo(expectedY, 1);
      });
    });
  });

  describe('injectMatchToTactical with matchFormations', () => {
    it('sets matchFormations on the updated project', () => {
      const dummyMatch = {
        id: 12345,
        homeTeam: { name: 'Arsenal' },
        awayTeam: { name: 'Chelsea' },
        teams: {
          home: {
            formations: [
              {
                formationName: '4-3-3',
                startMinuteExpanded: 0,
                playerIds: [],
              },
            ],
            players: [],
          },
          away: {
            formations: [
              {
                formationName: '4-2-3-1',
                startMinuteExpanded: 0,
                playerIds: [],
              },
            ],
            players: [],
          },
        },
      } as unknown as Match;

      injectMatchToTactical({ match: dummyMatch, minute: 0 });

      const project = useTacticalUnifiedStore.getState().project;
      expect(project.matchId).toBe('12345');
      expect(project.matchFormations).toBeDefined();
      expect(project.matchFormations?.home).toBe('4-3-3');
      expect(project.matchFormations?.away).toBe('4-2-3-1');
    });
  });

  describe('swapTeamSides with applyFormation and resetSlideKeepSquad', () => {
    it('maintains swapped territory after swapTeamSides and applyFormation', () => {
      const store = useTacticalUnifiedStore.getState();
      const defaultProject = createDefaultProject(
        'test-project-swap-formation',
      );
      const project = {
        ...defaultProject,
        aspectRatio: '16:9' as const,
        slides: defaultProject.slides.map((s) => ({
          ...s,
          aspectRatio: '16:9' as const,
        })),
      };
      store.loadProject(project);
      const slideId = project.activeSlideId;

      // 陣地反転を実行
      store.swapTeamSides(slideId);

      let slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      expect(slide?.isSidesSwapped).toBe(true);

      // 反転状態でフォーメーションを適用 (both)
      store.applyFormation(slideId, '4-3-3', 'full', 'both');

      slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      expect(slide?.isSidesSwapped).toBe(true);

      const homePlayers =
        slide?.players.filter((p) => p.team === 'home' && p.area === 'pitch') ??
        [];
      const awayPlayers =
        slide?.players.filter((p) => p.team === 'away' && p.area === 'pitch') ??
        [];

      // Home GK は右陣地 (x: 93)、Away GK は左陣地 (x: 7) に配置される
      const homeGk = homePlayers.find((p) => p.position === 'GK');
      const awayGk = awayPlayers.find((p) => p.position === 'GK');
      expect(homeGk?.x).toBe(93);
      expect(homeGk?.y).toBe(50);
      expect(awayGk?.x).toBe(7);
      expect(awayGk?.y).toBe(50);
    });

    it('maintains swapped territory after swapTeamSides and resetSlideKeepSquad', () => {
      const store = useTacticalUnifiedStore.getState();
      const defaultProject = createDefaultProject('test-project-swap-reset');
      const project = {
        ...defaultProject,
        aspectRatio: '16:9' as const,
        slides: defaultProject.slides.map((s) => ({
          ...s,
          aspectRatio: '16:9' as const,
        })),
      };
      store.loadProject(project);
      const slideId = project.activeSlideId;

      // 陣地反転を実行
      store.swapTeamSides(slideId);

      // リセット実行
      store.resetSlideKeepSquad(slideId);

      const slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      expect(slide?.isSidesSwapped).toBe(true);

      const homePlayers =
        slide?.players.filter((p) => p.team === 'home' && p.area === 'pitch') ??
        [];
      const awayPlayers =
        slide?.players.filter((p) => p.team === 'away' && p.area === 'pitch') ??
        [];

      // Home GK は右陣地 (x: 93)、Away GK は左陣地 (x: 7) に配置される
      const homeGk = homePlayers.find((p) => p.position === 'GK');
      const awayGk = awayPlayers.find((p) => p.position === 'GK');
      expect(homeGk?.x).toBe(93);
      expect(homeGk?.y).toBe(50);
      expect(awayGk?.x).toBe(7);
      expect(awayGk?.y).toBe(50);
    });

    it('preserves existing player positions other than Sub when applying formation', () => {
      const store = useTacticalUnifiedStore.getState();
      const defaultProject = createDefaultProject('test-project-preserve-pos');
      const slideId = defaultProject.activeSlideId;

      // 既存選手にカスタム本職ポジション 'AMR' を持たせる
      const customSlide: Slide = {
        ...defaultProject.slides[0],
        players: defaultProject.slides[0].players.map((p, idx) => {
          if (p.team === 'home' && idx === 1) {
            return { ...p, position: 'AMR' };
          }
          return p;
        }),
      };
      store.loadProject({ ...defaultProject, slides: [customSlide] });

      // 新フォーメーション '4-4-2' を適用
      store.applyFormation(slideId, '4-4-2', 'full', 'home');

      const slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      const targetPlayer = slide?.players.find(
        (p) => p.team === 'home' && p.id === customSlide.players[1].id,
      );

      // 既存の 'AMR' が 'RB' や 'pos.position' で上書き破壊されずに維持される
      expect(targetPlayer?.position).toBe('AMR');
    });
  });
});
