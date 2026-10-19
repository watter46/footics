import { useRef } from 'react';
import type { OnionSkinRefs } from '../types';

export function usePlayerGhostRefs() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ghostGroupRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ghostLineRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ghostMarkerGroupRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ghostCircleRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ghostTextRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ghostLabelRef = useRef<any>(null);

  const onionSkinRefs: OnionSkinRefs = {
    ghostGroup: ghostGroupRef.current,
    ghostLine: ghostLineRef.current,
    ghostMarkerGroup: ghostMarkerGroupRef.current,
    ghostCircle: ghostCircleRef.current,
    ghostText: ghostTextRef.current,
    ghostLabel: ghostLabelRef.current,
  };

  return {
    ghostGroupRef,
    ghostLineRef,
    ghostMarkerGroupRef,
    ghostCircleRef,
    ghostTextRef,
    ghostLabelRef,
    onionSkinRefs,
  };
}
