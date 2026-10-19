import type React from 'react';
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

export const PlayerBasicFormFields: React.FC<PlayerBasicFormFieldsProps> = ({
  name,
  shirtNo,
  position,
  onNameChange,
  onShirtNoChange,
  onPositionChange,
  nameId = 'player-name',
  shirtNoId = 'player-shirt-no',
  positionId = 'player-position',
}) => {
  return (
    <div className="space-y-4">
      {/* Player Name */}
      <div className="space-y-1.5">
        <label
          htmlFor={nameId}
          className="text-xs font-semibold text-slate-300"
        >
          選手名 <span className="text-red-400">*</span>
        </label>
        <input
          id={nameId}
          type="text"
          required
          placeholder="例: Cole Palmer"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full h-10 bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Shirt Number & Position */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label
            htmlFor={shirtNoId}
            className="text-xs font-semibold text-slate-300"
          >
            背番号
          </label>
          <input
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
            className="w-full h-10 bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor={positionId}
            className="text-xs font-semibold text-slate-300"
          >
            ポジション
          </label>
          <select
            id={positionId}
            value={position}
            onChange={(e) =>
              onPositionChange(e.target.value as StandardPosition)
            }
            className="w-full h-10 bg-slate-950/80 border border-slate-700 rounded-xl px-3 text-xs font-medium text-slate-100 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
          >
            {POSITIONS.map((pos) => (
              <option
                key={pos.value}
                value={pos.value}
                className="bg-slate-900 text-slate-200"
              >
                {pos.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
