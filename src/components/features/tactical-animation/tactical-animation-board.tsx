'use client';

import {
  Film,
  Import,
  Monitor,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
  Settings2,
  Smartphone,
  X,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useTacticalAnimation } from '@/hooks/use-tactical-animation';
import { useTacticalAnimationStore } from '@/stores/tactical-animation-store';
import type { Match } from '@/types';
import { AnimationInspectorPanel } from './animation-inspector-panel';
import { AnimationPitch, type AnimationPitchRef } from './animation-pitch';
import { AnimationTimelinePanel } from './animation-timeline-panel';

interface TacticalAnimationBoardProps {
  initialMatch?: Match;
  onClose?: () => void;
  skipAutoImport?: boolean;
}

export const TacticalAnimationBoard: React.FC<TacticalAnimationBoardProps> = ({
  initialMatch,
  onClose,
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

  // 左右パネルの開閉状態
  const [isTimelineOpen, setIsTimelineOpen] = useState(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);

  const orientation = useTacticalAnimationStore((s) => s.orientation);
  const setOrientation = useTacticalAnimationStore((s) => s.setOrientation);
  const teamVisibility = useTacticalAnimationStore((s) => s.teamVisibility);
  const setTeamVisibility = useTacticalAnimationStore(
    (s) => s.setTeamVisibility,
  );
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
    } else if (
      !initialMatch &&
      (!scenes[0] || Object.keys(scenes[0].players).length === 0)
    ) {
      handleImportMockMatch();
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

      // 縦画面時は高さを極限まで活用するためパディングを最小化 (4px)、横画面は 8px
      const padding = orientation === 'vertical' ? 4 : 8;
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
  }, [orientation]);

  // モックデータ読み込み (テスト用・Chelsea 3-4-3)
  const handleImportMockMatch = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockMatch: any = {
      id: 'mock-match-1',
      matchType: 'club',
      teams: {
        home: {
          teamId: 1,
          name: 'Chelsea',
          players: [
            {
              playerId: 1,
              name: 'Robert Sánchez',
              isFirstEleven: true,
              position: 'GK',
              shirtNo: 1,
            },
            {
              playerId: 2,
              name: 'Wesley Fofana',
              isFirstEleven: true,
              position: 'DC',
              shirtNo: 29,
            },
            {
              playerId: 3,
              name: 'Levi Colwill',
              isFirstEleven: true,
              position: 'DC',
              shirtNo: 6,
            },
            {
              playerId: 4,
              name: 'Tosin Adarabioyo',
              isFirstEleven: true,
              position: 'DC',
              shirtNo: 4,
            },
            {
              playerId: 5,
              name: 'Marc Cucurella',
              isFirstEleven: true,
              position: 'DL',
              shirtNo: 3,
            },
            {
              playerId: 6,
              name: 'Moisés Caicedo',
              isFirstEleven: true,
              position: 'DMC',
              shirtNo: 25,
            },
            {
              playerId: 7,
              name: 'Enzo Fernández',
              isFirstEleven: true,
              position: 'MC',
              shirtNo: 8,
            },
            {
              playerId: 8,
              name: 'Reece James',
              isFirstEleven: true,
              position: 'DR',
              shirtNo: 24,
            },
            {
              playerId: 9,
              name: 'Jadon Sancho',
              isFirstEleven: true,
              position: 'AML',
              shirtNo: 19,
            },
            {
              playerId: 10,
              name: 'Nicolas Jackson',
              isFirstEleven: true,
              position: 'FW',
              shirtNo: 15,
            },
            {
              playerId: 11,
              name: 'Cole Palmer',
              isFirstEleven: true,
              position: 'AMR',
              shirtNo: 20,
            },
            // ベンチ選手
            {
              playerId: 12,
              name: 'Filip Jörgensen',
              isFirstEleven: false,
              position: 'GK',
              shirtNo: 12,
            },
            {
              playerId: 13,
              name: 'Malo Gusto',
              isFirstEleven: false,
              position: 'DR',
              shirtNo: 27,
            },
            {
              playerId: 14,
              name: 'Roméo Lavia',
              isFirstEleven: false,
              position: 'DMC',
              shirtNo: 45,
            },
            {
              playerId: 15,
              name: 'Christopher Nkunku',
              isFirstEleven: false,
              position: 'AMC',
              shirtNo: 18,
            },
            {
              playerId: 16,
              name: 'Pedro Neto',
              isFirstEleven: false,
              position: 'AMR',
              shirtNo: 7,
            },
          ],
          formations: [
            {
              formationName: '3-4-3',
              playerIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
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

  const handleReset = () => {
    if (initialMatch) {
      importFromMatch(initialMatch);
    } else {
      handleImportMockMatch();
    }
  };

  const homeName = initialMatch?.teams?.home?.name;
  const awayName = initialMatch?.teams?.away?.name;
  const score = initialMatch?.score;

  return (
    <div className="flex flex-col w-full h-full bg-slate-950 text-white overflow-hidden select-none">
      {/* スリム型トップヘッダー (高さ 36px〜38px) */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 shrink-0 z-20">
        <div className="flex items-center gap-2.5">
          {/* 左パネル開閉トグルボタン */}
          <button
            type="button"
            onClick={() => setIsTimelineOpen(!isTimelineOpen)}
            className={`p-1.5 rounded-lg text-xs font-medium transition-colors border ${
              isTimelineOpen
                ? 'bg-slate-800 border-slate-700 text-blue-400 hover:text-white'
                : 'bg-blue-600/20 border-blue-500/50 text-blue-400 hover:bg-blue-600 hover:text-white shadow-sm'
            }`}
            title={
              isTimelineOpen
                ? 'タイムラインパネルを閉じる'
                : 'タイムラインパネルを開く'
            }
          >
            {isTimelineOpen ? (
              <PanelLeftClose className="w-3.5 h-3.5" />
            ) : (
              <PanelLeftOpen className="w-3.5 h-3.5" />
            )}
          </button>

          <h2 className="text-xs sm:text-sm font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-sky-400 bg-clip-text text-transparent flex items-center gap-1.5">
            <Film className="w-4 h-4 text-blue-400" />
            <span>戦術アニメーション</span>
          </h2>

          {/* 向き切り替え (縦画面 デフォルト / 横画面) */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setOrientation('vertical')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
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
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
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

          {/* 表示チーム切り替え (両チーム / HOMEのみ / AWAYのみ) */}
          <div className="hidden sm:flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={() => setTeamVisibility('both')}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                teamVisibility === 'both'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="両チームを表示"
            >
              両チーム
            </button>
            <button
              type="button"
              onClick={() => setTeamVisibility('home')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded font-medium transition-colors ${
                teamVisibility === 'home'
                  ? 'bg-[#034694] text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="HOMEチームのみ表示"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
              <span>HOME</span>
            </button>
            <button
              type="button"
              onClick={() => setTeamVisibility('away')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded font-medium transition-colors ${
                teamVisibility === 'away'
                  ? 'bg-rose-700 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="AWAYチームのみ表示"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" />
              <span>AWAY</span>
            </button>
          </div>
        </div>

        {/* 中央: マッチ情報バッジ (存在する場合) */}
        {homeName && awayName && (
          <div className="hidden md:flex items-center gap-2 px-3 py-0.5 bg-slate-950 rounded-full border border-slate-800 text-[11px] text-slate-300">
            <span className="font-semibold text-white">{homeName}</span>
            <span className="text-slate-500 font-mono">{score || 'vs'}</span>
            <span className="font-semibold text-white">{awayName}</span>
          </div>
        )}

        {/* 右側アクション & パネルトグル & 閉じる */}
        <div className="flex items-center gap-1.5">
          {!initialMatch && (
            <button
              type="button"
              onClick={handleImportMockMatch}
              className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-medium transition-colors border border-slate-700"
            >
              <Import className="w-3 h-3 text-blue-400" />
              <span className="hidden sm:inline">サンプル読込</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-rose-900/50 text-slate-300 hover:text-rose-200 rounded-lg text-xs font-medium transition-colors border border-slate-700"
            title="シーンを初期状態にリセット"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">リセット</span>
          </button>

          {/* 右パネル開閉トグルボタン */}
          <button
            type="button"
            onClick={() => setIsInspectorOpen(!isInspectorOpen)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors border ${
              isInspectorOpen
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                : 'bg-indigo-600 border-indigo-500 text-white shadow'
            }`}
            title={
              isInspectorOpen
                ? 'インスペクターパネルを閉じる'
                : 'インスペクターパネルを開く'
            }
          >
            {isInspectorOpen ? (
              <PanelRightClose className="w-3.5 h-3.5" />
            ) : (
              <PanelRightOpen className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">
              {isInspectorOpen ? '設定閉' : '設定パネル'}
            </span>
          </button>

          {/* モーダル閉じるボタン (親から渡された場合) */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-colors border border-slate-700 ml-1"
              title="閉じる"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">閉じる</span>
            </button>
          )}
        </div>
      </div>

      {/* 3カラム メインワークスペース (左タイムライン + 中央巨大ピッチ + 右インスペクター) */}
      <div className="flex-1 flex flex-row min-h-0 min-w-0 overflow-hidden relative">
        {/* 左カラム: タイムライン＆シーン管理 */}
        {isTimelineOpen && (
          <AnimationTimelinePanel
            pitchRef={pitchRef}
            onClose={() => setIsTimelineOpen(false)}
          />
        )}

        {/* 中央カラム: 巨大ピッチ描画コンテナ (画面高さを100%活用) */}
        <div
          ref={containerRef}
          className="flex-1 flex items-center justify-center min-h-0 min-w-0 bg-slate-950/40 relative overflow-hidden p-1"
        >
          {/* 左パネルが閉じている場合のクイック展開フローティングボタン */}
          {!isTimelineOpen && (
            <button
              type="button"
              onClick={() => setIsTimelineOpen(true)}
              className="absolute top-2 left-2 z-20 flex items-center gap-1 px-2.5 py-1.5 bg-slate-900/90 hover:bg-blue-600 border border-slate-700 hover:border-blue-500 text-slate-300 hover:text-white rounded-lg text-xs font-medium shadow-lg backdrop-blur-xs transition-all animate-in fade-in"
              title="タイムラインを開く"
            >
              <PanelLeftOpen className="w-3.5 h-3.5 text-blue-400" />
              <span>タイムライン</span>
            </button>
          )}

          {/* 右パネルが閉じている場合のクイック展開フローティングボタン */}
          {!isInspectorOpen && (
            <button
              type="button"
              onClick={() => setIsInspectorOpen(true)}
              className="absolute top-2 right-2 z-20 flex items-center gap-1 px-2.5 py-1.5 bg-slate-900/90 hover:bg-indigo-600 border border-slate-700 hover:border-indigo-500 text-slate-300 hover:text-white rounded-lg text-xs font-medium shadow-lg backdrop-blur-xs transition-all animate-in fade-in"
              title="インスペクターを開く"
            >
              <Settings2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>設定</span>
              <PanelRightOpen className="w-3.5 h-3.5" />
            </button>
          )}

          <AnimationPitch
            ref={pitchRef}
            width={pitchDimensions.width}
            height={pitchDimensions.height}
          />
        </div>

        {/* 右カラム: インスペクター (マーカー設定 & ベンチ・配置) */}
        {isInspectorOpen && (
          <AnimationInspectorPanel onClose={() => setIsInspectorOpen(false)} />
        )}
      </div>
    </div>
  );
};
