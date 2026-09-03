'use client';

import { Trash2, X } from 'lucide-react';
import type React from 'react';

export function InspectorHeader({
  title,
  onClose,
  onDeselect,
}: {
  title?: string;
  onClose: () => void;
  onDeselect?: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0 bg-white/[0.02]">
      <span className="text-xs font-medium text-white/70">
        {title ? `Properties — ${title}` : 'Properties'}
      </span>
      <div className="flex items-center gap-1">
        {onDeselect && (
          <button
            type="button"
            onClick={onDeselect}
            className="px-1.5 py-0.5 rounded text-[10px] text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
            title="Deselect object"
          >
            Deselect
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          aria-label="Close panel"
          title="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

export function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] uppercase tracking-wider text-white/50 block">
        {label}
      </span>
      {children}
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  maxLength,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500"
    />
  );
}

export function RangeInput({
  value,
  min,
  max,
  step,
  label,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  label: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] uppercase tracking-wider text-white/50 block">
        {label} {value.toFixed(1)}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-blue-500"
      />
    </div>
  );
}

export function DeleteButton({
  onClick,
  label = 'Delete',
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full mt-4 py-1.5 rounded-lg border border-red-500/40 text-xs text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
    >
      <Trash2 size={13} />
      <span>{label}</span>
    </button>
  );
}

export function DashedArrowIcon({
  size = 14,
  className,
}: {
  size?: number | string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M2 12H22" strokeDasharray="3.5 2.5" />
      <path d="M18 8L22 12L18 16" />
    </svg>
  );
}
