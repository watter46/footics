import React from 'react';

/**
 * プレミアムなローディングコンポーネント。
 * ダークモードを前提に、グラスモーフィズムとパルスアニメーションで構成。
 * デザイントークンは editor.css の @theme で定義。
 */
export const Loading: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen w-full bg-neutral-950 text-white">
      {/* Glass Card */}
      <div className="flex flex-col items-center gap-6 p-10 rounded-2xl bg-glass-surface backdrop-blur-xl border border-glass-border shadow-2xl shadow-glass-shadow">
        {/* Spinner */}
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-glass-border" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand-from animate-spin" />
        </div>

        {/* Text */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-brand-from to-brand-to rounded-md flex items-center justify-center shadow-lg shadow-brand-glow">
              <span className="font-black text-[10px] text-white">VC</span>
            </div>
            <span className="text-sm font-semibold tracking-tight text-neutral-200">
              Video Canvas
            </span>
          </div>
          <p className="text-xs text-neutral-500 animate-pulse">
            エディタを準備中...
          </p>
        </div>
      </div>
    </div>
  );
};
