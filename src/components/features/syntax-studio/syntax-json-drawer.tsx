'use client';

import { FileJson, X } from 'lucide-react';
import { type ChangeEvent, useCallback, useState } from 'react';
import {
  type SyntaxIntegrationDraft,
  SyntaxIntegrationDraftSchema,
  type TuningDataset,
  TuningDatasetSchema,
} from '@/lib/types/syntax-integration';
import { sampleTuningDataset } from './sample-syntax-data';
import { SyntaxJsonDrawerFooter } from './syntax-json-drawer-footer';
import { SyntaxJsonDrawerToolbar } from './syntax-json-drawer-toolbar';
import {
  SyntaxJsonEditorContent,
  type ValidationError,
} from './syntax-json-editor-content';

export interface SyntaxJsonDrawerProps {
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

export function SyntaxJsonDrawer({
  isOpen,
  onClose,
  onApplyJson,
  currentDataset,
}: SyntaxJsonDrawerProps) {
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

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
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

  const handleTextChange = (value: string) => {
    setJsonText(value);
    validateJson(value);
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
        <SyntaxJsonDrawerToolbar
          copied={copied}
          onLoadSample={handleLoadSample}
          onFileUpload={handleFileUpload}
          onCopyCurrent={handleCopyCurrent}
          onExportCurrent={handleExportCurrent}
        />

        {/* JSON Editor Area */}
        <SyntaxJsonEditorContent
          jsonText={jsonText}
          onChangeJsonText={handleTextChange}
          isValid={isValid}
          validationErrors={validationErrors}
        />

        {/* Footer */}
        <SyntaxJsonDrawerFooter
          isValid={isValid}
          onClose={onClose}
          onApply={handleApply}
        />
      </div>
    </div>
  );
}
