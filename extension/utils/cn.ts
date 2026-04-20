import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind CSS のクラス名を結合し、重複を解消するためのユーティリティ関数。
 *
 * @param inputs - 結合したいクラス名のリスト
 * @returns 結合・最適化されたクラス名の文字列
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
