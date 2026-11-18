'use client';

import { useEffect, useState } from 'react';
import { getSoccerBallImage } from '@/lib/tactical/shared/soccer-ball-svg';

export function useBallImage() {
  const [ballImage, setBallImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    getSoccerBallImage()
      .then((img) => setBallImage(img))
      .catch(() => {});
  }, []);

  return ballImage;
}
