/**
 * フィールドフレーム定義
 * 長方形・台形・カスタム形状を管理
 */

import type { FieldShapeOptions } from '../types';

export type FieldShapeConfig = {
  key: 'rect' | 'tilted' | 'deep';
  fieldTransform?: string;
  top: string;
};

/**
 * フレーム形状定義
 */
const fieldShapes: Record<FieldShapeOptions, FieldShapeConfig> = {
  rect: {
    key: 'rect',
    fieldTransform: undefined,
    top: '',
  },
  tilted: {
    key: 'tilted',
    fieldTransform: 'perspective(600px) rotateX(8deg)',
    top: 'top-[-2%]',
  },
  deep: {
    key: 'deep',
    fieldTransform: 'perspective(800px) rotateX(25deg)',
    top: 'top-[-5%] md:top-[-7%] lg:top-[-9%]',
  },
};

/**
 * ヘルパー関数: フレームを取得
 */
export function getFieldShapeConfig(key: FieldShapeOptions): FieldShapeConfig {
  return fieldShapes[key];
}

export function getShapeKeys(): FieldShapeOptions[] {
  return Object.keys(fieldShapes) as FieldShapeOptions[];
}
