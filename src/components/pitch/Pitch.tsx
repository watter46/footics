import { memo } from 'react';
import type { PitchProps } from './types';
import { cn } from '@/lib/utils/cn';
import { getFieldShapeConfig } from './shapes';
import { PitchLines } from './PitchLines';
import { getFieldBackgroundStyle } from './templates/background';

export const Pitch = memo(({ settings, children, className }: PitchProps) => {
  const renderBackground = () => {
    const shapeConfig = getFieldShapeConfig(settings.shape);

    return (
      <div
        className={cn('relative w-full mx-auto h-full', shapeConfig.top)}
        style={{
          transform: shapeConfig.fieldTransform,
          transformStyle: 'preserve-3d',
          ...getFieldBackgroundStyle(settings.background),
        }}
      >
        <div className="relative w-full h-full">
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

      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <div className="relative z-10 w-full h-full pointer-events-auto">
          {children}
        </div>
      </div>
    </div>
  );
});

Pitch.displayName = 'Pitch';
