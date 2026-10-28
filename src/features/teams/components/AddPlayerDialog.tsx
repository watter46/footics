'use client';

import { Image as ImageIcon, Plus, Upload, X } from 'lucide-react';
import type React from 'react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from '@/components/ui/dialog';
import { NativeSelect } from '@/components/ui/select';
import { usePlayerMasterMutations } from '@/features/teams/hooks/use-player-master';
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
      <span className="block text-xs font-semibold text-white/80">
        顔写真画像 (任意)
      </span>
      <div className="flex items-center gap-3">
        {preview ? (
          <div className="relative size-12 rounded-full overflow-hidden border-2 border-accent-orange shrink-0">
            {/* biome-ignore lint/performance/noImgElement: preview */}
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={onClear}
              className="absolute inset-0 bg-black/60 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <div className="size-12 rounded-full bg-surface-l1 border border-dashed border-white/[0.08] flex items-center justify-center text-white/40 shrink-0">
            <ImageIcon className="size-5" />
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={onPhoto}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onPick}
          className="gap-2"
        >
          <Upload className="size-3.5" />
          <span>画像を選択</span>
        </Button>
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
  const { savePlayer } = usePlayerMasterMutations();
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
      await savePlayer(
        {
          playerId: pid,
          name: trimmed,
          defaultShirtNo: no,
          position: pos,
          season: s,
          teamName: team === 'home' ? (teamName ?? 'Chelsea') : 'Opponent',
          updatedAt: Date.now(),
        },
        photo,
      );
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogContent className="space-y-4 p-0">
        <div className="space-y-1.5">
          <span className="block text-xs font-semibold text-white/80">
            所属チーム
          </span>
          <div className="grid grid-cols-2 gap-2">
            {(['home', 'away'] as const).map((t) => (
              <Button
                key={t}
                type="button"
                variant={team === t ? 'primary' : 'outline'}
                onClick={() => setTeam(t)}
                size="sm"
              >
                {t === 'home' ? 'Chelsea (Home)' : 'Opponent (Away)'}
              </Button>
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
            className="text-xs font-semibold text-white/80"
          >
            シーズン
          </label>
          <NativeSelect
            id="new-player-season"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
          >
            {availableSeasons.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </NativeSelect>
        </div>

        <PhotoUpload
          preview={preview}
          fileRef={fileRef}
          onPick={() => fileRef.current?.click()}
          onPhoto={handlePhoto}
          onClear={clearPhoto}
        />
      </DialogContent>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          キャンセル
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={loading || !name.trim()}
          className="gap-1.5"
        >
          <Plus className="size-3.5" />
          <span>{loading ? '保存中...' : '選手を追加'}</span>
        </Button>
      </DialogFooter>
    </form>
  );
}

export function AddPlayerDialog(props: AddPlayerDialogProps) {
  if (!props.isOpen) return null;

  return (
    <Dialog open={props.isOpen} onClose={props.onClose} size="md">
      <DialogHeader title="新規選手を追加" onClose={props.onClose} />
      <AddPlayerForm {...props} />
    </Dialog>
  );
}
