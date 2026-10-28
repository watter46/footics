import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/select';
import type { StandardPosition } from '@/types';

export const POSITIONS: Array<{ value: StandardPosition; label: string }> = [
  { value: 'GK', label: 'GK (Goalkeeper)' },
  { value: 'DF', label: 'DF (Defender)' },
  { value: 'MID', label: 'MID (Midfielder)' },
  { value: 'FW', label: 'FW (Forward)' },
  { value: 'Other', label: 'Other (その他 / 未設定)' },
];

export interface PlayerBasicFormFieldsProps {
  name: string;
  shirtNo: number | '';
  position: StandardPosition;
  onNameChange: (val: string) => void;
  onShirtNoChange: (val: number | '') => void;
  onPositionChange: (val: StandardPosition) => void;
  nameId?: string;
  shirtNoId?: string;
  positionId?: string;
}

export function PlayerBasicFormFields({
  name,
  shirtNo,
  position,
  onNameChange,
  onShirtNoChange,
  onPositionChange,
  nameId = 'player-name',
  shirtNoId = 'player-shirt-no',
  positionId = 'player-position',
}: PlayerBasicFormFieldsProps) {
  return (
    <div className="space-y-4">
      {/* Player Name */}
      <div className="space-y-1.5">
        <label htmlFor={nameId} className="text-xs font-semibold text-white/80">
          選手名 <span className="text-red-400">*</span>
        </label>
        <Input
          id={nameId}
          type="text"
          required
          placeholder="例: Cole Palmer"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
        />
      </div>

      {/* Shirt Number & Position */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label
            htmlFor={shirtNoId}
            className="text-xs font-semibold text-white/80"
          >
            背番号
          </label>
          <Input
            id={shirtNoId}
            type="number"
            min="1"
            max="99"
            placeholder="例: 20"
            value={shirtNo}
            onChange={(e) =>
              onShirtNoChange(
                e.target.value === ''
                  ? ''
                  : Number.parseInt(e.target.value, 10),
              )
            }
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor={positionId}
            className="text-xs font-semibold text-white/80"
          >
            ポジション
          </label>
          <NativeSelect
            id={positionId}
            value={position}
            onChange={(e) =>
              onPositionChange(e.target.value as StandardPosition)
            }
          >
            {POSITIONS.map((pos) => (
              <option key={pos.value} value={pos.value}>
                {pos.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
    </div>
  );
}
