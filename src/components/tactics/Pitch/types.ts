import type { ReactNode } from 'react';
import type { FieldBackgroundOptions } from './utils/template-types';

/**
 * フィールド背景はtemplate-types.ts参照
 */

/**
 * フレーム形状テンプレート型
 */
export type FieldFrameTemplate = {
  key: string;
  fieldTransform?: string;
  fieldHeight: string;
  description: string;
  top: string;
};

/**
 * フレーム形状種別
 */
export type FieldShapeOptions = 'rect' | 'tilted' | 'deep';

/**
 * コートタイプ種別
 */
export type FieldCourtOptions = 'full' | 'half';

/**
 * ラインオプション
 */
export interface FieldLineOptions {
  color: string;
  width: number;
  opacity: number;
}

/**
 * フィールド全体の設定オブジェクト
 */
export interface FieldSettings {
  background: FieldBackgroundOptions;
  shape: FieldShapeOptions;
  court: FieldCourtOptions;
  line: FieldLineOptions;
}

/**
 * Pitchコンポーネントのprops型定義
 */
export interface PitchProps {
  settings: FieldSettings;
  children?: ReactNode;
  className?: string;
}
