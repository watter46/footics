import type { FieldSettings } from './types';
import { getFieldBackgroundOption } from './utils/templates/background';

export const defaultPitchSettings: FieldSettings = {
  background: getFieldBackgroundOption('gradient', {
    fromColor: '#020141ff',
    toColor: '#0a0027ff',
    gradientType: 'linear',
    direction: 'to-b',
  }),
  shape: 'deep',
  court: 'full',
  line: {
    color: '#011f81ff',
    width: 3,
    opacity: 1,
  },
};

/**
 * ゲストユーザー用のデフォルトフィールド設定
 */
export const guestDefaultPitchSettings: FieldSettings = {
  background: getFieldBackgroundOption('gradient', {
    fromColor: '#020141ff',
    toColor: '#0a0027ff',
    gradientType: 'linear',
    direction: 'to-b',
  }),
  shape: 'deep',
  court: 'full',
  line: {
    color: '#011f81ff',
    width: 3,
    opacity: 1,
  },
};

/**
 * ゲストユーザーが使用できるテンプレートキーの一覧
 */
export const guestAllowedTemplateKeys = ['solid', 'gradient'] as const;
