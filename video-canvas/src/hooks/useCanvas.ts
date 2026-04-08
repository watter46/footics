import { useCallback, useRef, useState, useEffect } from 'react';
import * as fabric from 'fabric';
import { useEditorStore, ToolType } from '../stores/useEditorStore';
import { browser } from 'wxt/browser';
import { Spotlight } from '../lib/fabric/Spotlight';
import { ConnectedLine } from '../lib/fabric/Connector';
import { CurvedArrow } from '../lib/fabric/CurvedArrow';
import { useFabricSync } from './useFabricSync';
import { fabricToModel, normalize, denormalizeSize } from '../lib/models/converter';

// Register custom classes for serialization
fabric.classRegistry.setClass(ConnectedLine);
fabric.classRegistry.setClass(Spotlight);
fabric.classRegistry.setClass(CurvedArrow);

export const useCanvas = () => {
  const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);
  const { 
    objects,
    activeTool, 
    globalProperties, 
    setSelectedObject, 
    setTool,
    addObject,
    setObjects,
    updateGlobalProperties
  } = useEditorStore();
  
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  const bgImageRef = useRef<{ width: number, height: number } | null>(null);
  const activeToolRef = useRef<ToolType>(activeTool);
  const propsRef = useRef(globalProperties);

  // Initialize Sync Engine
  useFabricSync(fabricCanvas);

  useEffect(() => {
    activeToolRef.current = activeTool;
    if (canvasRef.current) {
      canvasRef.current.defaultCursor = activeTool === 'select' ? 'default' : 'crosshair';
      canvasRef.current.renderAll();
    }
  }, [activeTool]);

  useEffect(() => {
    propsRef.current = globalProperties;
  }, [globalProperties]);

  // Handle Resize Independence
  const resizeCanvas = useCallback(() => {
    if (!canvasRef.current || !containerRef.current || !bgImageRef.current) return;

    const container = containerRef.current;
    const { width: imgW, height: imgH } = bgImageRef.current;
    const aspectRatio = imgW / imgH;

    let targetWidth = container.clientWidth * 0.95; // Use 95% of container
    let targetHeight = targetWidth / aspectRatio;

    // Check if height exceeds container
    if (targetHeight > container.clientHeight * 0.95) {
        targetHeight = container.clientHeight * 0.95;
        targetWidth = targetHeight * aspectRatio;
    }

    canvasRef.current.setDimensions({
        width: targetWidth,
        height: targetHeight
    });
    canvasRef.current.renderAll();
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
        resizeCanvas();
    });

    if (containerRef.current) {
        observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [resizeCanvas]);

  const initCanvas = useCallback(async (element: HTMLCanvasElement, container: HTMLElement) => {
    if (canvasRef.current) return;
    containerRef.current = container;

    // --- Background Layer Initialization ---
    const storage = await (browser.storage.session.get(['lastCapturedFrame'] as any) as Promise<any>);
    const bgUrl = storage.lastCapturedFrame || '/dev-bg.png';

    // 1. Get Image Metadata First to establish aspect ratio
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = bgUrl;
    });

    bgImageRef.current = { width: img.width, height: img.height };
    const aspectRatio = img.width / img.height;

    // 2. Initial fitting
    let initialWidth = container.clientWidth * 0.95;
    let initialHeight = initialWidth / aspectRatio;
    if (initialHeight > container.clientHeight * 0.95) {
        initialHeight = container.clientHeight * 0.95;
        initialWidth = initialHeight * aspectRatio;
    }

    const canvas = new fabric.Canvas(element, {
      width: initialWidth,
      height: initialHeight,
      backgroundColor: '#111',
      preserveObjectStacking: true,
    });

    // Add background as a persistent model object
    const state = useEditorStore.getState();
    const hasBg = state.objects.some(o => o.id === 'bg-image');
    
    if (!hasBg) {
        state.addObject({
          id: 'bg-image',
          type: 'image',
          url: bgUrl,
          x: 0,
          y: 0,
          angle: 0,
          scaleX: 1,
          scaleY: 1,
          locked: true,
          visible: true,
          name: 'image',
          fill: 'transparent',
          stroke: 'transparent',
          strokeWidth: 0,
          opacity: 1,
        });
    }

    // --- Drawing Logic ---
    let isDrawing = false;
    let startX = 0;
    let startY = 0;
    let tempObj: fabric.FabricObject | null = null;
    let firstObj: any = null;

    canvas.on('mouse:down', (opt) => {
      const target = opt.target as any;
      if (target && target.id && activeToolRef.current !== 'select' && activeToolRef.current !== 'connector') {
          setTool('select');
          return;
      }

      // Connector Logic
      if (activeToolRef.current === 'connector') {
        if (target && target.id && target !== firstObj) {
          if (!firstObj) {
            firstObj = target;
            target.set({ shadow: new fabric.Shadow({ color: '#3b82f6', blur: 10 }) });
            canvas.renderAll();
          } else {
            const id = `obj-${Date.now()}`;
            addObject({
                id,
                type: 'connector',
                x: 0, y: 0,
                angle: 0, scaleX: 1, scaleY: 1,
                visible: true, locked: false,
                fromId: firstObj.id,
                toId: target.id,
                fill: 'transparent',
                stroke: propsRef.current.stroke,
                strokeWidth: propsRef.current.strokeWidth, // Percentage
                opacity: 1,
            });
            firstObj.set({ shadow: null });
            firstObj = null;
          }
        }
        return;
      }

      if (activeToolRef.current === 'select' || !opt.e) return;
      
      isDrawing = true;
      const pointer = canvas.getScenePoint(opt.e);
      startX = pointer.x;
      startY = pointer.y;

      const common = {
        left: startX,
        top: startY,
        stroke: propsRef.current.stroke,
        strokeWidth: denormalizeSize(propsRef.current.strokeWidth, canvas.width!),
        strokeDashArray: propsRef.current.strokeDashArray ? propsRef.current.strokeDashArray.map(v => denormalizeSize(v, canvas.width!)) : null,
        fill: propsRef.current.fill,
      };

      switch (activeToolRef.current) {
        case 'rect': tempObj = new fabric.Rect({ ...common, width: 0, height: 0 }); break;
        case 'circle': tempObj = new fabric.Ellipse({ ...common, rx: 0, ry: 0 }); break;
        case 'line': tempObj = new fabric.Line([startX, startY, startX, startY], { ...common, fill: 'transparent' }); break;
        case 'arrow': tempObj = new fabric.Line([startX, startY, startX, startY], { ...common, fill: 'transparent' }); break;
        case 'spotlight': tempObj = new Spotlight({ ...common }); break;
        case 'highlight': tempObj = new fabric.Rect({ ...common, fill: propsRef.current.stroke + '33', stroke: 'transparent' }); break;
      }

      if (tempObj) {
        (tempObj as any).isTemp = true;
        canvas.add(tempObj);
        canvas.renderAll();
      }
    });

    canvas.on('mouse:move', (opt) => {
      if (!isDrawing || !tempObj || !opt.e) return;
      const pointer = canvas.getScenePoint(opt.e);
      const { x, y } = pointer;
      const left = Math.min(startX, x);
      const top = Math.min(startY, y);
      const width = Math.abs(startX - x);
      const height = Math.abs(startY - y);

      switch (activeToolRef.current) {
        case 'rect':
        case 'highlight': tempObj.set({ left, top, width, height }); break;
        case 'circle': (tempObj as fabric.Ellipse).set({ left, top, rx: width / 2, ry: height / 2 }); break;
        case 'line':
        case 'arrow': (tempObj as fabric.Line).set({ x2: x, y2: y }); break;
      }
      canvas.renderAll();
    });

    canvas.on('mouse:up', () => {
      if (!isDrawing) return;
      isDrawing = false;
      if (tempObj) {
        const isTooSmall = tempObj.width < 5 && tempObj.height < 5 && !(tempObj instanceof fabric.Line);
        if (!isTooSmall) {
            if (activeToolRef.current === 'arrow' && tempObj instanceof fabric.Line) {
                const x1 = tempObj.x1;
                const y1 = tempObj.y1;
                const x2 = tempObj.x2;
                const y2 = tempObj.y2;
                const angle = Math.atan2(y2 - y1, x2 - x1);
                const headLength = denormalizeSize(2, canvas.width!); // 2% relative
                const pathData = `M ${x1} ${y1} L ${x2} ${y2} M ${x2} ${y2} L ${x2 - headLength * Math.cos(angle - Math.PI / 6)} ${y2 - headLength * Math.sin(angle - Math.PI / 6)} M ${x2} ${y2} L ${x2 - headLength * Math.cos(angle + Math.PI / 6)} ${y2 - headLength * Math.sin(angle + Math.PI / 6)}`;
                
                addObject({
                    id: `obj-${Date.now()}`,
                    type: 'path',
                    x: normalize(Math.min(x1, x2), canvas.width!),
                    y: normalize(Math.min(y1, y2), canvas.height!),
                    pathData,
                    fill: 'transparent',
                    stroke: propsRef.current.stroke,
                    strokeWidth: propsRef.current.strokeWidth, // %
                    opacity: 1,
                    visible: true, locked: false, angle: 0, scaleX: 1, scaleY: 1
                });
            } else {
                const model = fabricToModel(tempObj, canvas.width!, canvas.height!);
                model.id = `obj-${Date.now()}`;
                addObject(model);
            }
        }
        canvas.remove(tempObj);
        tempObj = null;
        setTool('select');
      }
      canvas.renderAll();
    });

    canvasRef.current = canvas;
    setFabricCanvas(canvas);
  }, [addObject, setTool]); 

  return { fabricCanvas, initCanvas };
};
