import React, { useState } from 'react';
import { track, useEditor } from 'tldraw';
import { MoveRight, Eye, Type, Trash2 } from 'lucide-react';

/**
 * Floating toolbar that appears beside a selected Marker shape.
 * Provides quick actions: add arrows (solid/dashed), FOV, label edit,
 * and removal of the last-added option.
 */
export const FloatingMarkerToolbar = track(function FloatingMarkerToolbar() {
  const editor = useEditor();

  // Only show when exactly one marker is selected
  const selectedShapes = editor.getSelectedShapes();
  if (selectedShapes.length !== 1) return null;

  const shape = selectedShapes[0] as any;
  if (shape.type !== 'marker') return null;

  const bounds = editor.getShapePageBounds(shape.id);
  if (!bounds) return null;

  // Convert page-space → viewport-space (CSS pixels inside the tldraw container)
  const camera = editor.getCamera();
  const vpX = (bounds.maxX + camera.x) * camera.z + 12;
  const vpY = (bounds.midY + camera.y) * camera.z;

  const props = shape.props as any;

  // --- Mutation helpers ---------------------------------------------------

  const addArrow = (type: string) => {
    const arrows = props.arrows || [];
    editor.updateShape({
      id: shape.id,
      type: 'marker' as any,
      props: {
        arrows: [...arrows, { type, angle: -Math.PI / 2, length: 60, bend: 0 }],
      },
    });
  };

  const addFov = () => {
    const fovs = props.fovs || [];
    editor.updateShape({
      id: shape.id,
      type: 'marker' as any,
      props: {
        fovs: [
          ...fovs,
          { angle: Math.PI / 4, direction: -Math.PI / 2, length: 80 },
        ],
      },
    });
  };


  const removeLastArrow = () => {
    const arrows = [...(props.arrows || [])];
    arrows.pop();
    editor.updateShape({
      id: shape.id,
      type: 'marker' as any,
      props: { arrows },
    });
  };

  const removeLastFov = () => {
    const fovs = [...(props.fovs || [])];
    fovs.pop();
    editor.updateShape({
      id: shape.id,
      type: 'marker' as any,
      props: { fovs },
    });
  };

  // --- Render -------------------------------------------------------------

  return (
    <div
      style={{
        position: 'absolute',
        left: vpX,
        top: vpY,
        transform: 'translateY(-50%)',
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '3px',
        padding: '6px',
        borderRadius: '10px',
        background: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
        zIndex: 999,
        minWidth: '36px',
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Solid arrow */}
      <ToolbarBtn title="実線矢印を追加" onClick={() => addArrow('solid')}>
        <MoveRight size={16} strokeWidth={2} />
      </ToolbarBtn>

      {/* Dashed arrow */}
      <ToolbarBtn title="点線矢印を追加" onClick={() => addArrow('dashed')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="5" y1="12" x2="19" y2="12" strokeDasharray="4 3" />
          <polyline points="15 8 19 12 15 16" />
        </svg>
      </ToolbarBtn>

      {/* FOV */}
      <ToolbarBtn title="視野を追加" onClick={() => addFov()}>
        <Eye size={16} strokeWidth={1.5} />
      </ToolbarBtn>


      {/* Remove section */}
      {(props.arrows?.length > 0 || props.fovs?.length > 0) && (
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.1)',
            marginTop: '2px',
            paddingTop: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
          }}
        >
          {props.arrows?.length > 0 && (
            <ToolbarBtn title="最後の矢印を削除" onClick={removeLastArrow} dim>
              <Trash2 size={14} strokeWidth={1.5} />
              <MoveRight size={12} strokeWidth={1.5} />
            </ToolbarBtn>
          )}
          {props.fovs?.length > 0 && (
            <ToolbarBtn title="最後の視野を削除" onClick={removeLastFov} dim>
              <Trash2 size={14} strokeWidth={1.5} />
              <Eye size={12} strokeWidth={1.5} />
            </ToolbarBtn>
          )}
        </div>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Small internal button component
// ---------------------------------------------------------------------------

const ToolbarBtn: React.FC<{
  title: string;
  onClick: () => void;
  dim?: boolean;
  children: React.ReactNode;
}> = ({ title, onClick, dim, children }) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '2px',
      width: '32px',
      height: '32px',
      borderRadius: '7px',
      border: 'none',
      background: 'transparent',
      color: dim ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.85)',
      cursor: 'pointer',
      transition: 'background 0.15s, color 0.15s',
    }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)';
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
    }}
  >
    {children}
  </button>
);
