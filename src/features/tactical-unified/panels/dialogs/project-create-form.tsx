'use client';

import { Sparkles } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { saveTacticalProject } from '@/lib/db/tactical-projects-db';
import {
  type AspectRatio,
  createDefaultProject,
  getDefaultBoundaryBoxForAspect,
} from '@/lib/types/tactical-unified';
import { cn } from '@/lib/utils';

export interface ProjectCreateFormProps {
  onCancel: () => void;
  onCreated: () => void;
}

const ASPECT_OPTIONS: Array<{
  value: AspectRatio;
  label: string;
  desc: string;
}> = [
  { value: '4:5', label: '4:5', desc: 'SNS / Instagram / X 縦型' },
  { value: '16:9', label: '16:9', desc: '横型 / YouTube / プレゼン' },
  { value: '9:16', label: '9:16', desc: '全画面縦 / Reels / TikTok' },
  { value: '1:1', label: '1:1', desc: '正方形 / フィード' },
];

const BACKGROUND_OPTIONS: { id: 'pitch' | 'blank'; label: string }[] = [
  { id: 'pitch', label: 'サッカーピッチ' },
  { id: 'blank', label: 'ブランク（無地）' },
];

const LABEL_CLASS = 'block text-xs font-semibold text-[#A1A1AA] mb-1.5';
const COLOR_INPUT_CLASS =
  'w-6 h-6 rounded-[6px] border border-white/[0.08] bg-transparent cursor-pointer';

export function ProjectCreateForm({
  onCancel,
  onCreated,
}: ProjectCreateFormProps) {
  const loadProject = useTacticalUnifiedStoreContext((s) => s.loadProject);
  const setSaveStatus = useTacticalUnifiedStoreContext((s) => s.setSaveStatus);

  const [title, setTitle] = useState('新規戦術プロジェクト');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('4:5');
  const [backgroundType, setBackgroundType] = useState<'pitch' | 'blank'>(
    'pitch',
  );
  const [homeColor, setHomeColor] = useState('#034694');
  const [awayColor, setAwayColor] = useState('#ef4444');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const proj = createDefaultProject(crypto.randomUUID());
      proj.title = title.trim() || '新規戦術プロジェクト';
      proj.aspectRatio = aspectRatio;
      const boundaryBox = getDefaultBoundaryBoxForAspect(aspectRatio);
      proj.boundaryBox = boundaryBox;
      proj.backgroundType = backgroundType;
      proj.homeColor = { primary: homeColor };
      proj.awayColor = { primary: awayColor };
      const firstSlide = proj.phases[0]?.slides[0];
      if (firstSlide) {
        firstSlide.aspectRatio = aspectRatio;
        firstSlide.boundaryBox = { ...boundaryBox };
        firstSlide.backgroundType = backgroundType;
      }
      await saveTacticalProject(proj, true);
      loadProject(proj);
      setSaveStatus('saved');
      toast.success(`「${proj.title}」を作成しました`);
      onCreated();
    } catch (err) {
      console.error('Failed to create project:', err);
      toast.error('新規プロジェクトの作成に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col flex-1 p-6 overflow-y-auto space-y-5 bg-[#121214]"
    >
      <div>
        <label htmlFor="create-project-title" className={LABEL_CLASS}>
          プロジェクト名
        </label>
        <Input
          id="create-project-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="プロジェクトのタイトルを入力..."
          required
        />
      </div>

      <div>
        <span className={LABEL_CLASS}>ピッチ アスペクト比</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {ASPECT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setAspectRatio(opt.value)}
              className={cn(
                'p-2.5 rounded-[12px] border text-left transition-all cursor-pointer',
                aspectRatio === opt.value
                  ? 'bg-[#FF8100]/10 border-[#FF8100] text-white ring-1 ring-[#FF8100]/50'
                  : 'bg-[#18181B] border-white/[0.07] text-[#A1A1AA] hover:bg-[#222226]',
              )}
            >
              <div className="text-sm font-bold">{opt.label}</div>
              <div className="text-[10px] text-[#71717A] mt-0.5">
                {opt.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <span className={LABEL_CLASS}>背景タイプ</span>
          <SegmentedControl
            value={backgroundType}
            options={BACKGROUND_OPTIONS}
            onChange={setBackgroundType}
          />
        </div>

        <div>
          <span className={LABEL_CLASS}>チームカラー初期値</span>
          <div className="flex items-center gap-4 py-1">
            <label className="flex items-center gap-1.5 text-xs text-[#A1A1AA] cursor-pointer">
              <span>HOME:</span>
              <input
                type="color"
                value={homeColor}
                onChange={(e) => setHomeColor(e.target.value)}
                className={COLOR_INPUT_CLASS}
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-[#A1A1AA] cursor-pointer">
              <span>AWAY:</span>
              <input
                type="color"
                value={awayColor}
                onChange={(e) => setAwayColor(e.target.value)}
                className={COLOR_INPUT_CLASS}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.07] mt-auto">
        <Button variant="secondary" onClick={onCancel}>
          キャンセル
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
          icon={<Sparkles />}
        >
          {isSubmitting ? '作成中...' : 'プロジェクトを作成'}
        </Button>
      </div>
    </form>
  );
}
