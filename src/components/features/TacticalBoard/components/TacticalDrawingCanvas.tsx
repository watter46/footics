'use client';

import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DefaultColorStyle,
  DefaultDashStyle,
  DefaultFillStyle,
  DefaultStylePanel,
  type Editor,
  type TLUiStylePanelProps,
  Tldraw,
  useEditor,
  useValue,
} from 'tldraw';
import 'tldraw/tldraw.css';

export type TacticalDrawTool =
  | 'select'
  | 'arrow_solid'
  | 'arrow_dash'
  | 'zone_circle'
  | 'eraser';

interface TacticalDrawingCanvasProps {
  matchId: string;
  activeTool: TacticalDrawTool;
  onClearRef?: (clearFn: () => void) => void;
  onEditorReady?: (editor: Editor) => void;
}

/**
 * オブジェクト選択時のみ、ピッチ右横の Portal (#tactical-floating-palette) にマウントする StylePanel
 */
const FloatingStylePanel: React.FC<TLUiStylePanelProps> = (props) => {
  const editor = useEditor();
  const hasSelection = useValue(
    'hasSelection',
    () => editor.getSelectedShapeIds().length > 0,
    [editor],
  );

  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.getElementById('tactical-floating-palette'));
  }, []);

  // オブジェクト未選択または Portal 先が無い時は非表示
  if (!hasSelection || !portalTarget) return null;

  return createPortal(
    <div className="tl-container tdc-floating-palette">
      <DefaultStylePanel {...props} />
    </div>,
    portalTarget,
  );
};

export const TacticalDrawingCanvas: React.FC<TacticalDrawingCanvasProps> = ({
  matchId: _matchId,
  activeTool,
  onClearRef,
  onEditorReady,
}) => {
  const editorRef = useRef<Editor | null>(null);

  const handleMount = (editor: Editor) => {
    editorRef.current = editor;
    editor.updateInstanceState({ isReadonly: false });
    editor.setCameraOptions({ isLocked: true });
    editor.user.updateUserPreferences({ isSnapMode: true });

    if (onClearRef) {
      onClearRef(() => {
        const shapes = Array.from(editor.getCurrentPageShapeIds().values());
        if (shapes.length > 0) {
          editor.deleteShapes(shapes);
        }
      });
    }

    if (onEditorReady) {
      onEditorReady(editor);
    }
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    switch (activeTool) {
      case 'select':
        editor.setCurrentTool('select');
        break;
      case 'arrow_solid':
        editor.setCurrentTool('arrow');
        editor.setStyleForNextShapes(DefaultColorStyle, 'white');
        editor.setStyleForNextShapes(DefaultDashStyle, 'solid');
        break;
      case 'arrow_dash':
        editor.setCurrentTool('arrow');
        editor.setStyleForNextShapes(DefaultColorStyle, 'white');
        editor.setStyleForNextShapes(DefaultDashStyle, 'dashed');
        break;
      case 'zone_circle':
        editor.setCurrentTool('geo');
        editor.setStyleForNextShapes(DefaultColorStyle, 'red');
        editor.setStyleForNextShapes(DefaultFillStyle, 'semi');
        break;
      case 'eraser':
        editor.setCurrentTool('eraser');
        break;
      default:
        editor.setCurrentTool('select');
    }
  }, [activeTool]);

  return (
    <>
      {/*
       * tldraw 専用グローバルスタイル
       * ─────────────────────────────────────────────
       * - 背景透明化・ウォーターマーク非表示・不要なメニュー非表示
       * - フローティングパレット用のスタイリング
       */}
      <style>{`
        /* 背景透明化 */
        .tdc-canvas .tl-container,
        .tdc-canvas .tl-canvas {
          background-color: transparent !important;
          --tl-color-background: transparent !important;
        }
        .tdc-canvas .tl-background {
          display: none !important;
        }

        /* ウォーターマーク非表示 */
        .tdc-canvas .tl-watermark_SEE-LICENSE,
        .tdc-canvas [class*="watermark"] {
          display: none !important;
        }

        /* 不要なメニュー・ナビゲーション非表示 */
        .tdc-canvas .tlui-menu-zone,
        .tdc-canvas .tlui-quick-actions,
        .tdc-canvas .tlui-navigation-zone,
        .tdc-canvas .tlui-back-button,
        .tdc-canvas .tlui-help-menu {
          display: none !important;
        }

        /* ピッチ右横のフローティングパレットのスタイリング */
        .tdc-floating-palette {
          position: relative;
          width: auto;
          height: auto;
          pointer-events: auto !important;
        }

        .tdc-floating-palette .tlui-style-panel,
        .tdc-floating-palette .tlui-style-panel__wrapper {
          margin: 0 !important;
          background-color: #1e2028 !important;
          background: #1e2028 !important;
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.1) !important;
          border-radius: 12px !important;
        }

        /* 選択中（アクティブ）アイテムの洗練された控えめなハイライト */
        .tdc-floating-palette .tlui-button[data-isactive='true'],
        .tdc-floating-palette .tlui-button[data-state='on'] {
          background: rgba(255, 255, 255, 0.12) !important;
          border-radius: 6px !important;
          position: relative !important;
        }

        .tdc-floating-palette .tlui-button[data-isactive='true']::after,
        .tdc-floating-palette .tlui-button[data-state='on']::after {
          content: '' !important;
          position: absolute !important;
          inset: 3px !important;
          border: 1.5px solid rgba(255, 255, 255, 0.75) !important; /* 上品で控えめなホワイト枠 */
          border-radius: 4px !important;
          opacity: 1 !important;
          pointer-events: none !important;
          background: transparent !important;
          box-shadow: none !important;
        }

        /* カラーボタン選択時の控えめなリング・スケール */
        .tdc-floating-palette [data-testid^='style.color.'][data-isactive='true'],
        .tdc-floating-palette [data-testid^='style.color.'][data-state='on'] {
          transform: scale(1.06) !important;
          transition: transform 0.12s ease !important;
          z-index: 2 !important;
        }

        .tdc-floating-palette [data-testid^='style.color.'][data-isactive='true']::after,
        .tdc-floating-palette [data-testid^='style.color.'][data-state='on']::after {
          inset: -2px !important;
          border: 1.5px solid #ffffff !important;
          border-radius: 50% !important;
        }

        /* 不透明度（Opacity）スライダーの視認性・操作性改善 */
        .tdc-floating-palette .tlui-slider__container {
          padding: 8px 12px 10px 12px !important;
        }

        .tdc-floating-palette .tlui-slider__track {
          height: 32px !important;
          display: flex !important;
          align-items: center !important;
        }

        .tdc-floating-palette .tlui-slider__track::after {
          height: 4px !important;
          background-color: rgba(255, 255, 255, 0.22) !important; /* レール背景を視認しやすく */
          border-radius: 4px !important;
        }

        .tdc-floating-palette .tlui-slider__range {
          height: 4px !important;
          background-color: #60a5fa !important; /* フィルバーをブルーで明確化 */
          border-radius: 4px !important;
        }

        .tdc-floating-palette .tlui-slider__thumb {
          width: 14px !important;
          height: 14px !important;
          background-color: #ffffff !important; /* 白いつまみで明瞭化 */
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.6) !important;
          border-radius: 50% !important;
          border: none !important;
          top: 0px !important;
        }

        .tdc-floating-palette .tlui-slider__thumb:active {
          box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.4), 0 2px 5px rgba(0, 0, 0, 0.7) !important;
        }
      `}</style>

      {/*
       * tldraw は z-10（マーカー層より背面）
       * マーカー層のコンテナが pointer-events-none なので、
       * tldraw のオブジェクト描画・選択・パレット操作はすべて自然に行えます。
       */}
      <div className="tdc-canvas absolute inset-0 w-full h-full z-10">
        <Tldraw
          inferDarkMode
          onMount={handleMount}
          components={{
            StylePanel: FloatingStylePanel,
            Toolbar: null,
            HelpMenu: null,
            MainMenu: null,
            PageMenu: null,
            NavigationPanel: null,
            DebugPanel: null,
            SharePanel: null,
            TopPanel: null,
            QuickActions: null,
            ActionsMenu: null,
          }}
        />
      </div>
    </>
  );
};
