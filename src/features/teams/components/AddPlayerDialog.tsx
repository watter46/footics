'use client';

import { Image as ImageIcon, Plus, Upload, UserPlus, X } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { savePlayerMaster, savePlayerPhoto } from '@/lib/db/queries';
import { AVAILABLE_SEASONS } from '@/lib/tactical/chelsea-preset';
import type { Player, StandardPosition } from '@/types';
import { PlayerBasicFormFields } from './player-basic-form-fields';

export interface AddPlayerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTeam?: 'home' | 'away';
  defaultSeason?: string;
  teamName?: string;
  availableSeasons?: readonly string[];
  onPlayerAdded?: (player: Player, team: 'home' | 'away') => void;
}

const cClose =
  'text-slate-400 hover:text-slate-200 hover:bg-slate-800 p-1.5 rounded-lg transition-colors';
const cSelect =
  'w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors';
const cCancel =
  'px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors';
const cSubmit =
  'flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors shadow-lg shadow-blue-600/20';
const cUpload =
  'flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200';
const cClear =
  'absolute inset-0 bg-black/60 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity';
const cImgWrap =
  'relative w-12 h-12 rounded-full overflow-hidden border-2 border-blue-500 shrink-0';
const cImgEmpty =
  'w-12 h-12 rounded-full bg-slate-800 border border-dashed border-slate-600 flex items-center justify-center text-slate-500 shrink-0';
const cBtn = (a: boolean, col: 'blue' | 'red') =>
  `py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
    a
      ? col === 'blue'
        ? 'bg-blue-600/20 border-blue-500 text-blue-400'
        : 'bg-red-600/20 border-red-500 text-red-400'
      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
  }`;

const toPlayer = (
  id: number,
  name: string,
  no: number,
  pos: StandardPosition,
  team: 'home' | 'away',
): Player => ({
  playerId: id,
  name,
  shirtNo: no,
  position: pos,
  isFirstEleven: false,
  height: 180,
  weight: 75,
  age: 24,
  isManOfTheMatch: false,
  field: team,
  stats: {},
});

const executeSave = async (
  id: number,
  name: string,
  no: number,
  pos: StandardPosition,
  season: string,
  team: 'home' | 'away',
  teamName?: string,
  photo?: File | null,
) => {
  await savePlayerMaster({
    playerId: id,
    name,
    defaultShirtNo: no,
    position: pos,
    season,
    teamName: team === 'home' ? (teamName ?? 'Chelsea') : 'Opponent',
    updatedAt: Date.now(),
  });
  if (photo) await savePlayerPhoto(id, photo);
};

interface PhotoUploadProps {
  preview: string | null;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onPick: () => void;
  onPhoto: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}

function PhotoUpload({
  preview,
  fileRef,
  onPick,
  onPhoto,
  onClear,
}: PhotoUploadProps) {
  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-semibold text-slate-300">
        顔写真画像 (任意)
      </span>
      <div className="flex items-center gap-3">
        {preview ? (
          <div className={cImgWrap}>
            {/* biome-ignore lint/performance/noImgElement: preview */}
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            <button type="button" onClick={onClear} className={cClear}>
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className={cImgEmpty}>
            <ImageIcon className="w-5 h-5" />
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={onPhoto}
          className="hidden"
        />
        <button type="button" onClick={onPick} className={cUpload}>
          <Upload className="w-3.5 h-3.5" />
          <span>画像を選択</span>
        </button>
      </div>
    </div>
  );
}

function AddPlayerForm({
  defaultTeam = 'home',
  defaultSeason = '26-27',
  teamName,
  availableSeasons = AVAILABLE_SEASONS,
  onClose,
  onPlayerAdded,
}: Omit<AddPlayerDialogProps, 'isOpen'>) {
  const [name, setName] = useState('');
  const [shirtNo, setShirtNo] = useState<number | ''>('');
  const [pos, setPos] = useState<StandardPosition>('Other');
  const [season, setSeason] = useState(defaultSeason);
  const [team, setTeam] = useState<'home' | 'away'>(defaultTeam);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const clearPhoto = () => {
    setPhoto(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024)
      return toast.error('画像サイズは5MB以下にしてください');
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return toast.error('選手名を入力してください');
    try {
      setLoading(true);
      const pid = -Math.floor(Date.now() % 1e9);
      const no = typeof shirtNo === 'number' ? shirtNo : 99;
      const s = season.trim() || defaultSeason;
      await executeSave(pid, trimmed, no, pos, s, team, teamName, photo);
      onPlayerAdded?.(toPlayer(pid, trimmed, no, pos, team), team);
      toast.success(`${trimmed} を選手リストに追加しました`);
      clearPhoto();
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : '選手追加に失敗しました',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div className="space-y-1.5">
        <span className="block text-xs font-semibold text-slate-300">
          所属チーム
        </span>
        <div className="grid grid-cols-2 gap-2">
          {(['home', 'away'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTeam(t)}
              className={cBtn(team === t, t === 'home' ? 'blue' : 'red')}
            >
              {t === 'home' ? 'Chelsea (Home)' : 'Opponent (Away)'}
            </button>
          ))}
        </div>
      </div>

      <PlayerBasicFormFields
        name={name}
        shirtNo={shirtNo}
        position={pos}
        onNameChange={setName}
        onShirtNoChange={setShirtNo}
        onPositionChange={setPos}
      />

      <div className="space-y-1.5">
        <label
          htmlFor="new-player-season"
          className="text-xs font-semibold text-slate-300"
        >
          シーズン
        </label>
        <select
          id="new-player-season"
          value={season}
          onChange={(e) => setSeason(e.target.value)}
          className={cSelect}
        >
          {availableSeasons.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <PhotoUpload
        preview={preview}
        fileRef={fileRef}
        onPick={() => fileRef.current?.click()}
        onPhoto={handlePhoto}
        onClear={clearPhoto}
      />

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
        <button type="button" onClick={onClose} className={cCancel}>
          キャンセル
        </button>
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className={cSubmit}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{loading ? '保存中...' : '選手を追加'}</span>
        </button>
      </div>
    </form>
  );
}

export function AddPlayerDialog(props: AddPlayerDialogProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!props.isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2 text-slate-100 font-bold text-base">
            <UserPlus className="w-5 h-5 text-blue-400" />
            <span>新規選手を追加</span>
          </div>
          <button type="button" onClick={props.onClose} className={cClose}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <AddPlayerForm {...props} />
      </div>
    </div>,
    document.body,
  );
}
