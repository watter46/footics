import React, { useEffect, useRef, useState } from 'react';
import { Canvas, Image as FabricImage, loadSVGFromURL, Group } from 'fabric';
import { browser } from 'wxt/browser';
import { Download, Copy, Trash2, ArrowRight, MapPin, Circle } from 'lucide-react';
import { CaptureMetadata } from './lib/types';

const ASSETS = [
  { id: 'arrow', name: '矢印', url: browser.runtime.getURL('/svg/arrow.svg' as any), icon: <ArrowRight size={20} /> },
  { id: 'pin', name: 'ピン', url: browser.runtime.getURL('/svg/pin.svg' as any), icon: <MapPin size={20} /> },
  { id: 'circle', name: '円', url: browser.runtime.getURL('/svg/circle.svg' as any), icon: <Circle size={20} /> },
];

const EditorApp: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || fabricCanvasRef.current) return;

    const fabricCanvas = new Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#333',
    });
    fabricCanvasRef.current = fabricCanvas;

    const init = async () => {
      const storage = await browser.storage.session.get(['lastCapturedFrame', 'cropRect', 'isDirectCapture']);
      const dataUrl = storage.lastCapturedFrame as string | undefined;
      const rect = storage.cropRect as CaptureMetadata | undefined;
      const isDirect = storage.isDirectCapture as boolean | undefined;

      if (dataUrl) {
        let finalImage: FabricImage;

        if (isDirect || !rect) {
          // 1. 直出し(drawImage)の場合はそのまま
          finalImage = await FabricImage.fromURL(dataUrl);
        } else {
          // 2. Viewport単位(captureVisibleTab)の場合は指定座標でクロップする
          const fullImg = new Image();
          fullImg.src = dataUrl;
          await new Promise(resolve => (fullImg.onload = resolve));

          const cropCanvas = document.createElement('canvas');
          const dpr = rect.devicePixelRatio || window.devicePixelRatio;

          // object-fit: contain の計算を行う
          const { videoWidth, videoHeight, viewportWidth, viewportHeight } = rect;
          
          let targetX = 0;
          let targetY = 0;
          let targetWidth = viewportWidth || window.innerWidth;
          let targetHeight = viewportHeight || window.innerHeight;

          if (videoWidth && videoHeight && viewportWidth && viewportHeight) {
            const videoRatio = videoWidth / videoHeight;
            const viewportRatio = viewportWidth / viewportHeight;

            if (videoRatio > viewportRatio) {
              // 横長：上下に黒帯
              targetWidth = viewportWidth;
              targetHeight = viewportWidth / videoRatio;
              targetY = (viewportHeight - targetHeight) / 2;
            } else {
              // 縦長：左右に黒帯
              targetHeight = viewportHeight;
              targetWidth = viewportHeight * videoRatio;
              targetX = (viewportWidth - targetWidth) / 2;
            }
          } else if (rect.originalVideoRect) {
            targetX = rect.originalVideoRect.x;
            targetY = rect.originalVideoRect.y;
            targetWidth = rect.originalVideoRect.width;
            targetHeight = rect.originalVideoRect.height;
          }
          
          cropCanvas.width = targetWidth * dpr;
          cropCanvas.height = targetHeight * dpr;
          
          const ctx = cropCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(
              fullImg,
              targetX * dpr, 
              targetY * dpr, 
              targetWidth * dpr, 
              targetHeight * dpr,
              0, 0, 
              targetWidth * dpr, 
              targetHeight * dpr
            );
          }
          finalImage = await FabricImage.fromURL(cropCanvas.toDataURL());
        }
        
        const scale = Math.min(
          (window.innerWidth - 300) / finalImage.width!,
          (window.innerHeight - 100) / finalImage.height!
        );
        
        fabricCanvas.setDimensions({
          width: finalImage.width! * scale,
          height: finalImage.height! * scale,
        });
        
        finalImage.set({
          scaleX: scale,
          scaleY: scale,
          selectable: false,
          evented: false,
        });

        fabricCanvas.add(finalImage);
        fabricCanvas.sendObjectToBack(finalImage);
        fabricCanvas.renderAll();
      }
      setIsLoaded(true);
    };

    init();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObjects = fabricCanvas.getActiveObjects();
        fabricCanvas.remove(...activeObjects);
        fabricCanvas.discardActiveObject();
        fabricCanvas.renderAll();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      fabricCanvas.dispose();
    };
  }, []);

  const addAsset = async (url: string) => {
    if (!fabricCanvasRef.current) return;
    const { objects, options } = await loadSVGFromURL(url);
    const validObjects = objects.filter((obj): obj is NonNullable<typeof obj> => obj !== null);
    const group = new Group(validObjects, options);
    
    group.set({
      left: 100,
      top: 100,
      scaleX: 0.5,
      scaleY: 0.5,
    });
    
    fabricCanvasRef.current.add(group);
    fabricCanvasRef.current.setActiveObject(group);
    fabricCanvasRef.current.renderAll();
  };

  const copyToClipboard = async () => {
    if (!fabricCanvasRef.current) return;
    
    fabricCanvasRef.current.discardActiveObject();
    fabricCanvasRef.current.renderAll();

    const dataUrl = fabricCanvasRef.current.toDataURL({
      format: 'png',
      multiplier: 2,
    });

    const blob = await (await fetch(dataUrl)).blob();
    const item = new ClipboardItem({ 'image/png': blob });
    await navigator.clipboard.write([item]);
    alert('クリップボードにコピーしました');
  };

  const saveImage = () => {
    if (!fabricCanvasRef.current) return;
    fabricCanvasRef.current.discardActiveObject();
    fabricCanvasRef.current.renderAll();

    const dataUrl = fabricCanvasRef.current.toDataURL({
      format: 'png',
      multiplier: 2,
    });
    const link = document.createElement('a');
    link.download = `video-canvas-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-900 text-white font-sans">
      <header className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold">V</div>
          <h1 className="text-xl font-semibold tracking-tight">Video Canvas Editor</h1>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 transition-colors rounded-full text-sm font-medium"
          >
            <Copy size={16} /> コピー
          </button>
          <button 
            onClick={saveImage}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 transition-colors rounded-full text-sm font-medium"
          >
            <Download size={16} /> 保存
          </button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        <aside className="w-72 bg-neutral-900 border-r border-neutral-800 p-6 flex flex-col gap-6 overflow-y-auto">
          <section>
            <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4">図形・アセット</h2>
            <div className="grid grid-cols-2 gap-3">
              {ASSETS.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => addAsset(asset.url)}
                  className="flex flex-col items-center gap-2 p-4 bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 hover:border-blue-500 transition-all rounded-xl text-xs"
                >
                  <div className="text-blue-400">{asset.icon}</div>
                  <span>{asset.name}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="mt-auto">
            <div className="p-4 bg-yellow-900/20 border border-yellow-700/30 rounded-xl">
              <p className="text-xs text-yellow-500/80 leading-relaxed">
                <span className="font-bold">ヒント:</span> 要素を選択して Delete または Backspace キーで削除できます。ドラッグで移動、角をドラッグして回転・リサイズが可能です。
              </p>
            </div>
          </section>
        </aside>

        <div className="flex-1 bg-neutral-950 flex items-center justify-center p-8 overflow-auto">
          {!isLoaded && <div className="text-neutral-500 animate-pulse">読み込み中...</div>}
          <div className="shadow-2xl shadow-black/50 rounded-sm overflow-hidden bg-neutral-800">
            <canvas ref={canvasRef} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default EditorApp;
