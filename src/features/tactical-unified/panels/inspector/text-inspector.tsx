'use client';

import type { TextAnnotation } from '@/lib/types/tactical-unified';
import { ColorInput } from '../../components/common-color-input';
import { DeleteButton, RangeInput, Row } from './inspector-shared-controls';

export function TextInspector({
  text,
  slideId,
  updateText,
  onRemove,
}: {
  text: TextAnnotation;
  slideId: string;
  updateText: (s: string, id: string, p: Partial<TextAnnotation>) => void;
  onRemove: () => void;
}) {
  const up = (p: Partial<TextAnnotation>) => updateText(slideId, text.id, p);

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 text-white select-none custom-scrollbar">
      <Row label="Text Content">
        <textarea
          value={text.content}
          maxLength={200}
          onChange={(e) => up({ content: e.target.value })}
          className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
          rows={3}
        />
      </Row>
      <Row label="Color">
        <ColorInput value={text.color} onChange={(v) => up({ color: v })} />
      </Row>
      <RangeInput
        label="Font Size"
        value={text.fontSize}
        min={8}
        max={72}
        step={1}
        onChange={(v) => up({ fontSize: v })}
      />
      <Row label="Style">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => up({ bold: !text.bold })}
            className={`px-2 py-1 rounded text-xs font-bold ${text.bold ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/60'}`}
          >
            B
          </button>
          <button
            type="button"
            onClick={() => up({ italic: !text.italic })}
            className={`px-2 py-1 rounded text-xs italic ${text.italic ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/60'}`}
          >
            I
          </button>
        </div>
      </Row>
      <DeleteButton onClick={onRemove} label="Delete Text" />
    </div>
  );
}
