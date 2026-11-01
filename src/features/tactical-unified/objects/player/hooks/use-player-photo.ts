'use client';

import { useEffect, useState } from 'react';
import { findPlayerPhotoByName, getPlayerPhoto } from '@/lib/db/queries';

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
      // 1. playerId があれば IndexedDB (db.player_photos) から写真を取得
      if (playerId) {
        const idNum = Number(playerId);
        if (!Number.isNaN(idNum)) {
          try {
            const photoRecord = await getPlayerPhoto(idNum);
            if (isCancelled) return;
            if (photoRecord?.photoBlob) {
              const url = URL.createObjectURL(photoRecord.photoBlob);
              objectUrlToRevoke = url;
              loadImage(url);
              return;
            }
          } catch {
            // DB取得失敗時は photoUrl / playerName へのフォールバックを試みる
          }
        }
      }

      // 2. playerId がない、またはDBに写真がない場合、photoUrl を使用
      if (photoUrl) {
        loadImage(photoUrl);
        return;
      }

      // 3. photoUrl もない場合、playerName があれば同名選手を検索してフォールバック
      if (playerName) {
        try {
          const blob = await findPlayerPhotoByName(playerName);
          if (isCancelled) return;
          if (blob) {
            const url = URL.createObjectURL(blob);
            objectUrlToRevoke = url;
            loadImage(url);
            return;
          }
        } catch {
          // 検索失敗時は何もしない
        }
      }

      setImage(null);
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
