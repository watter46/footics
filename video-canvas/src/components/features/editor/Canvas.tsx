import React, { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../../../stores/useEditorStore';
import { useCanvas } from '../../../hooks/useCanvas';
import { useShortcuts } from '../../../hooks/useShortcuts';
import { ContextMenu } from './ContextMenu';

export const CanvasContainer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { fabricCanvas, initCanvas } = useCanvas();
  const { activeTool } = useEditorStore();

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, targetId: string | null } | null>(null);

  useShortcuts(fabricCanvas);

  useEffect(() => {
    if (canvasRef.current && containerRef.current && !fabricCanvas) {
      initCanvas(canvasRef.current, containerRef.current);
    }
  }, [canvasRef, containerRef, fabricCanvas, initCanvas]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!fabricCanvas) return;

    // Find target object at right-click location
    const pointer = fabricCanvas.getScenePoint(e.nativeEvent);
    const target = fabricCanvas.findTarget(e.nativeEvent);
    
    if (target) {
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            targetId: (target as any).id || null
        });
    } else {
        setContextMenu(null);
    }
  };

  return (
    <div 
      ref={containerRef} 
      // Adjusted workspace background to neutral-800 for better contrast with black canvas
      className="w-full h-full flex items-center justify-center relative select-none bg-neutral-800/50"
      onContextMenu={handleContextMenu}
    >
      <div className="shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.1)] overflow-hidden bg-neutral-900 border-2 border-white/20 transition-all duration-300">
        <canvas ref={canvasRef} />
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu 
            x={contextMenu.x} 
            y={contextMenu.y} 
            targetId={contextMenu.targetId} 
            onClose={() => setContextMenu(null)} 
        />
      )}

      {/* Floating Info */}
      <div className="absolute bottom-6 left-6 px-3 py-1.5 bg-neutral-900/80 backdrop-blur-md rounded-full border border-white/10 text-[10px] text-neutral-500 font-bold uppercase tracking-widest shadow-2xl flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        Work Area: <span className="text-blue-500">{activeTool}</span>
      </div>
    </div>
  );
};
