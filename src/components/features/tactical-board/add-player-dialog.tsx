'use client';

import { Image as ImageIcon, Plus, Upload, UserPlus, X } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { savePlayerMaster, savePlayerPhoto } from '@/lib/db/queries';
import { AVAILABLE_SEASONS, type Season } from '@/lib/tactical/chelsea-preset';
import type { Player, StandardPosition } from '@/types';

interface AddPlayerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTeam?: 'home' | 'away';
  defaultSeason?: string;
  availableSeasons?: readonly string[];
  onPlayerAdded?: (player: Player, team: 'home' | 'away') => void;
}

const POSITIONS: Array<{ value: StandardPosition; label: string }> = [
  { value: 'GK', label: 'GK (Goalkeeper)' },
  { value: 'DF', label: 'DF (Defender)' },
  { value: 'MID', label: 'MID (Midfielder)' },
  { value: 'FW', label: 'FW (Forward)' },
  { value: 'Other', label: 'Other (その他 / 未設定)' },
];

export const AddPlayerDialog: React.FC<AddPlayerDialogProps> = ({
  isOpen,
  onClose,
  defaultTeam = 'home',
  defaultSeason = '26-27',
  availableSeasons = AVAILABLE_SEASONS,
  onPlayerAdded,
}) => {
  const [name, setName] = useState('');
  const [shirtNo, setShirtNo] = useState<number | ''>('');
  const [position, setPosition] = useState<StandardPosition>('Other');
  const [season, setSeason] = useState<string>(defaultSeason);
  const [team, setTeam] = useState<'home' | 'away'>(defaultTeam);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSeason(defaultSeason);
    }
  }, [isOpen, defaultSeason]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('画像サイズは5MB以下にしてください');
        return;
      }
      setPhotoBlob(file);
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoBlob(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('選手名を入力してください');
      return;
    }

    try {
      setIsSubmitting(true);
      // 手動追加選手には負のID（ユニーク）を付与
      const playerId = -Math.floor(Date.now() % 1000000000);
      const numericShirtNo = typeof shirtNo === 'number' ? shirtNo : 99;
      const targetSeason = season.trim() || defaultSeason;

      // 1. PlayerMaster をローカルDBに保存
      await savePlayerMaster({
        playerId,
        name: name.trim(),
        defaultShirtNo: numericShirtNo,
        position,
        season: targetSeason,
        teamName: team === 'home' ? 'Chelsea' : 'Opponent',
        updatedAt: Date.now(),
      });

      // 2. 写真Blobがあれば保存
      if (photoBlob) {
        await savePlayerPhoto(playerId, photoBlob, name.trim(), targetSeason);
      }

      // 3. Player オブジェクトを構築
      const newPlayer: Player = {
        playerId,
        name: name.trim(),
        shirtNo: numericShirtNo,
        position,
        isFirstEleven: false,
        height: 180,
        weight: 75,
        age: 24,
        isManOfTheMatch: false,
        field: team,
        stats: {},
      };

      if (onPlayerAdded) {
        onPlayerAdded(newPlayer, team);
      }
      toast.success(`${name.trim()} を選手リストに追加しました`);
      handleClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '選手追加に失敗しました';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setShirtNo('');
    setPosition('Other');
    handleRemovePhoto();
    onClose();
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2 text-slate-100 font-bold text-base">
            <UserPlus className="w-5 h-5 text-blue-400" />
            <span>新規選手を追加</span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-200 hover:bg-slate-800 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Team Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              所属チーム
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTeam('home')}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                  team === 'home'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                Chelsea (Home)
              </button>
              <button
                type="button"
                onClick={() => setTeam('away')}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                  team === 'away'
                    ? 'bg-red-600/20 border-red-500 text-red-400'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                Opponent (Away)
              </button>
            </div>
          </div>

          {/* Name & Season Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                選手名 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="例: Estêvão Willian"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                シーズン
              </label>
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
              >
                {availableSeasons.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Shirt No & Position Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                背番号
              </label>
              <input
                type="number"
                min="1"
                max="99"
                placeholder="例: 41"
                value={shirtNo}
                onChange={(e) =>
                  setShirtNo(
                    e.target.value === '' ? '' : parseInt(e.target.value, 10),
                  )
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                ポジション
              </label>
              <select
                value={position}
                onChange={(e) =>
                  setPosition(e.target.value as StandardPosition)
                }
                className="w-full h-10 bg-slate-950/80 border border-slate-700 rounded-xl px-3 text-xs font-medium text-slate-100 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
              >
                {POSITIONS.map((pos) => (
                  <option key={pos.value} value={pos.value}>
                    {pos.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Photo Upload (Optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              顔写真画像 (任意)
            </label>
            <div className="flex items-center gap-3">
              {photoPreview ? (
                <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-blue-500 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute inset-0 bg-black/60 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-slate-800 border border-dashed border-slate-600 flex items-center justify-center text-slate-500 shrink-0">
                  <ImageIcon className="w-5 h-5" />
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>画像を選択</span>
              </button>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors shadow-lg shadow-blue-600/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isSubmitting ? '保存中...' : '選手を追加'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};
