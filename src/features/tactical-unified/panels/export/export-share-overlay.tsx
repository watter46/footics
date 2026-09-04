'use client';

import { Copy, QrCode } from 'lucide-react';
import { toast } from 'sonner';

interface ExportShareOverlayProps {
  shareUrl: string | null;
  qrCodeDataUrl: string | null;
  onClose: () => void;
}

export function ExportShareOverlay({
  shareUrl,
  qrCodeDataUrl,
  onClose,
}: ExportShareOverlayProps) {
  if (!shareUrl || !qrCodeDataUrl) return null;

  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1');

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard!');
  };

  return (
    <div className="p-6 flex flex-col items-center justify-center space-y-4 bg-slate-900/50 border-b border-white/10">
      <div className="flex flex-col items-center gap-2">
        <QrCode size={24} className="text-emerald-400" />
        <h3 className="text-sm font-bold text-white">
          Scan to Export on iPhone
        </h3>
        <p className="text-xs text-white/60 text-center max-w-sm">
          Scan this QR code with your iPhone to open the Footics Export Studio
          in iOS Safari and render with hardware acceleration.
        </p>
      </div>

      <div className="p-2 bg-white rounded-xl shadow-xl">
        <img
          src={qrCodeDataUrl}
          alt="Export Share QR Code"
          className="w-48 h-48"
        />
      </div>

      {isLocalhost && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs max-w-md text-center leading-relaxed">
          ⚠️ <strong>ローカル環境で実行中:</strong>{' '}
          PCの「localhost」はiPhoneから直接開けません。PCのローカルIPアドレスまたは本番URLからアクセスしてQRコードを発行してください。
        </div>
      )}

      <div className="flex items-center gap-2 mt-2 w-full max-w-md">
        <input
          type="text"
          readOnly
          value={shareUrl}
          className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/80 font-mono"
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
        <button
          type="button"
          onClick={handleCopy}
          className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 rounded-lg border border-emerald-500/30 transition-colors"
        >
          <Copy size={14} />
        </button>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-4 px-4 py-2 text-xs text-white/50 hover:text-white transition-colors cursor-pointer"
      >
        Close
      </button>
    </div>
  );
}
