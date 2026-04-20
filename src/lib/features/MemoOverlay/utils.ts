/**
 * 時間文字列のパース (例: "0130" -> "1:30")
 */
export function parseTimeStr(timeStr: string): {
  display: string;
  isInvalid: boolean;
  empty: boolean;
} {
  const digits = timeStr.replace(/\D/g, '');
  if (digits.length === 0)
    return { display: '--:--', isInvalid: false, empty: true };

  let m = '0';
  let s = '00';
  if (digits.length <= 2) {
    s = digits.padStart(2, '0');
  } else {
    m = digits.slice(0, -2);
    s = digits.slice(-2);
  }
  return {
    display: `${m}:${s}`,
    isInvalid: parseInt(s, 10) >= 60,
    empty: false,
  };
}

/**
 * 時間文字列を分と秒に変換する
 */
export function timeStrToMinuteSecond(timeStr: string): {
  minute: number;
  second: number;
} {
  const digits = timeStr.replace(/\D/g, '').padStart(2, '0');
  const second = parseInt(digits.slice(-2), 10);
  const minute = parseInt(digits.slice(0, -2) || '0', 10);
  return { minute, second };
}
