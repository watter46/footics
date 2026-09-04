'use client';

import { Sparkles } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { saveTacticalProject } from '@/lib/db/tactical-projects-db';
import {
  type AspectRatio,
  createDefaultProject,
  getDefaultBoundaryBoxForAspect,
} from '@/lib/types/tactical-unified';

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

export function ProjectCreateForm({
  onCancel,
  onCreated,
}: ProjectCreateFormProps) {
  const loadProject = useTacticalUnifiedStore((s) => s.loadProject);
  const setSaveStatus = useTacticalUnifiedStore((s) => s.setSaveStatus);

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
      if (proj.slides[0]) {
        proj.slides[0].aspectRatio = aspectRatio;
        proj.slides[0].boundaryBox = { ...boundaryBox };
        proj.slides[0].backgroundType = backgroundType;
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
      className="flex flex-col flex-1 p-6 overflow-y-auto space-y-5"
    >
      <div>
        <label
          htmlFor="create-project-title"
          className="block text-xs font-semibold text-white/80 mb-1.5"
        >
          プロジェクト名
        </label>
        <input
          id="create-project-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="プロジェクトのタイトルを入力..."
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:border-blue-500 transition-colors"
          required
        />
      </div>

      <div>
        <span className="block text-xs font-semibold text-white/80 mb-1.5">
          ピッチ アスペクト比
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {ASPECT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setAspectRatio(opt.value)}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                aspectRatio === opt.value
                  ? 'bg-blue-600/20 border-blue-500 text-white ring-1 ring-blue-500'
                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
              }`}
            >
              <div className="text-sm font-bold">{opt.label}</div>
              <div className="text-[10px] text-white/50 mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <span className="block text-xs font-semibold text-white/80 mb-1.5">
            背景タイプ
          </span>
          <div className="flex gap-2">
            {(['pitch', 'blank'] as const).map((bg) => (
              <button
                key={bg}
                type="button"
                onClick={() => setBackgroundType(bg)}
                className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                  backgroundType === bg
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                }`}
              >
                {bg === 'pitch' ? 'サッカーピッチ' : 'ブランク（無地）'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="block text-xs font-semibold text-white/80 mb-1.5">
            チームカラー初期値
          </span>
          <div className="flex items-center gap-4 py-1">
            <label className="flex items-center gap-1.5 text-xs text-white/70 cursor-pointer">
              <span>HOME:</span>
              <input
                type="color"
                value={homeColor}
                onChange={(e) => setHomeColor(e.target.value)}
                className="w-6 h-6 rounded border border-white/20 bg-transparent cursor-pointer"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-white/70 cursor-pointer">
              <span>AWAY:</span>
              <input
                type="color"
                value={awayColor}
                onChange={(e) => setAwayColor(e.target.value)}
                className="w-6 h-6 rounded border border-white/20 bg-transparent cursor-pointer"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10 mt-auto">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs font-medium transition-colors cursor-pointer"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
        >
          <Sparkles size={14} />
          <span>{isSubmitting ? '作成中...' : 'プロジェクトを作成'}</span>
        </button>
      </div>
    </form>
  );
}
