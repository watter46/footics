import { memo } from 'react';
import type { PitchProps } from './types';
import { cn } from '@/lib/utils/cn';
import { getFieldShapeConfig } from './utils/shapes/shape';
import { PitchLines } from './parts/PitchLines';
import { getFieldBackgroundStyle } from './utils/templates/background';

export const Pitch = memo(({ settings, children, className }: PitchProps) => {
  const renderBackground = () => {
    const shapeConfig = getFieldShapeConfig(settings.shape);

    return (
      <div
        className={cn('relative mx-auto h-full w-full', shapeConfig.top)}
        style={{
          transform: shapeConfig.fieldTransform,
          transformStyle: 'preserve-3d',
          ...getFieldBackgroundStyle(settings.background),
        }}
      >
        <div className="relative h-full w-full">
          <PitchLines court={settings.court} line={settings.line} />
        </div>
      </div>
    );
  };

  return (
    <div
      className={cn(
        'relative w-full',
        'max-w-xs',
        'aspect-4/5',
        'mx-auto',
        'overflow-visible',
        className
      )}
    >
      {renderBackground()}

      <div className="pointer-events-none absolute inset-0 h-full w-full">
        <div className="pointer-events-auto relative z-10 h-full w-full">
          {children}
        </div>
      </div>
    </div>
  );
});

Pitch.displayName = 'Pitch';
