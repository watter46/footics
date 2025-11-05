export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
    .toString()
    .padStart(2, '0')}`;
};

export const getPhaseDisplay = (
  phase:
    | 'first-half'
    | 'second-half'
    | 'extra-first'
    | 'extra-second'
    | 'penalty'
): string => {
  switch (phase) {
    case 'first-half':
      return '1st';
    case 'second-half':
      return '2nd';
    case 'extra-first':
      return 'ET 1st';
    case 'extra-second':
      return 'ET 2nd';
    case 'penalty':
      return 'PK';
    default:
      return '';
  }
};

export const calculateDisplayTime = (
  elapsedSeconds: number,
  _phase:
    | 'first-half'
    | 'second-half'
    | 'extra-first'
    | 'extra-second'
    | 'penalty',
  _stoppageSeconds: number
): { main: string; stoppage: string | null } => {
  void _phase;
  void _stoppageSeconds;
  // タイマーは常に経過時間をそのまま表示（+表記なし）
  return { main: formatTime(elapsedSeconds), stoppage: null };
};

/**
 * MM:SS形式の時間文字列を秒数にパース
 * @param timeString - "05:30" などの形式
 * @returns 秒数、または無効な入力の場合はnull
 */
export const parseTimeInput = (timeString: string): number | null => {
  const trimmed = timeString.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);

  if (seconds >= 60) {
    return null;
  }

  return minutes * 60 + seconds;
};

/**
 * 秒数をMM:SS形式の文字列に変換（タイムライン表示用）
 * @param seconds - 秒数
 * @returns "05:30" などの形式
 */
export const formatDisplayTime = (seconds: number): string => {
  return formatTime(seconds);
};
