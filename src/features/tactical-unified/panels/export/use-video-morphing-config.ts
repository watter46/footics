'use client';

import { useState } from 'react';
import {
  selectActivePhaseSlides,
  selectActiveSlide,
} from '@/features/tactical-unified/stores/tactical-unified-selectors';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';

export type TransitionSec = '1.0' | '1.5' | '2.0' | '3.0';
export type PauseSec = '0' | '0.5' | '1.0' | '2.0';
export type AnimationEasing = 'ease-in-out' | 'ease-out' | 'ease-in' | 'linear';

export function useVideoMorphingConfig() {
  const activeSlide = useTacticalUnifiedStore(selectActiveSlide);
  const slides = useTacticalUnifiedStore(selectActivePhaseSlides);
  const updateAllSlideTransitions = useTacticalUnifiedStore(
    (s) => s.updateAllSlideTransitions,
  );

  const [transitionSec, setTransitionSec] = useState<TransitionSec>(() => {
    const slide = activeSlide ?? slides[0];
    const sec = slide?.transitionDurationMs
      ? (slide.transitionDurationMs / 1000).toFixed(1)
      : '1.5';
    return ['1.0', '1.5', '2.0', '3.0'].includes(sec)
      ? (sec as TransitionSec)
      : '1.5';
  });

  const [pauseSec, setPauseSec] = useState<PauseSec>(() => {
    const slide = activeSlide ?? slides[0];
    const sec =
      slide?.pauseMs !== undefined
        ? (slide.pauseMs / 1000).toFixed(1).replace('.0', '')
        : '0.5';
    return ['0', '0.5', '1.0', '2.0'].includes(sec) ? (sec as PauseSec) : '0.5';
  });

  const [selectedEasing, setSelectedEasing] = useState<AnimationEasing>(() => {
    const slide = activeSlide ?? slides[0];
    return (slide?.easing as AnimationEasing) ?? 'ease-in-out';
  });

  const handleTransitionSecChange = (val: TransitionSec) => {
    setTransitionSec(val);
    const ms = Math.round(Number.parseFloat(val) * 1000);
    updateAllSlideTransitions({ transitionDurationMs: ms });
  };

  const handlePauseSecChange = (val: PauseSec) => {
    setPauseSec(val);
    const ms = Math.round(Number.parseFloat(val) * 1000);
    updateAllSlideTransitions({ pauseMs: ms });
  };

  const handleEasingChange = (val: AnimationEasing) => {
    setSelectedEasing(val);
    updateAllSlideTransitions({ easing: val });
  };

  return {
    transitionSec,
    pauseSec,
    selectedEasing,
    handleTransitionSecChange,
    handlePauseSecChange,
    handleEasingChange,
  };
}
