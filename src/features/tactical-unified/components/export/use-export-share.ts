'use client';

import QRCode from 'qrcode';
import { useState } from 'react';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';

interface ShareOptions {
  onError: (msg: string) => void;
}

export function useExportShare({ onError }: ShareOptions) {
  const slides = useTacticalUnifiedStore((s) => s.project.slides);
  const [isCreatingShareLink, setIsCreatingShareLink] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  const createShareLink = async () => {
    if (slides.length <= 1) {
      onError('iPhone Export requires 2 or more scenes.');
      return;
    }
    setIsCreatingShareLink(true);
    setShareUrl(null);
    setQrCodeDataUrl(null);

    try {
      const { project } = useTacticalUnifiedStore.getState();
      const payload = {
        version: 1,
        createdAt: Date.now(),
        title: project.title || 'Untitled',
        orientation: project.aspectRatio === '9:16' ? 'vertical' : 'horizontal',
        teamVisibility: 'both',
        exportFps: 60,
        scenes: project.slides,
        photos: {},
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

      const qrCode = await QRCode.toDataURL(url, {
        width: 256,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
      setQrCodeDataUrl(qrCode);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsCreatingShareLink(false);
    }
  };

  const clearShareLink = () => {
    setShareUrl(null);
    setQrCodeDataUrl(null);
  };

  return {
    isCreatingShareLink,
    shareUrl,
    qrCodeDataUrl,
    createShareLink,
    clearShareLink,
  };
}
