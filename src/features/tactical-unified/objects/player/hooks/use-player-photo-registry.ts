'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { PlayerPhotoMap } from '@/features/tactical-unified/core';
import { getPlayerPhotoKey } from '@/lib/tactical/player-photo-key';
import {
  type PlayerPhotoTarget,
  resolvePlayerPhotoSources,
} from '@/lib/tactical/player-photo-resolver';

export interface PlayerPhotoRegistryInput {
  id: string;
  playerId?: string | number;
  name?: string;
  style?: { photoUrl?: string; insideContent?: string };
}

export function usePlayerPhotoRegistry(
  players: PlayerPhotoRegistryInput[],
): PlayerPhotoMap {
  const photoTargets = useMemo(() => {
    const seen = new Set<string>();
    const targets: PlayerPhotoTarget[] = [];
    for (const p of players) {
      if (p.style?.insideContent !== 'photo') continue;
      const key = getPlayerPhotoKey(p);
      if (seen.has(key)) continue;
      seen.add(key);
      targets.push({
        key,
        playerId: p.playerId,
        name: p.name,
        photoUrl: p.style?.photoUrl,
      });
    }
    return targets;
  }, [players]);

  const signature = useMemo(() => {
    return photoTargets
      .map((t) => `${t.key}|${t.name ?? ''}|${t.photoUrl ?? ''}`)
      .sort()
      .join(';');
  }, [photoTargets]);

  const targetsRef = useRef(photoTargets);
  targetsRef.current = photoTargets;

  const cacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [photos, setPhotos] = useState<PlayerPhotoMap>(() => cacheRef.current);
  const objectUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    const currentTargets = targetsRef.current;
    const unCachedTargets = currentTargets.filter(
      (t) => !cacheRef.current.has(t.key),
    );
    if (unCachedTargets.length === 0) return;

    let isCancelled = false;

    void (async () => {
      try {
        const sources = await resolvePlayerPhotoSources(unCachedTargets);
        if (isCancelled) return;

        const loadPromises: Promise<{
          key: string;
          img: HTMLImageElement;
        } | null>[] = [];

        for (const [key, source] of sources.entries()) {
          const url =
            source.kind === 'blob'
              ? (() => {
                  const u = URL.createObjectURL(source.blob);
                  objectUrlsRef.current.push(u);
                  return u;
                })()
              : source.url;

          loadPromises.push(
            new Promise((resolve) => {
              const img = new window.Image();
              img.onload = () => resolve({ key, img });
              img.onerror = () => resolve(null);
              img.src = url;
            }),
          );
        }

        const results = await Promise.allSettled(loadPromises);
        if (isCancelled) return;

        let hasNewImages = false;
        for (const res of results) {
          if (res.status === 'fulfilled' && res.value) {
            cacheRef.current.set(res.value.key, res.value.img);
            hasNewImages = true;
          }
        }

        if (hasNewImages) {
          setPhotos(new Map(cacheRef.current));
        }
      } catch {
        // 画像読込失敗時は既存表示を維持
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [signature]);

  useEffect(() => {
    return () => {
      for (const url of objectUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      objectUrlsRef.current = [];
    };
  }, []);

  return photos;
}
