'use client';

import { AlertTriangle, FolderPlus, Layers, Plus } from 'lucide-react';
import { useState } from 'react';
import type {
  PitchAppearanceConfig,
  Slide,
  TacticalPhase,
} from '@/lib/types/tactical-unified';
import { PhaseSection } from './phase-section';

export interface LeftPanelProps {
  phases?: TacticalPhase[];
  activePhaseId?: string;
  activeSlideId?: string;
  pitchAppearance?: PitchAppearanceConfig;
  onSelectScene?: (phaseId: string, slideId: string) => void;
  onAddPhase?: () => void;
  onDeletePhase?: (phaseId: string) => void;
  onRenamePhase?: (phaseId: string, name: string) => void;
  onAddSlideToPhase?: (phaseId: string) => void;
  // 後方互換性プロパティ (Phase 4 移行用)
  slides?: Slide[];
  onSelectSlide?: (slideId: string) => void;
  onAddSlide?: () => void;
}

export function LeftPanel({
  phases: propPhases,
  activePhaseId = '',
  activeSlideId = '',
  pitchAppearance,
  onSelectScene,
  onAddPhase,
  onDeletePhase,
  onRenamePhase,
  onAddSlideToPhase,
  slides,
  onSelectSlide,
  onAddSlide,
}: LeftPanelProps) {
  // フォールバック: phases がなく slides のみ渡された場合は単一フェーズとして扱う
  const phases: TacticalPhase[] =
    propPhases ??
    (slides
      ? [
          {
            id: 'default-phase',
            name: 'Tactical Phase 1',
            slides,
          },
        ]
      : []);

  // アコーディオン開閉状態（明示的にトグルされたフェーズを記録）
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

  // 削除確認ダイアログの状態
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(
    null,
  );

  const handleToggleExpand = (phaseId: string) => {
    setExpandedMap((prev) => {
      const current = prev[phaseId] ?? phaseId === activePhaseId;
      return { ...prev, [phaseId]: !current };
    });
  };

  const handleSelectScene = (phaseId: string, slideId: string) => {
    if (onSelectScene) {
      onSelectScene(phaseId, slideId);
    } else if (onSelectSlide) {
      onSelectSlide(slideId);
    }
  };

  const handleAddPhase = () => {
    if (onAddPhase) {
      onAddPhase();
    }
  };

  const handleRenamePhase = (phaseId: string, name: string) => {
    if (onRenamePhase) {
      onRenamePhase(phaseId, name);
    }
  };

  const handleAddSlideToPhase = (phaseId: string) => {
    if (onAddSlideToPhase) {
      onAddSlideToPhase(phaseId);
    } else if (onAddSlide) {
      onAddSlide();
    }
  };

  const handleDeleteRequest = (phaseId: string) => {
    if (phases.length <= 1) return;
    setDeleteCandidateId(phaseId);
  };

  const handleConfirmDelete = () => {
    if (!deleteCandidateId) return;
    if (onDeletePhase) {
      onDeletePhase(deleteCandidateId);
    }
    setDeleteCandidateId(null);
  };

  const candidatePhase = phases.find((p) => p.id === deleteCandidateId);

  return (
    <aside
      aria-label="Tactical Phases"
      className="w-72 bg-[#121214] border-r border-white/[0.07] flex flex-col text-xs shrink-0 select-none z-10 h-full relative"
    >
      {/* Panel Top Header */}
      <div className="p-3 border-b border-white/[0.07] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Layers className="size-3.5 text-[#FF8100]" strokeWidth={1.5} />
          <span className="text-[11px] font-bold text-[#F4F4F5] uppercase tracking-wider">
            Tactical Phases
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-[#71717A]">
            {phases.length} {phases.length === 1 ? 'phase' : 'phases'}
          </span>
          <button
            type="button"
            onClick={handleAddPhase}
            className="px-2 py-0.5 rounded-[5px] text-[10px] font-semibold bg-[#FF8100]/10 hover:bg-[#FF8100]/20 text-[#FF8100] border border-[#FF8100]/30 transition-colors cursor-pointer inline-flex items-center gap-1"
          >
            <Plus className="size-3" strokeWidth={1.5} />
            <span>新規フェーズ</span>
          </button>
        </div>
      </div>

      {/* Phase List Scrollable Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {phases.map((phase) => {
          const isExpanded =
            expandedMap[phase.id] ?? phase.id === activePhaseId;
          const isActivePhase = phase.id === activePhaseId;
          const canDeletePhase = phases.length > 1;

          return (
            <PhaseSection
              key={phase.id}
              phase={phase}
              isExpanded={isExpanded}
              isActivePhase={isActivePhase}
              activeSlideId={activeSlideId}
              canDeletePhase={canDeletePhase}
              pitchAppearance={pitchAppearance}
              onToggleExpand={handleToggleExpand}
              onSelectScene={handleSelectScene}
              onAddSlideToPhase={handleAddSlideToPhase}
              onDeletePhaseRequest={handleDeleteRequest}
              onRenamePhase={handleRenamePhase}
            />
          );
        })}

        {/* Empty State */}
        {phases.length === 0 && (
          <div className="p-4 text-center space-y-2 text-[#71717A]">
            <FolderPlus
              className="size-6 mx-auto text-white/20"
              strokeWidth={1.5}
            />
            <p className="text-[11px]">フェーズが登録されていません</p>
            <button
              type="button"
              onClick={handleAddPhase}
              className="px-2.5 py-1 rounded-[6px] text-[10px] font-semibold bg-[#FF8100]/10 hover:bg-[#FF8100]/20 text-[#FF8100] border border-[#FF8100]/30 transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <Plus className="size-3" strokeWidth={1.5} />
              <span>フェーズを追加</span>
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteCandidateId && candidatePhase && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-phase-dialog-title"
          className="absolute inset-0 z-50 bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-3 animate-in fade-in duration-150"
        >
          <div className="bg-[#18181B] border border-white/[0.12] rounded-[10px] p-4 shadow-xl max-w-[240px] w-full text-center space-y-3">
            <div className="size-8 rounded-full bg-red-500/10 text-red-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="size-4" strokeWidth={1.5} />
            </div>
            <div>
              <h3
                id="delete-phase-dialog-title"
                className="text-[12px] font-bold text-white"
              >
                フェーズを削除しますか？
              </h3>
              <p className="text-[10px] text-[#A1A1AA] mt-1 leading-relaxed">
                「{candidatePhase.name}」と配下のシーン（
                {candidatePhase.slides.length}件）が完全に削除されます。
              </p>
            </div>
            <div className="flex gap-2 justify-center pt-1">
              <button
                type="button"
                onClick={() => setDeleteCandidateId(null)}
                className="px-3 py-1 rounded text-[11px] bg-white/5 hover:bg-white/10 text-[#A1A1AA] hover:text-white transition-colors"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3 py-1 rounded text-[11px] bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
