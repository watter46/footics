'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export interface TacticalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function TacticalError({ error, reset }: TacticalErrorProps) {
  useEffect(() => {
    // コンソールに詳細を出力してデバッグ支援
    console.error('[TacticalError]', error);
  }, [error]);

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#0a0a0a] px-4 text-center select-none">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-950/40 border border-red-800/50 text-red-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <h1 className="mb-2 text-xl font-semibold text-zinc-100">
        タクティカルキャンバスの読み込みに失敗しました
      </h1>
      <p className="mb-6 max-w-md text-sm text-zinc-400">
        予期せぬエラーが発生しました。キャンバスを再読み込みするか、ダッシュボードへ戻ってください。
      </p>

      {error.digest && (
        <div className="mb-6 rounded bg-zinc-900 px-3 py-1 text-xs font-mono text-zinc-500 border border-zinc-800">
          エラーコード: {error.digest}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-200 active:scale-95"
        >
          再試行
        </button>
        <Link
          href="/"
          className="rounded-md border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-zinc-100 active:scale-95"
        >
          ダッシュボードへ戻る
        </Link>
      </div>
    </div>
  );
}
