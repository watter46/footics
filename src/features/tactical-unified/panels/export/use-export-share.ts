'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  selectActivePhaseSlides,
  selectActiveSlide,
} from '@/features/tactical-unified/stores/tactical-unified-selectors';
import {
  useTacticalUnifiedStoreApi,
  useTacticalUnifiedStoreContext,
} from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { packPlayerPhotos } from '@/lib/tactical/export/share-payload';

interface ShareOptions {
  onError: (msg: string) => void;
}

export function useExportShare({ onError }: ShareOptions) {
  const storeApi = useTacticalUnifiedStoreApi();
  const slides = useTacticalUnifiedStoreContext(selectActivePhaseSlides);
  const [isCreatingShareLink, setIsCreatingShareLink] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const createShareLink = async () => {
    if (slides.length <= 1) {
      onError('iPhone Export requires 2 or more scenes.');
      return;
    }
    setIsCreatingShareLink(true);
    setShareUrl(null);

    try {
      const state = storeApi.getState();
      const { project } = state;
      const activeSlide = selectActiveSlide(state);
      const currentSlides = selectActivePhaseSlides(state);
      const photos = await packPlayerPhotos(currentSlides);

      const payload = {
        version: 1,
        createdAt: Date.now(),
        title: project.title || 'Untitled',
        orientation: project.aspectRatio === '9:16' ? 'vertical' : 'horizontal',
        aspectRatio: project.aspectRatio,
        boundaryBox: activeSlide?.boundaryBox,
        pitchTransform: activeSlide?.pitchTransform,
        teamVisibility: 'both',
        exportFps: 60,
        scenes: currentSlides,
        photos,
      };

      const res = await fetch('/api/tactical-export/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create share link');
      }

      const data = await res.json();
      const url = `${window.location.origin}${data.shareUrl}`;
      setShareUrl(url);
      toast.success(
        'iPhone（PWA）に送信しました。iPhoneの /export 画面で確認できます',
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsCreatingShareLink(false);
    }
  };

  const clearShareLink = () => {
    setShareUrl(null);
  };

  return {
    isCreatingShareLink,
    shareUrl,
    createShareLink,
    clearShareLink,
  };
}
