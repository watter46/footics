'use client';

/**
 * use-player-photo.ts
 * Custom hook: 選手顔写真の非同期ロード (URL / IndexedDB Blob)
 */

import { useEffect, useState } from 'react';
import { getPlayerMaster } from '@/lib/db/queries';

interface UsePlayerPhotoOptions {
  insideContent: string;
  photoUrl?: string;
  playerId?: string;
}

export function usePlayerPhoto({
  insideContent,
  photoUrl,
  playerId,
}: UsePlayerPhotoOptions): HTMLImageElement | null {
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    let localBlobUrl: string | null = null;

    if (insideContent !== 'photo') {
      setLoadedImage(null);
      return () => {
        isMounted = false;
      };
    }

    if (photoUrl) {
      const img = new window.Image();
      img.src = photoUrl;
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        if (isMounted) setLoadedImage(img);
      };
      img.onerror = () => {
        if (isMounted) setLoadedImage(null);
      };
    } else if (playerId && !Number.isNaN(Number(playerId))) {
      getPlayerMaster(Number(playerId)).then((master) => {
        if (!isMounted) return;
        if (master?.photoBlob) {
          localBlobUrl = URL.createObjectURL(master.photoBlob);
          const img = new window.Image();
          img.src = localBlobUrl;
          img.onload = () => {
            if (isMounted) setLoadedImage(img);
          };
          img.onerror = () => {
            if (isMounted) setLoadedImage(null);
          };
        } else if (master?.photoUrl) {
          const img = new window.Image();
          img.src = master.photoUrl;
          img.onload = () => {
            if (isMounted) setLoadedImage(img);
          };
          img.onerror = () => {
            if (isMounted) setLoadedImage(null);
          };
        }
      });
    } else {
      setLoadedImage(null);
    }

    return () => {
      isMounted = false;
      if (localBlobUrl) {
        URL.revokeObjectURL(localBlobUrl);
      }
    };
  }, [insideContent, photoUrl, playerId]);

  return loadedImage;
}
