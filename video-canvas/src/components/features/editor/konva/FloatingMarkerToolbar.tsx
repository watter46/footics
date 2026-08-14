import { Eye, Lightbulb, Link, MoveRight, Pipette, Trash2 } from 'lucide-react';
import type React from 'react';

interface FloatingMarkerToolbarProps {
  position: { x: number; y: number } | null;
  color: string;
  isSpotlight: boolean;
  onAddArrowSolid: () => void;
  onAddArrowDash: () => void;
  onAddManMark: () => void;
  onAddFov: () => void;
  onAddConnector: () => void;
  onToggleSpotlight: () => void;
  onColorChange: (color: string) => void;
  onDelete: () => void;
}

export const FloatingMarkerToolbar: React.FC<FloatingMarkerToolbarProps> = ({
  position,
  color,
  isSpotlight,
  onAddArrowSolid,
  onAddArrowDash,
  onAddManMark,
  onAddFov,
  onAddConnector,
  onToggleSpotlight,
  onColorChange,
  onDelete,
}) => {
  if (!position) return null;

  const pickColor = async () => {
    if (!('EyeDropper' in window)) return;
    try {
      // @ts-expect-error - EyeDropper API
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      onColorChange(result.sRGBHex);
    } catch {
      // User cancelled
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translateY(-50%)',
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: '6px',
        borderRadius: '10px',
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
        zIndex: 999,
        minWidth: '38px',
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* 実線矢印 */}
      <ToolbarBtn title="実線矢印を追加" onClick={onAddArrowSolid}>
        <MoveRight size={16} strokeWidth={2} />
      </ToolbarBtn>

      {/* 点線矢印 */}
      <ToolbarBtn title="点線矢印を追加" onClick={onAddArrowDash}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <line x1="4" y1="12" x2="20" y2="12" strokeDasharray="4 3" />
          <polyline points="15 7 20 12 15 17" />
        </svg>
      </ToolbarBtn>

      {/* マンマーク (●─●) */}
      <ToolbarBtn title="マンマークを追加" onClick={onAddManMark}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="4" cy="12" r="3" fill="currentColor" />
          <line x1="7" y1="12" x2="17" y2="12" />
          <circle cx="20" cy="12" r="3" fill="currentColor" />
        </svg>
      </ToolbarBtn>

      {/* 視野 (FOV) */}
      <ToolbarBtn title="視野を追加" onClick={onAddFov}>
        <Eye size={16} strokeWidth={1.5} />
      </ToolbarBtn>

      <div
        style={{
          height: '1px',
          background: 'rgba(255,255,255,0.12)',
          margin: '2px 0',
        }}
      />

      {/* コネクタ */}
      <ToolbarBtn title="コネクタ線を追加" onClick={onAddConnector}>
        <Link size={16} strokeWidth={1.5} />
      </ToolbarBtn>

      <div
        style={{
          height: '1px',
          background: 'rgba(255,255,255,0.12)',
          margin: '2px 0',
        }}
      />

      {/* スポットライト切替 */}
      <ToolbarBtn
        title="スポットライトの切替"
        onClick={onToggleSpotlight}
        active={isSpotlight}
      >
        <Lightbulb size={16} strokeWidth={1.5} />
      </ToolbarBtn>

      {/* スポイト色選択 */}
      {'EyeDropper' in window && (
        <ToolbarBtn title="色を選択（スポイト）" onClick={pickColor}>
          <div
            style={{
              position: 'relative',
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: color,
              border: '1px solid rgba(255,255,255,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Pipette
              size={10}
              style={{
                color: '#fff',
                filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.6))',
              }}
            />
          </div>
        </ToolbarBtn>
      )}

      <div
        style={{
          height: '1px',
          background: 'rgba(255,255,255,0.12)',
          margin: '2px 0',
        }}
      />

      {/* 削除 */}
      <ToolbarBtn title="削除 (Delete/Backspace)" onClick={onDelete}>
        <Trash2 size={15} className="text-red-400" />
      </ToolbarBtn>
    </div>
  );
};

const ToolbarBtn: React.FC<{
  title: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}> = ({ title, onClick, active, children }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '32px',
      height: '32px',
      borderRadius: '7px',
      border: 'none',
      background: active ? 'rgba(250, 204, 21, 0.25)' : 'transparent',
      color: active ? '#fde047' : 'rgba(255,255,255,0.85)',
      cursor: 'pointer',
      transition: 'background 0.15s, color 0.15s',
    }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLButtonElement).style.background = active
        ? 'rgba(250, 204, 21, 0.35)'
        : 'rgba(255,255,255,0.15)';
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLButtonElement).style.background = active
        ? 'rgba(250, 204, 21, 0.25)'
        : 'transparent';
    }}
  >
    {children}
  </button>
);
