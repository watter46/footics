'use client';

import {
  Check,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileCode,
  Globe,
  Loader2,
  QrCode,
  Share2,
  Upload,
  X,
} from 'lucide-react';
import type React from 'react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  packPlayerPhotos,
  type TacticalExportSharePayload,
} from '@/lib/tactical/export/share-payload';
import { useTacticalAnimationStore } from '@/stores/tactical-animation-store';

interface TacticalShareExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TacticalShareExportModal: React.FC<
  TacticalShareExportModalProps
> = ({ isOpen, onClose }) => {
  const scenes = useTacticalAnimationStore((s) => s.scenes);
  const orientation = useTacticalAnimationStore((s) => s.orientation);
  const teamVisibility = useTacticalAnimationStore((s) => s.teamVisibility);
  const exportFps = useTacticalAnimationStore((s) => s.exportFps);

  const [isGenerating, setIsGenerating] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleGenerateShareUrl = async () => {
    if (scenes.length <= 1) {
      toast.error('共有・エクスポートには2つ以上のシーンが必要です');
      return;
    }

    setIsGenerating(true);
    const toastId = toast.loading('選手写真とアニメーションデータを準備中...');

    try {
      // 1. 選手写真を Base64 / URL にパッケージング
      const photos = await packPlayerPhotos(scenes);

      const payload: TacticalExportSharePayload = {
        version: 1,
        createdAt: Date.now(),
        title: `Tactical Animation (${scenes.length} scenes)`,
        scenes,
        orientation,
        teamVisibility,
        photos,
        exportFps,
      };

      // 2. API に POST
      const res = await fetch('/api/tactical-export/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${res.status}`);
      }

      const data = await res.json();
      const fullUrl = `${window.location.origin}${data.shareUrl}`;
      setShareUrl(fullUrl);

      // 自動でクリップボードにコピー
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
        toast.success('エクスポート専用URLを発行し、コピーしました！', {
          id: toastId,
        });
      } else {
        toast.success('エクスポート専用URLを発行しました', { id: toastId });
      }
    } catch (err) {
      console.error('Failed to create share URL:', err);
      toast.error(
        `URL発行に失敗しました: ${err instanceof Error ? err.message : String(err)}`,
        { id: toastId },
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      toast.success('URLをクリップボードにコピーしました');
    } catch {
      toast.error('URLのコピーに失敗しました');
    }
  };

  // オフライン用 JSON プロジェクトファイル保存
  const handleDownloadProjectFile = async () => {
    try {
      const photos = await packPlayerPhotos(scenes);
      const payload: TacticalExportSharePayload = {
        version: 1,
        createdAt: Date.now(),
        title: `Tactical Animation (${scenes.length} scenes)`,
        scenes,
        orientation,
        teamVisibility,
        photos,
        exportFps,
      };

      const jsonStr = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, '-');
      a.download = `tactical_project_${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 1000);

      toast.success('プロジェクトファイルを保存しました (.json)');
    } catch (_err) {
      toast.error('プロジェクトファイルの保存に失敗しました');
    }
  };

  // オフライン用 JSON ファイル読み込み
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text) as TacticalExportSharePayload;
        if (!parsed.scenes || !Array.isArray(parsed.scenes)) {
          throw new Error('有効なプロジェクトファイルではありません');
        }

        // ストアに反映
        useTacticalAnimationStore.setState({
          scenes: parsed.scenes,
          orientation: parsed.orientation || 'vertical',
          teamVisibility: parsed.teamVisibility || 'both',
          exportFps: parsed.exportFps === 60 ? 60 : 30,
          activeSceneIndex: 0,
        });

        toast.success('プロジェクトを読み込みました！');
        onClose();
      } catch (err) {
        toast.error(
          `読み込み失敗: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    };
    reader.readAsText(file);
    // リセット
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-lg shadow-2xl text-white animate-in zoom-in-95 duration-200 flex flex-col gap-4">
        {/* ヘッダー */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                別端末で高画質エクスポート
              </h3>
              <p className="text-xs text-slate-400">
                専用URLを発行し、デスクトップPC等で高速レンダリング
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* メインエリア: URL発行 */}
        <div className="space-y-3">
          {!shareUrl ? (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-200">
                  ワンタイム共有URLを発行
                </div>
                <div className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                  選手写真やシーンデータを一時保存し、別PCで開くだけで最高画質（1080p
                  60fps）のMP4動画を即座に書き出せます。
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateShareUrl}
                disabled={isGenerating || scenes.length <= 1}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    URL発行中...
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    エクスポート用URLを発行する
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-950 border border-blue-500/40 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  <Check className="w-4 h-4" />
                  <span>エクスポートURL発行完了</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>有効期限: 24時間</span>
                </div>
              </div>

              {/* URL 表示 & コピー */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs font-mono text-slate-200 select-all truncate"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>コピー済</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>コピー</span>
                    </>
                  )}
                </button>
              </div>

              {/* QRコード表示トグル & 別タブで開く */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setShowQr(!showQr)}
                  className="text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>{showQr ? 'QRコードを隠す' : 'QRコードを表示'}</span>
                </button>

                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                >
                  <span>別タブで開いて確認</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {showQr && (
                <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl mt-2 animate-in fade-in">
                  {/* Google Chart API を用いたシンプルな QR コード画像 */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                      shareUrl,
                    )}`}
                    alt="Export Share QR Code"
                    className="w-40 h-40"
                  />
                  <span className="text-[10px] text-slate-600 mt-1 font-mono">
                    スマホや別端末のカメラでスキャン
                  </span>
                </div>
              )}
            </div>
          )}

          {/* オフライン用・ファイル保存/読込セクション */}
          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-2">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-slate-400" />
              <span>ファイル保存・バックアップ（オフライン用）</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDownloadProjectFile}
                className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors border border-slate-700 flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>プロジェクト保存 (.json)</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors border border-slate-700 flex items-center justify-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>ファイルを読み込む</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.footics"
                onChange={handleImportFile}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
