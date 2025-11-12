import {
  PitchLines,
  type FieldCourtOptions,
  type FieldLineOptions,
  type FieldShapeOptions,
  type SolidOption,
} from '@/components/pitch';
import { cn } from '@/lib/utils/cn';
import { getFieldShapeConfig } from '../../shapes/shape';

interface SolidFieldProps {
  background: SolidOption;
  shape: FieldShapeOptions;
  court: FieldCourtOptions;
  line: FieldLineOptions;
}

export function SolidField({
  background,
  shape,
  court,
  line,
}: SolidFieldProps) {
  const shapeConfig = getFieldShapeConfig(shape);

  return (
    <div
      className={cn('relative mx-auto h-full w-full')}
      style={{
        transform: shapeConfig.fieldTransform,
        transformStyle: 'preserve-3d',
        backgroundColor: background.color,
        opacity: background.opacity,
        top: shapeConfig.top,
      }}
    >
      <div className="relative h-full w-full p-4">
        <PitchLines court={court} line={line} />
      </div>
    </div>
  );
}
