'use client';

import { CheckCircle2, Smartphone, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExportVideoTabProps {
  onSendToIPhone?: () => void;
  isSending?: boolean;
}

const SPEC_ITEMS = [
  { label: '解像度', value: '1080p FHD (1920×1080)' },
  { label: 'フレームレート', value: '60 FPS 高滑らか補間' },
  { label: 'ビットレート', value: '24 Mbps (AVC / H.264)' },
  { label: 'ピッチ外観連動', value: 'テクスチャ・ライン色を完全反映' },
];

export function ExportVideoTab({
  onSendToIPhone,
  isSending = false,
}: ExportVideoTabProps) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/30 to-blue-950/20 border border-emerald-500/20 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
            <Smartphone size={20} />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-white">
                iPhone 高画質動画出力
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30 flex items-center gap-1">
                <Sparkles size={10} /> 60fps A14+
              </span>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">
              PCブラウザでの負荷を回避し、iPhoneの専用ハードウェア（A14
              Bionic以降）を活用して高品位なMP4アニメーション動画を生成します。
            </p>
          </div>
        </div>

        <div className="space-y-2 pt-1 border-t border-white/5">
          <p className="text-[11px] font-semibold tracking-wider text-white/50 uppercase">
            動画出力スペック
          </p>
          <div className="grid grid-cols-1 gap-2">
            {SPEC_ITEMS.map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5 text-xs"
              >
                <span className="text-white/60">{label}</span>
                <span className="text-white font-medium flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {onSendToIPhone && (
          <div className="pt-2">
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={onSendToIPhone}
              disabled={isSending}
              className="w-full bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white font-medium"
              icon={
                isSending ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Smartphone size={16} />
                )
              }
            >
              {isSending ? '送信リンク生成中...' : 'iPhoneに送信してMP4を生成'}
            </Button>
          </div>
        )}
      </div>

      <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 text-xs text-white/50 space-y-1 leading-relaxed">
        <p className="font-medium text-white/70">💡 出力の手順</p>
        <p>1. 「iPhoneに送信」をクリックしてQRコードまたは共有リンクを発行</p>
        <p>2. iPhoneで開いて「MP4を生成」をタップ</p>
        <p>
          3. 生成完了後、ファイルアプリまたは写真に保存してSNS等で活用できます
        </p>
      </div>
    </div>
  );
}
