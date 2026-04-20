import type React from 'react';
import { useEffect } from 'react';
import { useEditor } from 'tldraw';
import { useExport } from '@/hooks/useExport';
import { useEditorStore } from '@/stores/useEditorStore';

/**
 * エディタのイベント（コピー・保存）を監視し、対応する処理を実行するコンポーネント
 */
export const EditorEventsListener: React.FC = () => {
  const editor = useEditor();
  const triggerCopy = useEditorStore((state) => state.triggerCopy);
  const triggerSave = useEditorStore((state) => state.triggerSave);
  const { performExport } = useExport();

  useEffect(() => {
    if (triggerCopy > 0) {
      performExport(editor, 'copy');
    }
  }, [triggerCopy, editor, performExport]);

  useEffect(() => {
    if (triggerSave > 0) {
      performExport(editor, 'save');
    }
  }, [triggerSave, editor, performExport]);

  return null;
};
