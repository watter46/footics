import { Eye, Lightbulb, Link, MoveRight } from 'lucide-react';
import type React from 'react';
import { createShapeId, track, useEditor } from 'tldraw';
import type { AppShape } from './app-shapes';
import {
  MARKER_ARROW_DEFAULT_LENGTH,
  MARKER_FOV_DEFAULT_ANGLE,
  MARKER_FOV_DEFAULT_LENGTH,
} from './marker-styles';

/**
 * マーカー選択時に横に浮かぶツールバー。
 * 実線矢印 / 点線矢印 / マンマーク / 視野 / コネクタ / スポットライト の各操作を提供する。
 */
export const FloatingMarkerToolbar = track(function FloatingMarkerToolbar() {
  const editor = useEditor();

  // 単一のマーカーが選択されているときのみ表示
  const selectedShapeIds = editor.getSelectedShapeIds();
  if (selectedShapeIds.length !== 1) return null;

  const shape = editor.getShape(selectedShapeIds[0]) as AppShape;
  if (!shape || shape.type !== 'marker') return null;

  // 形状の境界または現在の選択範囲の境界を取得
  const bounds =
    editor.getShapePageBounds(shape.id) ?? editor.getSelectionPageBounds();
  if (!bounds) return null;

  // ページ空間 → ビューポート空間 (CSS px) へ変換
  const camera = editor.getCamera();
  const vpX = (bounds.maxX + camera.x) * camera.z + 12;
  const vpY = (bounds.midY + camera.y) * camera.z;

  const props = shape.props as any;

  // ─────────────────────────────────────────────
  // アクションヘルパー
  // ─────────────────────────────────────────────

  /** 矢印系Shape をマーカーと同じ x,y に生成する（中心点共有方式） */
  const addArrowSolid = () => {
    editor.markHistoryStoppingPoint('add marker arrow solid');
    editor.createShape({
      id: createShapeId(),
      type: 'marker_arrow_solid' as any,
      x: shape.x,
      y: shape.y,
      props: {
        targetMarkerId: shape.id,
        angle: -Math.PI / 2,
        length: MARKER_ARROW_DEFAULT_LENGTH,
        bend: 0,
      },
    });
  };

  const addArrowDash = () => {
    editor.markHistoryStoppingPoint('add marker arrow dash');
    editor.createShape({
      id: createShapeId(),
      type: 'marker_arrow_dash' as any,
      x: shape.x,
      y: shape.y,
      props: {
        targetMarkerId: shape.id,
        angle: -Math.PI / 2,
        length: MARKER_ARROW_DEFAULT_LENGTH,
        bend: 0,
      },
    });
  };

  const addManMark = () => {
    editor.markHistoryStoppingPoint('add marker man mark');
    editor.createShape({
      id: createShapeId(),
      type: 'marker_man_mark' as any,
      x: shape.x,
      y: shape.y,
      props: {
        targetMarkerId: shape.id,
        angle: -Math.PI / 2,
        length: MARKER_ARROW_DEFAULT_LENGTH,
        bend: 0,
      },
    });
  };

  const addFov = () => {
    editor.markHistoryStoppingPoint('add marker fov');
    editor.createShape({
      id: createShapeId(),
      type: 'marker_fov' as any,
      x: shape.x,
      y: shape.y,
      props: {
        targetMarkerId: shape.id,
        angle: MARKER_FOV_DEFAULT_ANGLE,
        direction: -Math.PI / 2,
        length: MARKER_FOV_DEFAULT_LENGTH,
      },
    });
  };

  /**
   * コネクタツールを起動する。
   * MarkerConnectorTool の onEnter で startMarkerId を受け取るため、
   * setCurrentTool の第2引数（info）で選択済みマーカーIDを渡す。
   */
  const startConnector = () => {
    editor.setCurrentTool('marker_connector', {
      startMarkerId: shape.id,
    } as any);
  };

  const toggleSpotlight = () => {
    editor.markHistoryStoppingPoint('toggle spotlight');
    editor.updateShape({
      id: shape.id,
      type: 'marker' as any,
      props: { isSpotlight: !props.isSpotlight },
    });
  };

  // ─────────────────────────────────────────────
  // レンダリング
  // ─────────────────────────────────────────────

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
      {/* 実線矢印 */}
      <ToolbarBtn title="実線矢印を追加" onClick={addArrowSolid}>
        <MoveRight size={16} strokeWidth={2} />
      </ToolbarBtn>

      {/* 点線矢印 */}
      <ToolbarBtn title="点線矢印を追加" onClick={addArrowDash}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <line x1="5" y1="12" x2="19" y2="12" strokeDasharray="4 3" />
          <polyline points="15 8 19 12 15 16" />
        </svg>
      </ToolbarBtn>

      {/* マンマーク（●─●） */}
      <ToolbarBtn title="マンマークを追加" onClick={addManMark}>
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
      <ToolbarBtn title="視野を追加" onClick={addFov}>
        <Eye size={16} strokeWidth={1.5} />
      </ToolbarBtn>

      <div
        style={{
          height: '1px',
          background: 'rgba(255,255,255,0.1)',
          margin: '2px 0',
        }}
      />

      {/* コネクタ */}
      <ToolbarBtn
        title="コネクタを開始（別のマーカーをクリックして結ぶ）"
        onClick={startConnector}
      >
        <Link size={16} strokeWidth={1.5} />
      </ToolbarBtn>

      <div
        style={{
          height: '1px',
          background: 'rgba(255,255,255,0.1)',
          margin: '2px 0',
        }}
      />

      {/* スポットライト切替 */}
      <ToolbarBtn
        title="スポットライトの切替"
        onClick={toggleSpotlight}
        active={props.isSpotlight}
      >
        <Lightbulb size={16} strokeWidth={1.5} />
      </ToolbarBtn>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 小さな内部ボタンコンポーネント
// ─────────────────────────────────────────────────────────────────────────────

const ToolbarBtn: React.FC<{
  title: string;
  onClick: () => void;
  dim?: boolean;
  active?: boolean;
  children: React.ReactNode;
}> = ({ title, onClick, dim, active, children }) => (
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
      background: active ? 'rgba(255,255,255,0.2)' : 'transparent',
      color: active
        ? '#fff'
        : dim
          ? 'rgba(255,255,255,0.55)'
          : 'rgba(255,255,255,0.85)',
      cursor: 'pointer',
      transition: 'background 0.15s, color 0.15s',
    }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLButtonElement).style.background =
        'rgba(255,255,255,0.12)';
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLButtonElement).style.background = active
        ? 'rgba(255,255,255,0.2)'
        : 'transparent';
    }}
  >
    {children}
  </button>
);
