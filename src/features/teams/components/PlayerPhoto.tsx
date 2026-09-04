'use client';

import { Camera, Trash2, User } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface PlayerPhotoProps {
  photoBlob?: Blob;
  photoUrl?: string;
  name: string;
  shirtNo?: number;
  onPhotoUpload: (blob: Blob) => Promise<void>;
  onPhotoDelete?: () => Promise<void>;
  size?: 'sm' | 'md' | 'lg';
  editable?: boolean;
}

export const PlayerPhoto: React.FC<PlayerPhotoProps> = ({
  photoBlob,
  photoUrl,
  name,
  shirtNo,
  onPhotoUpload,
  onPhotoDelete,
  size = 'md',
  editable = true,
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (photoBlob) {
      const url = URL.createObjectURL(photoBlob);
      setBlobUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
    setBlobUrl(null);
  }, [photoBlob]);

  const displayUrl = blobUrl || photoUrl;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('画像サイズは5MB以下にしてください');
      return;
    }

    try {
      setIsUpdating(true);
      await onPhotoUpload(file);
      toast.success(`${name} の写真を更新しました`);
    } catch {
      toast.error('写真の保存に失敗しました');
    } finally {
      setIsUpdating(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onPhotoDelete) return;

    try {
      setIsUpdating(true);
      await onPhotoDelete();
      toast.success(`${name} の写真を削除しました`);
    } catch {
      toast.error('写真の削除に失敗しました');
    } finally {
      setIsUpdating(false);
    }
  };

  const sizeClasses = {
    sm: 'w-10 h-10 text-xs',
    md: 'w-16 h-16 text-sm',
    lg: 'w-20 h-20 text-base',
  }[size];

  return (
    <div
      className={`relative ${sizeClasses} rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-md flex items-center justify-center overflow-hidden shrink-0 group select-none`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {displayUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={displayUrl}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-slate-500">
          <User className="w-6 h-6 opacity-60" />
          {shirtNo && (
            <span className="text-[10px] font-mono font-bold text-slate-400 -mt-0.5">
              #{shirtNo}
            </span>
          )}
        </div>
      )}

      {/* Editable Overlay */}
      {editable && (
        <div
          className={`absolute inset-0 bg-black/65 backdrop-blur-[2px] flex items-center justify-center gap-1.5 transition-opacity duration-200 ${
            isHovered || isUpdating
              ? 'opacity-100'
              : 'opacity-0 pointer-events-none'
          }`}
        >
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => fileInputRef.current?.click()}
            title="写真を変更"
            className="p-1.5 rounded-lg bg-blue-600/80 hover:bg-blue-500 text-white transition-transform hover:scale-110 shadow-sm"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>

          {displayUrl && onPhotoDelete && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={handleDelete}
              title="写真を削除"
              className="p-1.5 rounded-lg bg-red-600/80 hover:bg-red-500 text-white transition-transform hover:scale-110 shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}
    </div>
  );
};
