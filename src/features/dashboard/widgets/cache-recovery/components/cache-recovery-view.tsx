'use client';

import { ChevronLeft, Database, FileJson, Loader2, Upload } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { CacheRecoveryViewProps } from '../types';

export function CacheRecoveryView({
  metadata,
  error,
  cacheMissing,
  isRestoring,
  restoreInputRef,
  onRestoreCache,
}: CacheRecoveryViewProps) {
  const isCacheMissing =
    cacheMissing || error?.includes('not found in local storage');

  return (
    <div className="flex h-screen w-full flex-col bg-[#0D0D0E] text-white overflow-hidden font-sans">
      {metadata && (
        <div className="flex justify-between items-center px-8 py-4 border-b border-white/[0.07] bg-[#121214] shrink-0">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 hover:bg-white/[0.06] rounded-lg text-[#A1A1AA] hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-4 text-white">
              <span className="font-bold text-lg">
                {metadata.teams.home.name}
              </span>
              <div className="px-3 py-1 bg-[#18181B] rounded-md font-mono text-sm font-bold border border-white/[0.08] text-[#FF8100]">
                {metadata.score}
              </div>
              <span className="font-bold text-lg text-[#D4D4D8]">
                {metadata.teams.away.name}
              </span>
            </div>
          </div>
        </div>
      )}
      <div className="flex-1 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent">
        <Card className="bg-[#18181B] border-white/[0.08] p-8 max-w-md w-full shadow-2xl">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
              {isCacheMissing ? (
                <Database className="w-8 h-8 text-[#FF8100] animate-pulse" />
              ) : (
                <Loader2 className="w-8 h-8 text-[#EB3B5A]" />
              )}
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                {isCacheMissing ? 'データの再構築が必要です' : '接続エラー'}
              </h2>
              <p className="text-sm text-[#A1A1AA] leading-relaxed px-4">
                {isCacheMissing
                  ? '以前の JSON ファイルを再読み込みしてください。'
                  : error || '予期せぬエラーが発生しました'}
              </p>
            </div>
            {isCacheMissing && (
              <div className="w-full space-y-4 pt-2">
                <input
                  type="file"
                  ref={restoreInputRef}
                  accept=".json"
                  className="hidden"
                  onChange={onRestoreCache}
                />
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full font-bold"
                  onClick={() => restoreInputRef.current?.click()}
                  disabled={isRestoring}
                  icon={<Upload className="w-5 h-5" />}
                >
                  {isRestoring ? '復旧中...' : 'JSONファイルを読み込む'}
                </Button>
                <p className="text-[10px] text-[#71717A] uppercase tracking-widest font-bold flex items-center justify-center gap-1.5">
                  <FileJson className="w-3.5 h-3.5" />
                  WhoScored JSON Format
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
