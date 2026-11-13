'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  selectDomainActivePhaseSlides,
  selectDomainRenderSnapshot,
} from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
  useTacticalStoresContext,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { packPlayerPhotos } from '@/lib/tactical/export/share-payload';

interface ShareOptions {
  onError: (msg: string) => void;
}

export function useExportShare({ onError }: ShareOptions) {
  const { documentStore, sessionStore } = useTacticalStoresContext();
  const project = useDocumentStore((s) => s.project);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const slides = selectDomainActivePhaseSlides(project, activePhaseId);
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
      const currentProject = documentStore.getState().project;
      const {
        activePhaseId: currentPhaseId,
        activeSlideId: currentSlideId,
        teamVisibility,
      } = sessionStore.getState();
      const snapshot = selectDomainRenderSnapshot(
        currentProject,
        currentPhaseId,
        currentSlideId,
        teamVisibility,
      );
      const currentSlides = selectDomainActivePhaseSlides(
        currentProject,
        currentPhaseId,
      );
      const photos = await packPlayerPhotos(currentSlides);

      const payload = {
        version: 1,
        createdAt: Date.now(),
        title: project.title || 'Untitled',
        orientation:
          snapshot.aspectRatio === '9:16' ? 'vertical' : 'horizontal',
        aspectRatio: snapshot.aspectRatio,
        boundaryBox: snapshot.boundaryBox,
        pitchTransform: snapshot.pitchTransform,
        directorCamera: snapshot.directorCamera,
        screenBackground: snapshot.screenBackground ?? null,
        pitchAppearance: snapshot.pitchAppearance,
        teamVisibility: snapshot.teamVisibility,
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
