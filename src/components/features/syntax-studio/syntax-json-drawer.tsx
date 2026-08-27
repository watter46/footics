'use client';

import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileJson,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import type React from 'react';
import { useCallback, useState } from 'react';
import {
  type SyntaxIntegrationDraft,
  SyntaxIntegrationDraftSchema,
  type TuningDataset,
  TuningDatasetSchema,
} from '@/lib/types/syntax-integration';
import { sampleTuningDataset } from './sample-syntax-data';

interface SyntaxJsonDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyJson: (jsonString: string) => void;
  currentDataset: {
    aiDraft: SyntaxIntegrationDraft | null;
    humanGroundTruth: SyntaxIntegrationDraft | null;
    matchMetadata: {
      homeTeam: string;
      awayTeam: string;
      actionType: string;
    } | null;
    datasetId: string | null;
  };
}

interface ValidationError {
  path: string;
  message: string;
}

export const SyntaxJsonDrawer: React.FC<SyntaxJsonDrawerProps> = ({
  isOpen,
  onClose,
  onApplyJson,
  currentDataset,
}) => {
  const [jsonText, setJsonText] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    [],
  );
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);

  // Zod 検証関数
  const validateJson = useCallback((content: string): boolean => {
    if (!content.trim()) {
      setValidationErrors([{ path: 'root', message: 'JSON content is empty' }]);
      setIsValid(false);
      return false;
    }

    try {
      const parsed = JSON.parse(content);
      const isFullDataset = 'aiDraft' in parsed || 'humanGroundTruth' in parsed;

      if (isFullDataset) {
        const result = TuningDatasetSchema.safeParse(parsed);
        if (!result.success) {
          const errors: ValidationError[] = result.error.issues.map(
            (issue) => ({
              path: issue.path.join('.') || 'root',
              message: issue.message,
            }),
          );
          setValidationErrors(errors);
          setIsValid(false);
          return false;
        }
      } else {
        const result = SyntaxIntegrationDraftSchema.safeParse(parsed);
        if (!result.success) {
          const errors: ValidationError[] = result.error.issues.map(
            (issue) => ({
              path: issue.path.join('.') || 'root',
              message: issue.message,
            }),
          );
          setValidationErrors(errors);
          setIsValid(false);
          return false;
        }
      }

      setValidationErrors([]);
      setIsValid(true);
      return true;
    } catch (e) {
      setValidationErrors([
        {
          path: 'syntax',
          message: e instanceof Error ? e.message : 'Invalid JSON format',
        },
      ]);
      setIsValid(false);
      return false;
    }
  }, []);

  const handleApply = () => {
    if (validateJson(jsonText)) {
      onApplyJson(jsonText);
      onClose();
    }
  };

  const handleLoadSample = () => {
    const formatted = JSON.stringify(sampleTuningDataset, null, 2);
    setJsonText(formatted);
    validateJson(formatted);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonText(content);
      validateJson(content);
    };
    reader.readAsText(file);
  };

  const handleExportCurrent = () => {
    const exportData: TuningDataset = {
      datasetId: currentDataset.datasetId || `tuning_${Date.now()}`,
      timestamp: new Date().toISOString(),
      matchMetadata: currentDataset.matchMetadata || {
        homeTeam: 'Team A',
        awayTeam: 'Team B',
        actionType: 'Custom Tactical Play',
      },
      aiDraft: currentDataset.aiDraft || {
        version: '1.0.0',
        tacticalScenes: [],
      },
      humanGroundTruth: currentDataset.humanGroundTruth || {
        version: '1.0.0',
        tacticalScenes: [],
      },
    };

    const formatted = JSON.stringify(exportData, null, 2);
    const blob = new Blob([formatted], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportData.datasetId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyCurrent = () => {
    const exportData = {
      aiDraft: currentDataset.aiDraft,
      humanGroundTruth: currentDataset.humanGroundTruth,
      matchMetadata: currentDataset.matchMetadata,
      datasetId: currentDataset.datasetId,
    };
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close modal overlay"
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity cursor-default border-0 p-0 m-0"
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-xl bg-slate-900 border-l border-slate-800 h-full shadow-2xl flex flex-col z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <FileJson className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-semibold text-slate-100">
              Tactical Dataset JSON Drawer
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadSample}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-gradient-to-r from-cyan-900/60 to-blue-900/60 hover:from-cyan-800/80 hover:to-blue-800/80 text-cyan-200 border border-cyan-700/50 font-medium transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Load 4-Phase Sample
            </button>

            <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5" />
              Upload .json
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCurrent}
              className="inline-flex items-center gap-1 px-2 py-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
              title="Copy current dataset to clipboard"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </button>

            <button
              type="button"
              onClick={handleExportCurrent}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors"
              title="Download full TuningDataset"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
        </div>

        {/* JSON Editor Area */}
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
            onChange={(e) => {
              setJsonText(e.target.value);
              validateJson(e.target.value);
            }}
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

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!isValid}
            className="px-5 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-900/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Apply to Studio
          </button>
        </div>
      </div>
    </div>
  );
};
