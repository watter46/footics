'use client';

import {
  Clock,
  Download,
  Edit3,
  Film,
  Loader2,
  Monitor,
  Play,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Square,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  AnimationPitch,
  type AnimationPitchRef,
} from '@/components/features/tactical-animation/animation-pitch';
import { useTacticalAnimation } from '@/hooks/use-tactical-animation';
import { useTacticalVideoExport } from '@/hooks/use-tactical-video-export';
import {
  type TacticalExportSharePayload,
  unpackPlayerPhotos,
} from '@/lib/tactical/export/share-payload';
import { useTacticalAnimationStore } from '@/stores/tactical-animation-store';

export default function StandaloneExportSharePage() {
  const params = useParams();
  const shareId = params?.shareId as string;
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [shareData, setShareData] = useState<TacticalExportSharePayload | null>(
    null,
  );

  const [photosMap, setPhotosMap] = useState<Record<string, ImageBitmap>>({});
  const [selectedFps, setSelectedFps] = useState<number>(60);

  const pitchRef = useRef<AnimationPitchRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pitchDimensions, setPitchDimensions] = useState<{
    width: number;
    height: number;
  }>({
    width: 380,
    height: 580,
  });

  const { startExport, isExporting, exportProgress, exportError } =
    useTacticalVideoExport();
  const { playAnimation, stopAnimation } = useTacticalAnimation();

  const scenes = useTacticalAnimationStore((s) => s.scenes);
  const orientation = useTacticalAnimationStore((s) => s.orientation);
  const isPlaying = useTacticalAnimationStore((s) => s.isPlaying);
  const setActiveSceneIndex = useTacticalAnimationStore(
    (s) => s.setActiveSceneIndex,
  );

  // 1. 共有データのフェッチ & ストアへの適用
  useEffect(() => {
    if (!shareId) return;

    let isMounted = true;
    async function fetchData() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(
          `/api/tactical-export/share?id=${encodeURIComponent(shareId)}`,
        );
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || `HTTP error ${res.status}`);
        }

        const json = await res.json();
        const payload = json.data as TacticalExportSharePayload;

        if (!isMounted) return;
        setShareData(payload);
        setSelectedFps(payload.exportFps || 60);

        // 写真 Base64 を各シーンの選手 options に注入
        const enrichedScenes = payload.scenes.map((scene) => {
          const updatedPlayers = { ...scene.players };
          Object.keys(updatedPlayers).forEach((pId) => {
            const p = updatedPlayers[pId];
            if (payload.photos?.[pId]) {
              updatedPlayers[pId] = {
                ...p,
                options: {
                  ...p.options,
                  photoUrl: payload.photos[pId],
                },
              };
            }
          });
          return {
            ...scene,
            players: updatedPlayers,
          };
        });

        // ストアにシーンと向きを同期
        useTacticalAnimationStore.setState({
          scenes: enrichedScenes,
          orientation: payload.orientation,
          teamVisibility: payload.teamVisibility || 'both',
          exportFps: payload.exportFps === 60 ? 60 : 30,
          activeSceneIndex: 0,
        });

        // 写真の Base64 から ImageBitmap を復元
        if (payload.photos && Object.keys(payload.photos).length > 0) {
          const bitmaps = await unpackPlayerPhotos(payload.photos);
          if (isMounted) {
            setPhotosMap(bitmaps);
          }
        }
      } catch (err) {
        if (!isMounted) return;
        setLoadError(err instanceof Error ? err.message : String(err));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [shareId]);

  // ピッチのアスペクト比・リサイズ計算
  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      const padding = 16;
      const availWidth = Math.max(100, clientWidth - padding);
      const availHeight = Math.max(100, clientHeight - padding);

      if (orientation === 'vertical') {
        const targetRatio = 68 / 105;
        let h = availHeight;
        let w = h * targetRatio;
        if (w > availWidth) {
          w = availWidth;
          h = w / targetRatio;
        }
        setPitchDimensions({ width: Math.floor(w), height: Math.floor(h) });
      } else {
        const targetRatio = 105 / 68;
        let w = availWidth;
        let h = w / targetRatio;
        if (h > availHeight) {
          h = availHeight;
          w = h * targetRatio;
        }
        setPitchDimensions({ width: Math.floor(w), height: Math.floor(h) });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [orientation]);

  // 再生/停止
  const handlePlayToggle = () => {
    const stage = pitchRef.current?.getStage();
    if (isPlaying) {
      stopAnimation(stage);
    } else {
      setActiveSceneIndex(0);
      requestAnimationFrame(() => {
        if (stage) {
          playAnimation(stage);
        }
      });
    }
  };

  // エクスポート実行
  const handleExportClick = () => {
    if (scenes.length <= 1) {
      toast.error('エクスポートには2つ以上のシーンが必要です');
      return;
    }

    const bitrate = selectedFps <= 30 ? 10000000 : 16000000;
    startExport({
      backgroundColor: '#020617',
      fps: selectedFps,
      bitrate,
      photos: photosMap,
    });
  };

  // エディタにインポートして開く
  const handleOpenInEditor = () => {
    router.push('/animation-test');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <div className="flex flex-col items-center gap-3 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          <div className="font-bold text-sm text-slate-200">
            エクスポートデータを読み込み中...
          </div>
          <div className="text-xs text-slate-500">
            シーン・選手写真を復元しています
          </div>
        </div>
      </div>
    );
  }

  if (loadError || !shareData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <div className="max-w-md w-full bg-slate-900 border border-rose-900/40 p-6 rounded-2xl shadow-2xl flex flex-col items-center text-center gap-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-slate-100">
              データが見つかりません
            </h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {loadError ||
                '指定されたエクスポート用URLが無効か、有効期限（24時間）が切れています。'}
            </p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
          >
            Footics トップへ戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col select-none">
      {/* トップナビゲーションバー */}
      <header className="h-14 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
              <Film className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Footics Export Studio
            </span>
          </Link>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
            ID: {shareId}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1 text-xs text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>24時間限定</span>
          </div>

          <button
            type="button"
            onClick={handleOpenInEditor}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors border border-slate-700 shadow-xs"
          >
            <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
            <span>エディタで編集</span>
          </button>
        </div>
      </header>

      {/* メインレイアウト: プレビューエリア (左/中央) + エクスポートコントロール (右) */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* 左: アニメーションプレビュー */}
        <div className="flex-1 flex flex-col bg-slate-950 p-4 sm:p-6 min-h-0 relative">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-200">
                プレビュー・確認
              </h2>
              <span className="text-xs text-slate-500 font-mono">
                ({scenes.length} シーン)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {orientation === 'vertical' ? (
                <span className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  <Smartphone className="w-3 h-3 text-blue-400" /> 縦画面
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  <Monitor className="w-3 h-3 text-indigo-400" /> 横画面
                </span>
              )}

              <button
                type="button"
                onClick={handlePlayToggle}
                disabled={isExporting}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-md ${
                  isPlaying
                    ? 'bg-rose-600 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Square className="w-3 h-3 fill-white" /> 停止
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 fill-white" /> プレビュー再生
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ピッチ描画エリア */}
          <div
            ref={containerRef}
            className="flex-1 min-h-0 flex items-center justify-center bg-slate-900/50 rounded-2xl border border-slate-800/80 p-2 overflow-hidden"
          >
            <div
              style={{
                width: pitchDimensions.width,
                height: pitchDimensions.height,
              }}
              className="relative shadow-2xl rounded-xl overflow-hidden"
            >
              <AnimationPitch
                ref={pitchRef}
                width={pitchDimensions.width}
                height={pitchDimensions.height}
                readOnly
              />
            </div>
          </div>
        </div>

        {/* 右: 高画質エクスポート設定 & 実行パネル */}
        <div className="w-full lg:w-96 bg-slate-900/90 border-t lg:border-t-0 lg:border-l border-slate-800 p-5 flex flex-col justify-between shrink-0 overflow-y-auto">
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-sm text-slate-100">
                  高画質動画エクスポート
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                この端末の GPU パワーを使って最高画質の MP4
                動画を高速書き出しします。
              </p>
            </div>

            {/* フレームレート (FPS) 選択 */}
            <div className="space-y-2">
              <div className="block text-xs font-semibold text-slate-300">
                フレームレート (FPS)
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedFps(60)}
                  disabled={isExporting}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    selectedFps === 60
                      ? 'bg-indigo-950/80 border-indigo-500 ring-1 ring-indigo-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs text-indigo-300 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> 60 fps
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    YouTube向け最高滑らかさ
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedFps(30)}
                  disabled={isExporting}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    selectedFps === 30
                      ? 'bg-blue-950/80 border-blue-500 ring-1 ring-blue-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs text-blue-300 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> 30 fps
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    X・SNS向け爆速書き出し
                  </div>
                </button>
              </div>
            </div>

            {/* 解像度・出力仕様インフォメーション */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
              <div className="font-semibold text-slate-300 flex items-center justify-between">
                <span>出力スペック</span>
                <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                  H.264 / MP4
                </span>
              </div>
              <div className="space-y-1 text-slate-400 text-[11px]">
                <div className="flex justify-between">
                  <span>解像度:</span>
                  <span className="font-mono text-slate-200">
                    {orientation === 'vertical'
                      ? '1080 × 1664 (Full HD)'
                      : '1664 × 1080 (Full HD)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>ビットレート:</span>
                  <span className="font-mono text-slate-200">
                    {selectedFps === 60 ? '16 Mbps' : '10 Mbps'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>選手写真データ:</span>
                  <span className="font-mono text-emerald-400">
                    {Object.keys(photosMap).length > 0
                      ? `${Object.keys(photosMap).length} 名分復元済`
                      : 'なし (マーカーのみ)'}
                  </span>
                </div>
              </div>
            </div>

            {/* エクスポート進捗・エラー表示 */}
            {isExporting && (
              <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/40 space-y-2 animate-in fade-in">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-blue-300 flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />{' '}
                    レンダリング中...
                  </span>
                  <span className="font-mono font-bold text-white">
                    {exportProgress}%
                  </span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-150"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 text-center">
                  GPUハードウェアアクセラレーションでエンコードしています
                </div>
              </div>
            )}

            {exportError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
                エラー: {exportError}
              </div>
            )}
          </div>

          {/* 下部アクションボタン */}
          <div className="pt-4 border-t border-slate-800 mt-4">
            <button
              type="button"
              onClick={handleExportClick}
              disabled={isPlaying || isExporting || scenes.length <= 1}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white rounded-xl font-bold text-sm shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>エクスポート中 ({exportProgress}%)</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>MP4動画をエクスポート</span>
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
