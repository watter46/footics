'use client';

import {
  Import,
  Monitor,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
  Smartphone,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useTacticalAnimation } from '@/hooks/use-tactical-animation';
import { useTacticalAnimationStore } from '@/stores/tactical-animation-store';
import type { Match } from '@/types';
import { AnimationBench } from './animation-bench';
import { AnimationPitch, type AnimationPitchRef } from './animation-pitch';
import { AnimationTimeline } from './animation-timeline';
import { MarkerOptionsPanel } from './marker-options-panel';

interface TacticalAnimationBoardProps {
  initialMatch?: Match;
  onClose?: () => void;
  skipAutoImport?: boolean;
}

export const TacticalAnimationBoard: React.FC<TacticalAnimationBoardProps> = ({
  initialMatch,
  onClose: _onClose,
  skipAutoImport = false,
}) => {
  const pitchRef = useRef<AnimationPitchRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [pitchDimensions, setPitchDimensions] = useState<{
    width: number;
    height: number;
  }>({
    width: 400,
    height: 617,
  });

  const [isOptionsPanelOpen, setIsOptionsPanelOpen] = useState(true);

  const orientation = useTacticalAnimationStore((s) => s.orientation);
  const setOrientation = useTacticalAnimationStore((s) => s.setOrientation);
  const importFromMatch = useTacticalAnimationStore((s) => s.importFromMatch);
  const resetScenes = useTacticalAnimationStore((s) => s.resetScenes);
  const isPlaying = useTacticalAnimationStore((s) => s.isPlaying);
  const isExporting = useTacticalAnimationStore((s) => s.isExporting);
  const scenes = useTacticalAnimationStore((s) => s.scenes);
  const activeSceneIndex = useTacticalAnimationStore((s) => s.activeSceneIndex);
  const setActiveSceneIndex = useTacticalAnimationStore(
    (s) => s.setActiveSceneIndex,
  );
  const setSelectedPlayerId = useTacticalAnimationStore(
    (s) => s.setSelectedPlayerId,
  );

  const { playAnimation, stopAnimation } = useTacticalAnimation();

  // 初期マッチデータがある場合は自動インポート (skipAutoImport が false の場合のみ)
  useEffect(() => {
    if (initialMatch && !skipAutoImport) {
      importFromMatch(initialMatch);
    }
  }, [initialMatch, importFromMatch, skipAutoImport]);

  // キーボードショートカットキー
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // input, textarea, select などに入力中の場合はバイパス
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        const stage = pitchRef.current?.getStage();
        if (isPlaying) {
          stopAnimation(stage);
        } else {
          setActiveSceneIndex(0);
          requestAnimationFrame(() => {
            if (stage) playAnimation(stage);
          });
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (!isPlaying && !isExporting && activeSceneIndex > 0) {
          setActiveSceneIndex(activeSceneIndex - 1);
        }
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (
          !isPlaying &&
          !isExporting &&
          activeSceneIndex < scenes.length - 1
        ) {
          setActiveSceneIndex(activeSceneIndex + 1);
        }
      } else if (e.code === 'Escape') {
        e.preventDefault();
        setSelectedPlayerId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isPlaying,
    isExporting,
    activeSceneIndex,
    scenes.length,
    playAnimation,
    stopAnimation,
    setActiveSceneIndex,
    setSelectedPlayerId,
  ]);

  // ピッチサイズのリサイズ計算 (アスペクト比維持 & 最大化)
  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      if (clientWidth === 0 || clientHeight === 0) return;

      // 縦画面時は高さを極限まで活用するためパディングを最小化 (4px)、横画面は 16px
      const padding = orientation === 'vertical' ? 8 : 16;
      const availWidth = Math.max(100, clientWidth - padding);
      const availHeight = Math.max(100, clientHeight - padding);

      if (orientation === 'vertical') {
        // 比率 68 : 105
        const targetRatio = 68 / 105;
        let h = availHeight;
        let w = h * targetRatio;

        if (w > availWidth) {
          w = availWidth;
          h = w / targetRatio;
        }
        setPitchDimensions({ width: Math.floor(w), height: Math.floor(h) });
      } else {
        // 比率 105 : 68
        const targetRatio = 105 / 68;
        let w = availWidth;
        let h = w / targetRatio;

        if (h > availHeight) {
          h = availHeight;
          w = h * targetRatio;
        }
        setPitchDimensions({ width: Math.floor(w), height: Math.floor(h) });
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', updateDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, [orientation, isOptionsPanelOpen]);

  // モックデータ読み込み (テスト用)
  const handleImportMockMatch = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockMatch: any = {
      id: 'mock-match-1',
      matchType: 'club',
      teams: {
        home: {
          teamId: 1,
          name: 'Home Team',
          players: [
            {
              playerId: 1,
              name: 'GK 1',
              isFirstEleven: true,
              position: 'GK',
              shirtNo: 1,
            },
            {
              playerId: 2,
              name: 'DF 2',
              isFirstEleven: true,
              position: 'DC',
              shirtNo: 2,
            },
            {
              playerId: 3,
              name: 'DF 3',
              isFirstEleven: true,
              position: 'DC',
              shirtNo: 3,
            },
            {
              playerId: 4,
              name: 'DF 4',
              isFirstEleven: true,
              position: 'DL',
              shirtNo: 4,
            },
            {
              playerId: 5,
              name: 'DF 5',
              isFirstEleven: true,
              position: 'DR',
              shirtNo: 5,
            },
            {
              playerId: 6,
              name: 'MF 6',
              isFirstEleven: true,
              position: 'MC',
              shirtNo: 6,
            },
            {
              playerId: 7,
              name: 'MF 7',
              isFirstEleven: true,
              position: 'MC',
              shirtNo: 7,
            },
            {
              playerId: 8,
              name: 'MF 8',
              isFirstEleven: true,
              position: 'ML',
              shirtNo: 8,
            },
            {
              playerId: 9,
              name: 'MF 9',
              isFirstEleven: true,
              position: 'MR',
              shirtNo: 9,
            },
            {
              playerId: 10,
              name: 'FW 10',
              isFirstEleven: true,
              position: 'FW',
              shirtNo: 10,
            },
            {
              playerId: 11,
              name: 'FW 11',
              isFirstEleven: true,
              position: 'FW',
              shirtNo: 11,
            },
            // ベンチ選手
            {
              playerId: 12,
              name: 'Sub GK',
              isFirstEleven: false,
              position: 'GK',
              shirtNo: 12,
            },
            {
              playerId: 13,
              name: 'Sub DF',
              isFirstEleven: false,
              position: 'DC',
              shirtNo: 13,
            },
            {
              playerId: 14,
              name: 'Sub MF',
              isFirstEleven: false,
              position: 'MC',
              shirtNo: 14,
            },
            {
              playerId: 15,
              name: 'Sub FW',
              isFirstEleven: false,
              position: 'FW',
              shirtNo: 15,
            },
          ],
          formations: [
            {
              formationName: '4-4-2',
              playerIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
              formationPositions: [
                { vertical: 0, horizontal: 0 },
                { vertical: 2, horizontal: 2 },
                { vertical: 2, horizontal: 4 },
                { vertical: 2, horizontal: 6 },
                { vertical: 2, horizontal: 8 },
                { vertical: 5, horizontal: 2 },
                { vertical: 5, horizontal: 4 },
                { vertical: 5, horizontal: 6 },
                { vertical: 5, horizontal: 8 },
                { vertical: 9, horizontal: 4 },
                { vertical: 9, horizontal: 6 },
              ],
            },
          ],
        },
        away: {
          teamId: 2,
          name: 'Away Team',
          players: [
            {
              playerId: 21,
              name: 'GK 21',
              isFirstEleven: true,
              position: 'GK',
              shirtNo: 1,
            },
            {
              playerId: 22,
              name: 'DF 22',
              isFirstEleven: true,
              position: 'DC',
              shirtNo: 4,
            },
            {
              playerId: 23,
              name: 'DF 23',
              isFirstEleven: true,
              position: 'DC',
              shirtNo: 5,
            },
            {
              playerId: 24,
              name: 'DF 24',
              isFirstEleven: true,
              position: 'DL',
              shirtNo: 3,
            },
            {
              playerId: 25,
              name: 'DF 25',
              isFirstEleven: true,
              position: 'DR',
              shirtNo: 2,
            },
            {
              playerId: 26,
              name: 'MF 26',
              isFirstEleven: true,
              position: 'DMC',
              shirtNo: 6,
            },
            {
              playerId: 27,
              name: 'MF 27',
              isFirstEleven: true,
              position: 'MC',
              shirtNo: 8,
            },
            {
              playerId: 28,
              name: 'MF 28',
              isFirstEleven: true,
              position: 'MC',
              shirtNo: 10,
            },
            {
              playerId: 29,
              name: 'FW 29',
              isFirstEleven: true,
              position: 'AML',
              shirtNo: 7,
            },
            {
              playerId: 30,
              name: 'FW 30',
              isFirstEleven: true,
              position: 'AMR',
              shirtNo: 11,
            },
            {
              playerId: 31,
              name: 'FW 31',
              isFirstEleven: true,
              position: 'FW',
              shirtNo: 9,
            },
            // ベンチ選手
            {
              playerId: 32,
              name: 'Away Sub 1',
              isFirstEleven: false,
              position: 'GK',
              shirtNo: 12,
            },
            {
              playerId: 33,
              name: 'Away Sub 2',
              isFirstEleven: false,
              position: 'FW',
              shirtNo: 14,
            },
          ],
          formations: [
            {
              formationName: '4-3-3',
              playerIds: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31],
              formationPositions: [
                { vertical: 0, horizontal: 0 },
                { vertical: 2, horizontal: 2 },
                { vertical: 2, horizontal: 4 },
                { vertical: 2, horizontal: 6 },
                { vertical: 2, horizontal: 8 },
                { vertical: 4, horizontal: 5 },
                { vertical: 6, horizontal: 3 },
                { vertical: 6, horizontal: 7 },
                { vertical: 8, horizontal: 2 },
                { vertical: 8, horizontal: 8 },
                { vertical: 9, horizontal: 5 },
              ],
            },
          ],
        },
      },
    };

    importFromMatch(mockMatch);
  };

  return (
    <div className="flex flex-col w-full h-full bg-slate-950 text-white overflow-hidden select-none">
      {/* トップヘッダー */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm sm:text-base font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            戦術アニメーション
          </h2>

          {/* 向き切り替え (縦画面 / 横画面) */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setOrientation('vertical')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
                orientation === 'vertical'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="縦画面モード (TikTok/Reels/Shorts向け)"
            >
              <Smartphone className="w-3 h-3" />
              <span>縦画面</span>
            </button>
            <button
              type="button"
              onClick={() => setOrientation('horizontal')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
                orientation === 'horizontal'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="横画面モード (YouTube/PC向け)"
            >
              <Monitor className="w-3 h-3" />
              <span>横画面</span>
            </button>
          </div>

          {/* ショートカットヒント */}
          <div className="hidden lg:flex items-center gap-2 text-[10px] text-slate-500 font-mono pl-2 border-l border-slate-800">
            <span>[Space: 再生/停止]</span>
            <span>[←/→: シーン切替]</span>
            <span>[Esc: 選択解除]</span>
          </div>
        </div>

        {/* 右側アクション */}
        <div className="flex items-center gap-1.5">
          {!initialMatch && (
            <button
              type="button"
              onClick={handleImportMockMatch}
              className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-medium transition-colors border border-slate-700"
            >
              <Import className="w-3 h-3 text-blue-400" />
              <span>サンプル読込</span>
            </button>
          )}

          <button
            type="button"
            onClick={resetScenes}
            className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-rose-900/50 text-slate-300 hover:text-rose-200 rounded-lg text-xs font-medium transition-colors border border-slate-700"
            title="リセット"
          >
            <RotateCcw className="w-3 h-3" />
            <span>リセット</span>
          </button>

          {/* パネル開閉トグル (ピッチ最大化) */}
          <button
            type="button"
            onClick={() => setIsOptionsPanelOpen(!isOptionsPanelOpen)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors border ${
              isOptionsPanelOpen
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                : 'bg-indigo-600 border-indigo-500 text-white shadow'
            }`}
            title={
              isOptionsPanelOpen ? '設定パネルを閉じる' : '設定パネルを開く'
            }
          >
            {isOptionsPanelOpen ? (
              <PanelRightClose className="w-3.5 h-3.5" />
            ) : (
              <PanelRightOpen className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">
              {isOptionsPanelOpen ? 'パネル閉' : '設定パネル'}
            </span>
          </button>
        </div>
      </div>

      {/* メインワークスペース (ピッチ + オプションパネル) */}
      <div className="flex-1 flex flex-row min-h-0 overflow-hidden relative">
        {/* ピッチ描画コンテナ */}
        <div
          ref={containerRef}
          className={`flex-1 flex items-center justify-center min-h-0 min-w-0 bg-slate-950/40 relative overflow-hidden ${
            orientation === 'vertical' ? 'p-1 sm:p-2' : 'p-2 sm:p-3'
          }`}
        >
          <AnimationPitch
            ref={pitchRef}
            width={pitchDimensions.width}
            height={pitchDimensions.height}
          />
        </div>

        {/* マーカーオプション変更パネル (開閉トグル付き) */}
        {isOptionsPanelOpen && <MarkerOptionsPanel />}
      </div>

      {/* 折りたたみベンチUI */}
      <AnimationBench />

      {/* タイムライン・再生・エクスポートバー */}
      <AnimationTimeline pitchRef={pitchRef} />
    </div>
  );
};
