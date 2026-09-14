'use client';

import PilotCanvas from '@/components/features/tactical-unified/canvas/PilotCanvas';
import { Button } from '@/components/ui/button';
import { usePilotStore } from '@/stores/pilotStore';

export function PilotFeature() {
  const showGrid = usePilotStore((state) => state.showGrid);
  const toggleGrid = usePilotStore((state) => state.toggleGrid);

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <div className="flex items-center gap-3">
        <Button
          onClick={toggleGrid}
          variant={showGrid ? 'default' : 'outline'}
          aria-pressed={showGrid}
        >
          グリッド切り替え
        </Button>
        <span className="text-sm text-muted-foreground">
          グリッド表示: {showGrid ? 'ON' : 'OFF'}
        </span>
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-background shadow-sm">
        <PilotCanvas />
      </div>
    </div>
  );
}

export default PilotFeature;
