'use client';

import { Lock, Unlock } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';

const DEFAULT_PITCH_TRANSFORM = {
  panX: 0,
  panY: 0,
  zoom: 1,
  tilt: 0,
  yaw: 90,
  isLocked: true,
} as const;

export function ToolbarPitchLock() {
  const project = useDocumentStore((s) => s.project);
  const dispatchSlide = useDocumentStore((s) => s.dispatchSlide);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);

  const activeSlide = selectDomainActiveSlide(
    project,
    activePhaseId,
    activeSlideId,
  );
  const pitchTransform = activeSlide?.pitchTransform ?? DEFAULT_PITCH_TRANSFORM;
  const isPitchLocked = pitchTransform.isLocked;

  const handleToggle = () => {
    if (!activeSlide) return;
    dispatchSlide(activePhaseId, activeSlideId, {
      type: 'UPDATE_SLIDE_META',
      patch: {
        pitchTransform: {
          ...pitchTransform,
          isLocked: !isPitchLocked,
        },
      },
    });
  };

  return (
    <IconButton
      onClick={handleToggle}
      isActive={isPitchLocked}
      variant="ghost"
      size="sm"
      title={
        isPitchLocked
          ? 'Pitch Lock: ON (Pan/Zoom locked)'
          : 'Pitch Lock: OFF (Click to lock)'
      }
      aria-label="Pitch Lock"
      className="shrink-0"
    >
      {isPitchLocked ? <Lock size={16} /> : <Unlock size={16} />}
    </IconButton>
  );
}
