'use client';

import { useEffect, useState } from 'react';
import {
  SyntaxJsonDrawer,
  SyntaxPitchCanvas,
  SyntaxSceneTabs,
  SyntaxStudioHeader,
  sampleTuningDataset,
} from '@/components/features/syntax-studio';
import { useSyntaxStudioStore } from '@/stores/syntax-studio-store';

export default function SyntaxStudioPage() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const {
    viewMode,
    currentSceneIndex,
    aiDraft,
    humanGroundTruth,
    matchMetadata,
    datasetId,
    setViewMode,
    setCurrentSceneIndex,
    loadJsonDraft,
    updateGroundTruthPlayerPosition,
    updateGroundTruthPlayerAnnotation,
  } = useSyntaxStudioStore();

  // 初回マウント時にデータが空であればサンプルデータを自動ロード
  useEffect(() => {
    if (!aiDraft) {
      loadJsonDraft(JSON.stringify(sampleTuningDataset));
    }
  }, [aiDraft, loadJsonDraft]);

  // キーボードショートカット (1-4 でシーン切替, S で Split/Focus 切替, J で JSON Drawer)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 入力フォーム操作中は無視
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === 's' || e.key === 'S') {
        setViewMode(viewMode === 'split' ? 'focus' : 'split');
      } else if (e.key === 'j' || e.key === 'J') {
        setIsDrawerOpen((prev) => !prev);
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        const index = Number.parseInt(e.key, 10) - 1;
        const total = humanGroundTruth?.tacticalScenes.length ?? 0;
        if (index < total) {
          setCurrentSceneIndex(index);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, setViewMode, setCurrentSceneIndex, humanGroundTruth]);

  // 現在のシーン取得
  const scenes =
    humanGroundTruth?.tacticalScenes || aiDraft?.tacticalScenes || [];
  const currentAiScene = aiDraft?.tacticalScenes[currentSceneIndex] ?? null;
  const currentGroundTruthScene =
    humanGroundTruth?.tacticalScenes[currentSceneIndex] ?? null;

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* スリムヘッダー */}
      <SyntaxStudioHeader
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        onOpenJsonDrawer={() => setIsDrawerOpen(true)}
        matchMetadata={matchMetadata}
        datasetId={datasetId}
        sceneCount={scenes.length}
      />

      {/* 成果物最大表示（Large Canvas First）レイアウト：画面の80%以上を16:9キャンバスが占有 */}
      <main className="flex-1 min-h-0 flex flex-col p-2 sm:p-4 gap-2 sm:gap-3">
        {/* キャンバスエリア */}
        <div className="flex-1 min-h-0 flex items-center justify-center w-full">
          {viewMode === 'split' ? (
            /* Split View: 左画面 AI Draft / 右画面 Human Ground Truth */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 w-full h-full max-h-full items-center justify-center">
              {/* AI Draft (Read-only) */}
              <div className="w-full h-full flex items-center justify-center min-h-0">
                <SyntaxPitchCanvas
                  mode="readOnly"
                  scene={currentAiScene}
                  title={currentAiScene?.title}
                  badgeLabel="AI Draft (Read-only)"
                  badgeVariant="ai"
                  className="max-h-full max-w-full"
                />
              </div>

              {/* Human Ground Truth (Interactive) */}
              <div className="w-full h-full flex items-center justify-center min-h-0">
                <SyntaxPitchCanvas
                  mode="interactive"
                  scene={currentGroundTruthScene}
                  title={currentGroundTruthScene?.title}
                  badgeLabel="Human Ground Truth (Editable)"
                  badgeVariant="human"
                  onPlayerPositionChange={(playerId, x, y) => {
                    if (currentGroundTruthScene) {
                      updateGroundTruthPlayerPosition(
                        currentGroundTruthScene.id,
                        playerId,
                        x,
                        y,
                      );
                    }
                  }}
                  onPlayerAnnotationChange={(playerId, annotation) => {
                    if (currentGroundTruthScene) {
                      updateGroundTruthPlayerAnnotation(
                        currentGroundTruthScene.id,
                        playerId,
                        annotation,
                      );
                    }
                  }}
                  className="max-h-full max-w-full"
                />
              </div>
            </div>
          ) : (
            /* Focus View: 大画面 16:9 Single Pitch Canvas */
            <div className="w-full h-full flex items-center justify-center min-h-0">
              <SyntaxPitchCanvas
                mode="interactive"
                scene={currentGroundTruthScene}
                title={currentGroundTruthScene?.title}
                badgeLabel="Human Ground Truth (Full Focus)"
                badgeVariant="human"
                onPlayerPositionChange={(playerId, x, y) => {
                  if (currentGroundTruthScene) {
                    updateGroundTruthPlayerPosition(
                      currentGroundTruthScene.id,
                      playerId,
                      x,
                      y,
                    );
                  }
                }}
                onPlayerAnnotationChange={(playerId, annotation) => {
                  if (currentGroundTruthScene) {
                    updateGroundTruthPlayerAnnotation(
                      currentGroundTruthScene.id,
                      playerId,
                      annotation,
                    );
                  }
                }}
                className="max-h-full max-w-[calc((100vh-140px)*(16/9))] aspect-[16/9]"
              />
            </div>
          )}
        </div>

        {/* 4コマ切り替えタブ & ナビゲーションバー */}
        <div className="shrink-0 flex items-center justify-center">
          <SyntaxSceneTabs
            scenes={scenes}
            currentIndex={currentSceneIndex}
            onSelectIndex={setCurrentSceneIndex}
            className="w-full max-w-4xl"
          />
        </div>
      </main>

      {/* JSON 入力 & エクスポート Drawer (Zod 検証付き) */}
      <SyntaxJsonDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onApplyJson={loadJsonDraft}
        currentDataset={{
          aiDraft,
          humanGroundTruth,
          matchMetadata,
          datasetId,
        }}
      />
    </div>
  );
}
