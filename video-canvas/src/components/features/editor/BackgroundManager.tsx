import type React from 'react';
import { useEditor } from 'tldraw';
import { useBackground } from '@/hooks/useBackground';

/**
 * 背景画像の配置をリアクティブに管理するコンポーネント
 * Tldraw の子コンポーネントとして配置する必要がある
 */
export const BackgroundManager: React.FC = () => {
  const editor = useEditor();
  useBackground(editor);
  return null;
};
