/**
 * data-management-helpers.ts
 *
 * バックアップ・インポート・エクスポート処理におけるデータ変換・型ガード・補助関数
 */

export function isChelseaTeam(name?: string): boolean {
  if (!name) return false;
  return name.toLowerCase().includes('chelsea');
}

/**
 * 写真Blobから拡張子を特定
 */
export function getPhotoExtension(blob?: Blob | null): string {
  if (!blob) return 'png';
  const type = typeof blob.type === 'string' ? blob.type : '';
  if (type.includes('jpeg') || type.includes('jpg')) return 'jpg';
  if (type.includes('webp')) return 'webp';
  if (type.includes('svg')) return 'svg';
  return 'png';
}

/**
 * ファイル名からMIMEタイプを特定
 */
export function getMimeTypeFromFileName(fileName: string): string {
  if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
    return 'image/jpeg';
  }
  if (fileName.endsWith('.webp')) return 'image/webp';
  if (fileName.endsWith('.svg')) return 'image/svg+xml';
  return 'image/png';
}

/**
 * オブジェクトが有効な Blob であるか判定
 */
export function isValidPhotoBlob(blob: unknown): blob is Blob {
  if (!blob || typeof blob !== 'object') return false;
  if (blob instanceof Blob) {
    return blob.size > 0;
  }
  const duck = blob as {
    size?: unknown;
    type?: unknown;
    arrayBuffer?: unknown;
  };
  return (
    typeof duck.size === 'number' &&
    duck.size > 0 &&
    typeof duck.arrayBuffer === 'function'
  );
}

/**
 * レコードオブジェクトであるか判定
 */
export function isValidBackupRecord(
  val: unknown,
): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

/**
 * Blob または Uint8Array から Uint8Array を安全に抽出
 */
export async function toUint8Array(
  source: Blob | Uint8Array,
): Promise<Uint8Array> {
  if (source instanceof Uint8Array) {
    return source;
  }
  const buffer = await source.arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * 入力ファイル (File | Blob | Uint8Array) を Uint8Array に変換
 */
export async function readInputAsUint8Array(
  input: File | Blob | Uint8Array,
): Promise<Uint8Array> {
  if (input instanceof Uint8Array) {
    return input;
  }
  const buffer = await input.arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Uint8Array から安全に Blob を生成
 */
export function uint8ArrayToBlob(
  data: Uint8Array,
  mimeType: string = 'application/octet-stream',
): Blob {
  return new Blob([data.buffer as ArrayBuffer], { type: mimeType });
}

/**
 * ZIP 内から写真 Blob を探索・復元
 */
export function findPhotoBlob(
  unzipped: Record<string, Uint8Array>,
  id: string,
  fileName?: string,
): Blob | undefined {
  if (fileName) {
    const bytes = unzipped[`photos/${fileName}`];
    if (bytes) {
      return uint8ArrayToBlob(bytes, getMimeTypeFromFileName(fileName));
    }
  }

  const safeId = encodeURIComponent(id).replace(/%/g, '_');
  const candidatePaths = [
    `photos/${safeId}.png`,
    `photos/${safeId}.jpg`,
    `photos/${safeId}.webp`,
    `photos/${safeId}`,
    `photos/${id}.png`,
    `photos/${id}.jpg`,
    `photos/${id}.webp`,
    `photos/${id}`,
  ];

  for (const path of candidatePaths) {
    const bytes = unzipped[path];
    if (bytes) {
      return uint8ArrayToBlob(bytes, getMimeTypeFromFileName(path));
    }
  }

  return undefined;
}
