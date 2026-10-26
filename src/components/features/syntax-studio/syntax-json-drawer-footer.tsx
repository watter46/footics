'use client';

export interface SyntaxJsonDrawerFooterProps {
  isValid: boolean | null;
  onClose: () => void;
  onApply: () => void;
}

export function SyntaxJsonDrawerFooter({
  isValid,
  onClose,
  onApply,
}: SyntaxJsonDrawerFooterProps) {
  return (
    <div className="px-5 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-3">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onApply}
        disabled={!isValid}
        className="px-5 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-900/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        Apply to Studio
      </button>
    </div>
  );
}
