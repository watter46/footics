'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/ui/patterns/error-state';

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
    <div className="flex h-screen w-screen items-center justify-center bg-[#0D0D0E] p-4 select-none">
      <ErrorState
        title="タクティカルキャンバスの読み込みに失敗しました"
        message="予期せぬエラーが発生しました。キャンバスを再読み込みするか、ダッシュボードへ戻ってください。"
        code={error.digest ? `エラーコード: ${error.digest}` : undefined}
        onRetry={() => reset()}
        retryLabel="再試行"
        backHref="/"
        backLabel="ダッシュボードへ戻る"
        className="max-w-md w-full shadow-2xl"
      />
    </div>
  );
}
