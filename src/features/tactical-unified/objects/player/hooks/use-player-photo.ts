'use client';

import { useEffect, useState } from 'react';
import { resolvePlayerPhotoSources } from '@/lib/tactical/player-photo-resolver';

/**
 * 選手の顔写真 (HTMLImageElement) を取得・ロードするフック
 * - IndexedDB (db.player_photos) から写真 Blob を取得、または外部 URL を利用
 * - playerId で写真が見つからない場合、playerName で同名選手を検索してフォールバック
 * - URL.createObjectURL のライフサイクルを管理し、アンマウント・再取得時に確実に revoke (RAII)
 */
export function usePlayerPhoto(
  playerId?: string,
  photoUrl?: string,
  enabled = true,
  playerName?: string,
): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!enabled || (!playerId && !photoUrl && !playerName)) {
      setImage(null);
      return;
    }

    let isCancelled = false;
    let objectUrlToRevoke: string | null = null;

    const loadImage = (src: string) => {
      if (typeof window === 'undefined' || typeof Image === 'undefined') {
        return;
      }
      const img = new window.Image();
      img.onload = () => {
        if (!isCancelled) {
          setImage(img);
        }
      };
      img.onerror = () => {
        if (!isCancelled) {
          setImage(null);
        }
      };
      img.src = src;
    };

    const fetchAndLoad = async () => {
      try {
        const sources = await resolvePlayerPhotoSources([
          {
            key: 'self',
            playerId,
            name: playerName,
            photoUrl,
          },
        ]);
        if (isCancelled) return;

        const source = sources.get('self');
        if (!source) {
          setImage(null);
          return;
        }

        if (source.kind === 'blob') {
          const url = URL.createObjectURL(source.blob);
          objectUrlToRevoke = url;
          loadImage(url);
        } else {
          loadImage(source.url);
        }
      } catch {
        if (!isCancelled) {
          setImage(null);
        }
      }
    };

    fetchAndLoad();

    return () => {
      isCancelled = true;
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
    };
  }, [playerId, photoUrl, enabled, playerName]);

  return image;
}
