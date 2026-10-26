'use client';

import { AlertCircle, CheckCircle2 } from 'lucide-react';

export interface ValidationError {
  path: string;
  message: string;
}

export interface SyntaxJsonEditorContentProps {
  jsonText: string;
  onChangeJsonText: (val: string) => void;
  isValid: boolean | null;
  validationErrors: ValidationError[];
}

export function SyntaxJsonEditorContent({
  jsonText,
  onChangeJsonText,
  isValid,
  validationErrors,
}: SyntaxJsonEditorContentProps) {
  return (
    <div className="flex-1 p-5 flex flex-col min-h-0">
      <label
        htmlFor="syntax-json-input"
        className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between"
      >
        <span>JSON Payload (SyntaxIntegrationDraft or TuningDataset)</span>
        <span className="font-mono text-[11px] text-slate-500">
          Zod Verified
        </span>
      </label>

      <textarea
        id="syntax-json-input"
        value={jsonText}
        onChange={(e) => onChangeJsonText(e.target.value)}
        placeholder='Paste your Tactical JSON payload here or click "Load 4-Phase Sample"...'
        className="flex-1 w-full bg-slate-950 font-mono text-xs text-slate-200 p-3 rounded-lg border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none resize-none overflow-y-auto leading-relaxed"
        spellCheck={false}
      />

      {/* Validation Status */}
      <div className="mt-3">
        {isValid === true && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Valid JSON Schema verified by Zod</span>
          </div>
        )}

        {isValid === false && (
          <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs max-h-32 overflow-y-auto">
            <div className="flex items-center gap-1.5 font-semibold mb-1">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>Validation Errors ({validationErrors.length})</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] font-mono">
              {validationErrors.map((err) => (
                <li key={`err-${err.path}-${err.message.slice(0, 15)}`}>
                  <span className="text-rose-200">{err.path}:</span>{' '}
                  {err.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
