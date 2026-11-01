/**
 * data-management.ts
 *
 * 全データバックアップ（ZIPエクスポート）およびリストア（ZIPインポート）の統合ファサード
 */

export { exportAllDataZip } from './data-management-export';
export {
  type ImportZipResult,
  importAllDataZip,
} from './data-management-import';
