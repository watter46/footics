import { beforeEach, describe, expect, it } from 'vitest';
import {
  createDocumentStore,
  type DocumentStore,
} from '@/features/tactical-unified/stores/document-store';
import { createDefaultTacticalProject } from '@/features/tactical-unified/stores/tactical-store-provider';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';

describe('Multi-Marker Drag & Bulk Bench Actions', () => {
  let documentStore: DocumentStore;
  let phaseId: string;
  let slideId: string;

  beforeEach(() => {
    const project = createDefaultTacticalProject();
    documentStore = createDocumentStore(project);
    phaseId = project.phases[0].id;
    slideId = project.phases[0].slides[0].id;
  });

  const getSlide = () => {
    const phase = documentStore
      .getState()
      .project.phases.find((p) => p.id === phaseId);
    return phase?.slides.find((s) => s.id === slideId);
  };

  describe('MOVE_PLAYERS in documentStore', () => {
    it('1回の履歴記録で複数プレイヤーの座標を一括アトミック更新し、1回のundoで元に戻る', () => {
      const slideBefore = getSlide();
      const p1 = slideBefore?.players[0];
      const p2 = slideBefore?.players[1];
      expect(p1).toBeDefined();
      expect(p2).toBeDefined();
      if (!p1 || !p2) return;

      const origX1 = p1.x;
      const origY1 = p1.y;
      const origX2 = p2.x;
      const origY2 = p2.y;
      const pastCountBefore = documentStore.getState().past.length;

      documentStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'MOVE_PLAYERS',
        moves: [
          {
            id: p1.id,
            x: clampToScreenNorm(25),
            y: clampToScreenNorm(35),
          },
          {
            id: p2.id,
            x: clampToScreenNorm(45),
            y: clampToScreenNorm(55),
          },
        ],
      });

      const slideAfter = getSlide();
      const updatedP1 = slideAfter?.players.find((p) => p.id === p1.id);
      const updatedP2 = slideAfter?.players.find((p) => p.id === p2.id);

      expect(updatedP1?.x).toBe(25);
      expect(updatedP1?.y).toBe(35);
      expect(updatedP2?.x).toBe(45);
      expect(updatedP2?.y).toBe(55);

      // 履歴は1件のみ増加していること
      expect(documentStore.getState().past.length).toBe(pastCountBefore + 1);

      // undo 1回で両方のプレイヤーの座標が元に戻ること
      documentStore.getState().undo();
      const slideUndone = getSlide();
      const undoneP1 = slideUndone?.players.find((p) => p.id === p1.id);
      const undoneP2 = slideUndone?.players.find((p) => p.id === p2.id);

      expect(undoneP1?.x).toBe(origX1);
      expect(undoneP1?.y).toBe(origY1);
      expect(undoneP2?.x).toBe(origX2);
      expect(undoneP2?.y).toBe(origY2);
    });

    it('ロックされたプレイヤーは locked 変更なしの更新をスキップする', () => {
      const slideBefore = getSlide();
      const lockedPlayer = slideBefore?.players[0];
      const normalPlayer = slideBefore?.players[1];
      expect(lockedPlayer).toBeDefined();
      expect(normalPlayer).toBeDefined();
      if (!lockedPlayer || !normalPlayer) return;

      const origLockedX = lockedPlayer.x;

      documentStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'UPDATE_PLAYER',
        id: lockedPlayer.id,
        patch: { locked: true },
      });

      documentStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'MOVE_PLAYERS',
        moves: [
          {
            id: lockedPlayer.id,
            x: clampToScreenNorm(99),
            y: clampToScreenNorm(99),
          },
          {
            id: normalPlayer.id,
            x: clampToScreenNorm(88),
            y: clampToScreenNorm(88),
          },
        ],
      });

      const slide = getSlide();
      const p1 = slide?.players.find((p) => p.id === lockedPlayer.id);
      const p2 = slide?.players.find((p) => p.id === normalPlayer.id);

      expect(p1?.x).toBe(origLockedX);
      expect(p2?.x).toBe(88);
    });
  });

  describe('Bulk bench drop logic', () => {
    it('複数マーカー選択状態でベンチドロップ時、全マーカーがベンチに移動する', () => {
      const slideBefore = getSlide();
      const p1 = slideBefore?.players[0];
      const p2 = slideBefore?.players[1];
      expect(p1).toBeDefined();
      expect(p2).toBeDefined();
      if (!p1 || !p2) return;

      for (const id of [p1.id, p2.id]) {
        documentStore.getState().dispatchSlide(phaseId, slideId, {
          type: 'MOVE_PLAYER_TO_BENCH',
          id,
        });
      }

      const slide = getSlide();
      const m1 = slide?.players.find((m) => m.id === p1.id);
      const m2 = slide?.players.find((m) => m.id === p2.id);

      expect(m1?.area).toBe('bench');
      expect(m2?.area).toBe('bench');
    });
  });
});
