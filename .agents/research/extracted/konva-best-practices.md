# Konva 10 & React-Konva 19: Best Practices & Anti-Patterns

This guide provides concrete, actionable engineering rules, best practices, and anti-patterns for applications targeting **Konva 10 (10.3.0+)** and **React-Konva (19.2.5)** with **React 19**.

---

## Table of Contents
1. [Layer Architecture & Memory Management](#1-layer-architecture--memory-management)
2. [State Management & Drag Operations](#2-state-management--drag-operations)
3. [Transformer & Shape Resizing](#3-transformer--shape-resizing)
4. [Shape Caching & Filter Performance](#4-shape-caching--filter-performance)
5. [Drawing Pipeline & Micro-Optimizations](#5-drawing-pipeline--micro-optimizations)
6. [Redraw Strategy & Batching](#6-redraw-strategy--batching)
7. [Viewport Culling & High Object Counts](#7-viewport-culling--high-object-counts)
8. [React 19, Next.js & SSR Integration](#8-react-19-nextjs--ssr-integration)
9. [Resource Cleanup & Memory Leaks](#9-resource-cleanup--memory-leaks)

---

## 1. Layer Architecture & Memory Management

### Rule 1.1: Limit Layer Count and Decouple Static from Dynamic Elements
**Why**: Each `<Layer>` allocates two HTML5 `<canvas>` elements:
1. **Scene Canvas**: Sized at `stageWidth * stageHeight * (pixelRatio ^ 2) * 4 bytes`
2. **Hit Canvas**: Sized at `stageWidth * stageHeight * 4 bytes`

On a 1920×1080 display at 2× pixel ratio, a single layer consumes `~41.5 MB` of GPU/RAM. Mobile Safari enforces a strict cap (256 MB–384 MB total across all canvases) and drops to a blank canvas if exceeded. Konva logs a warning when exceeding 5 layers.

#### ❌ Anti-Pattern (Creating a layer per shape or keeping everything on one heavy layer)
```tsx
// Anti-pattern: Redrawing static background grid (1000 lines) every time a player moves
function PitchCanvas({ players }: { players: Player[] }) {
  return (
    <Stage width={1200} height={800}>
      <Layer>
        {/* Heavy static football pitch lines redrawn on every single player movement */}
        <PitchLines />
        {players.map(p => (
          <Circle key={p.id} x={p.x} y={p.y} radius={15} fill="red" draggable />
        ))}
      </Layer>
    </Stage>
  );
}
```

#### ✅ Best Practice (Multi-Layer Separation with Under 5 Layers)
```tsx
// Best practice: Static pitch lines on a non-listening background layer, dynamic players on interactive layer
function PitchCanvas({ players }: { players: Player[] }) {
  return (
    <Stage width={1200} height={800}>
      {/* Layer 1: Static background, completely decoupled from redraws */}
      <Layer listening={false}>
        <PitchLines />
      </Layer>

      {/* Layer 2: Interactive elements that change frequently */}
      <Layer>
        {players.map(p => (
          <PlayerNode key={p.id} player={p} />
        ))}
      </Layer>
    </Stage>
  );
}
```

---

### Rule 1.2: Set `listening={false}` on All Non-Interactive Shapes & Layers
**Why**: In Konva, interactive shapes draw to an internal 2D hit graph with unique color keys for $O(1)$ pointer lookup. In **Konva 10.3.2+**, setting `listening={false}` on a `<Layer>` **completely releases its stage-sized hit canvas from memory**. On decorative shapes, it skips hit canvas drawing entirely, drastically cutting draw times.

#### ❌ Anti-Pattern
```tsx
// Listening left on by default for decorative grass patterns, grid lines, and watermarks
<Layer>
  <PitchGrassPattern /> {/* Generates thousands of hit test paths unnecessarily */}
  <WatermarkText text="CONFIDENTIAL" opacity={0.1} />
</Layer>
```

#### ✅ Best Practice
```tsx
// Completely frees the hit canvas for this entire layer in Konva 10.3.2+
<Layer listening={false}>
  <PitchGrassPattern />
  <WatermarkText text="CONFIDENTIAL" opacity={0.1} />
</Layer>
```

---

## 2. State Management & Drag Operations

### Rule 2.1: Never Invoke `setState` on `dragmove`
**Why**: Canvas drag-and-drop runs at 60–120 FPS. Updating React state (`useState`) during `onDragMove` triggers reconciliation across the entire React component subtree for every pointer move, causing frame drops and severe lag.

#### ❌ Anti-Pattern (React State synchronization on every drag tick)
```tsx
function DraggablePlayer({ id, initialX, initialY }: PlayerProps) {
  const [pos, setPos] = useState({ x: initialX, y: initialY });

  return (
    <Circle
      x={pos.x}
      y={pos.y}
      radius={20}
      fill="blue"
      draggable
      // ❌ Causes React re-render 60 times per second during drag
      onDragMove={(e) => {
        setPos({ x: e.target.x(), y: e.target.y() });
      }}
    />
  );
}
```

#### ✅ Best Practice (Uncontrolled during drag, sync on `dragend`)
```tsx
function DraggablePlayer({ id, x, y, onPositionChange }: PlayerProps) {
  return (
    <Circle
      x={x}
      y={y}
      radius={20}
      fill="blue"
      draggable
      // ✅ Konva moves the node imperatively with 0 React overhead during drag
      onDragEnd={(e) => {
        onPositionChange(id, {
          x: e.target.x(),
          y: e.target.y(),
        });
      }}
    />
  );
}
```

---

### Rule 2.2: Use Transient Updates (Zustand / Refs) for Real-Time Drag HUDs
**Why**: If external components (such as an inspector panel or coordinate tooltip) must show coordinates in real time during drag, bypass React component reconciliation using a ref or a transient store subscriber.

#### ✅ Best Practice
```tsx
import { create } from 'zustand';

interface DragStore {
  coords: { x: number; y: number } | null;
  setCoords: (coords: { x: number; y: number } | null) => void;
}

export const useDragStore = create<DragStore>((set) => ({
  coords: null,
  setCoords: (coords) => set({ coords }),
}));

// In Canvas component:
<Circle
  x={player.x}
  y={player.y}
  draggable
  onDragMove={(e) => {
    // Transient update without re-rendering the Stage or other players
    useDragStore.getState().setCoords({
      x: Math.round(e.target.x()),
      y: Math.round(e.target.y()),
    });
  }}
  onDragEnd={(e) => {
    useDragStore.getState().setCoords(null);
    savePlayerPosition(player.id, e.target.x(), e.target.y());
  }}
/>
```

---

## 3. Transformer & Shape Resizing

### Rule 3.1: Attach Transformer via Node References, Never Store Nodes in State
**Why**: `Transformer.nodes([node])` expects direct Konva Node instances. Storing Konva node objects inside React state leads to circular references, stale references across unmounts, and unnecessary renders.

#### ❌ Anti-Pattern
```tsx
// Anti-pattern: Storing raw Konva instances in React state
const [selectedNode, setSelectedNode] = useState<Konva.Node | null>(null);

<Circle onClick={(e) => setSelectedNode(e.target)} />
<Transformer nodes={selectedNode ? [selectedNode] : []} />
```

#### ✅ Best Practice
```tsx
import { useRef, useEffect } from 'react';
import { Transformer, Rect } from 'react-konva';
import Konva from 'konva';

function SelectableRect({ isSelected, shapeProps, onSelect, onChange }: SelectableProps) {
  const shapeRef = useRef<Konva.Rect>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <Rect
        ref={shapeRef}
        {...shapeProps}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onTransformEnd={() => {
          const node = shapeRef.current;
          if (!node) return;

          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          // Reset scale to 1 to avoid stroke distortion
          node.scaleX(1);
          node.scaleY(1);

          onChange({
            ...shapeProps,
            x: node.x(),
            y: node.y(),
            rotation: node.rotation(),
            width: Math.max(10, node.width() * scaleX),
            height: Math.max(10, node.height() * scaleY),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          flipEnabled={false}
          boundBoxFunc={(oldBox, newBox) => {
            // Prevent negative sizing or collapsing below 10px
            if (Math.abs(newBox.width) < 10 || Math.abs(newBox.height) < 10) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
}
```

---

### Rule 3.2: Always Reset `scaleX(1)` and `scaleY(1)` on `transformend`
**Why**: Konva's `Transformer` scales objects (`scaleX`, `scaleY`) rather than resizing `width` and `height`. Leaving non-1 scale values will:
1. Unevenly stretch stroke widths and border corners.
2. Distort font rendering in `<Text>`.
3. Compound future transformations.

Reset `scaleX(1)` and `scaleY(1)` in `onTransformEnd` and calculate new `width = width * scaleX` and `height = height * scaleY`.

---

## 4. Shape Caching & Filter Performance

### Rule 4.1: Cache Complex Static Groups; Never Cache Rapidly Mutating Nodes
**Why**: `node.cache()` rasterizes a node and its children into an offscreen canvas.
- **Good candidate**: A complex tactical badge containing 50 vector paths that moves as a single unit.
- **Bad candidate**: A shape whose position, size, or color changes every frame. Re-calling `node.cache()` every frame allocates and draws to new canvas memory, performing significantly worse than normal canvas drawing.

#### ❌ Anti-Pattern
```tsx
// Anti-pattern: Re-caching every time position or color changes
useEffect(() => {
  if (shapeRef.current) {
    shapeRef.current.cache(); // Costly reallocation on every render!
  }
}, [x, y, color]);
```

#### ✅ Best Practice
```tsx
function ComplexTacticalMarker({ iconData }: MarkerProps) {
  const groupRef = useRef<Konva.Group>(null);

  useEffect(() => {
    const group = groupRef.current;
    if (group) {
      // Cache once on mount / complex data change
      group.cache();
      group.getLayer()?.batchDraw();
    }
    return () => {
      // Clean up cached canvas memory on unmount
      groupRef.current?.clearCache();
    };
  }, [iconData]);

  return (
    <Group ref={groupRef}>
      {/* Dozens of complex static vector paths */}
      <Path data={iconData.outline} fill="black" />
      <Path data={iconData.insignia} fill="gold" />
      <Path data={iconData.trim} stroke="white" strokeWidth={2} />
    </Group>
  );
}
```

---

### Rule 4.2: Use Konva 10 Native CSS Filter Strings for Blur and Effects
**Why**: In Konva 10, passing CSS filter strings (e.g. `['blur(10px)']`) leverages the browser's hardware-accelerated CSS filter pipeline in modern Chromium and Firefox, executing orders of magnitude faster than legacy CPU-based pixel loops.

#### ✅ Best Practice (Konva 10 Native Filter)
```tsx
import Konva from 'konva';

function BlurredOverlay({ visible }: { visible: boolean }) {
  const shapeRef = useRef<Konva.Rect>(null);

  useEffect(() => {
    const shape = shapeRef.current;
    if (!shape) return;

    if (visible) {
      // Hardware-accelerated filter string in Konva 10
      shape.filters(['blur(8px)']);
      shape.cache();
    } else {
      shape.clearCache();
    }
    shape.getLayer()?.batchDraw();
  }, [visible]);

  return <Rect ref={shapeRef} width={800} height={600} fill="rgba(0,0,0,0.5)" />;
}
```

---

## 5. Drawing Pipeline & Micro-Optimizations

### Rule 5.1: Disable `perfectDrawEnabled` on Opaque Shapes
**Why**: To prevent semi-transparent strokes from showing the underlying shape fill through the border, Konva draws shapes with stroke and fill to an intermediate buffer canvas ("perfect draw"). If your shape is opaque (`opacity={1}`), this buffer pass is completely redundant overhead.

#### ✅ Best Practice
```tsx
// Option A: Per-shape optimization
<Rect
  width={100}
  height={100}
  fill="#2e7d32"
  stroke="#1b5e20"
  strokeWidth={2}
  perfectDrawEnabled={false} // Bypasses buffer canvas draw
/>

// Option B: Global application default (e.g., in canvas initialization module)
import Konva from 'konva';
Konva.Shape.prototype.perfectDrawEnabled = false;
```

---

### Rule 5.2: Disable `shadowForStrokeEnabled`
**Why**: If a shape has both a stroke and a shadow, Konva makes an additional drawing pass specifically to cast shadow from the stroke. If the stroke does not need a shadow, turn it off.

#### ✅ Best Practice
```tsx
<Circle
  radius={30}
  fill="#ffffff"
  stroke="#333333"
  strokeWidth={4}
  shadowColor="rgba(0,0,0,0.3)"
  shadowBlur={10}
  shadowForStrokeEnabled={false} // Skips stroke shadow drawing pass
/>
```

---

### Rule 5.3: Use `Konva.pixelRatio = 1` on Low-Power or Retina Constrained Devices
**Why**: On mobile devices with 3× retina displays, drawing canvas operations scales quadratically ($3^2 = 9\times$ pixels). If animations or complex diagrams stutter on mobile devices, pin the pixel ratio to 1.

```tsx
import Konva from 'konva';

// Run on mobile or performance-constrained environments
if (/iPhone|iPad|Android/i.test(navigator.userAgent)) {
  Konva.pixelRatio = 1;
}
```

---

## 6. Redraw Strategy & Batching

### Rule 6.1: Use `batchDraw()`, Never Call `draw()` Manually
**Why**: `layer.draw()` immediately and synchronously triggers canvas rasterization. If triggered multiple times within the same execution cycle (e.g., several events or prop changes), it causes frame stutter. `layer.batchDraw()` uses `requestAnimationFrame` to batch all changes into a single draw per display refresh.

```tsx
// ❌ Anti-pattern: Forces immediate synchronous drawing
layer.draw();

// ✅ Best practice: Batches redraw cleanly into the next RAF tick
layer.batchDraw();
```

---

## 7. Viewport Culling & High Object Counts

### Rule 7.1: Cull Off-Screen Nodes Using `visible(false)`
**Why**: Konva executes drawing instructions for every child in a Layer, even if the node’s bounding box is outside the visible stage coordinates. Unmounting and remounting nodes in React is costly, but setting `visible(false)` completely skips both the scene drawing and the hit detection passes.

#### ✅ Best Practice (Viewport Culling on Pan/Zoom)
```tsx
function cullOffscreenNodes(stage: Konva.Stage, layer: Konva.Layer) {
  const scale = stage.scaleX();
  const viewRect = {
    x: -stage.x() / scale,
    y: -stage.y() / scale,
    width: stage.width() / scale,
    height: stage.height() / scale,
  };

  layer.getChildren().forEach((node) => {
    // Only test nodes that implement getClientRect
    const intersects = Konva.Util.haveIntersection(viewRect, node.getClientRect());
    if (node.visible() !== intersects) {
      node.visible(intersects);
    }
  });

  layer.batchDraw();
}
```

---

### Rule 7.2: Consolidate Thousands of Items into a Single Custom `<Shape />`
**Why**: 5,000 independent `<Circle />` components create 5,000 Konva nodes, 5,000 coordinate transforms, and 5,000 hit test registrations. If the items are non-interactive particles, trajectories, or pitch heatmap dots, draw them inside a single custom shape's `sceneFunc`.

#### ✅ Best Practice
```tsx
import { Shape } from 'react-konva';

interface HeatPoint {
  x: number;
  y: number;
  intensity: number;
}

function HeatmapLayer({ points }: { points: HeatPoint[] }) {
  return (
    <Shape
      listening={false}
      sceneFunc={(context, shape) => {
        points.forEach((pt) => {
          context.beginPath();
          context.arc(pt.x, pt.y, 12, 0, Math.PI * 2, false);
          context.fillStyle = `rgba(255, 69, 0, ${pt.intensity})`;
          context.fill();
        });
        // Important: tell Konva to apply shape stroke/fill handlers if required
        context.fillStrokeShape(shape);
      }}
    />
  );
}
```

---

## 8. React 19, Next.js & SSR Integration

### Rule 8.1: Disable SSR for `<Stage>` Components in Next.js
**Why**: Konva requires the HTML5 Canvas DOM API (`window.HTMLCanvasElement`). Konva 10 removed native Node canvas bindings from its core package to prevent build crashes in SSR, but `<Stage>` cannot render HTML markup on the server. Always mount the canvas client-side only.

#### ❌ Anti-Pattern
```tsx
// In Next.js App Router (app/canvas/page.tsx)
import { Stage, Layer } from 'react-konva';

export default function CanvasPage() {
  // ❌ Will fail or mismatch during SSR evaluation
  return (
    <Stage width={800} height={600}>
      <Layer />
    </Stage>
  );
}
```

#### ✅ Best Practice (Next.js Dynamic Import)
```tsx
'use client';

import dynamic from 'next/dynamic';

// Dynamically import the canvas implementation with SSR disabled
const TacticalBoard = dynamic(() => import('@/components/TacticalBoard'), {
  ssr: false,
  loading: () => <div className="h-[600px] w-[800px] bg-neutral-900 animate-pulse" />,
});

export default function Page() {
  return (
    <main>
      <h1>Match Tactics</h1>
      <TacticalBoard />
    </main>
  );
}
```

---

### Rule 8.2: Leverage Native React 19 Context Forwarding
**Why**: In `react-konva` 19 (and 18.2.2+), standard React `createContext` values are automatically forwarded across the `<Stage>` boundary into `<Layer>` children. Third-party context bridges or `react-konva-utils` bridge hacks are no longer required.

```tsx
import React, { createContext, useContext } from 'react';
import { Stage, Layer, Text } from 'react-konva';

const TeamColorContext = createContext<string>('blue');

function PlayerLabel() {
  // ✅ Works seamlessly inside <Stage> in react-konva 19
  const teamColor = useContext(TeamColorContext);
  return <Text text="Player 10" fill={teamColor} fontSize={16} />;
}

export function Board() {
  return (
    <TeamColorContext.Provider value="#ff4444">
      <Stage width={500} height={500}>
        <Layer>
          <PlayerLabel />
        </Layer>
      </Stage>
    </TeamColorContext.Provider>
  );
}
```

---

## 9. Resource Cleanup & Memory Leaks

### Rule 9.1: Always Clean Up `Konva.Animation`, `Konva.Tween`, and Event Listeners
**Why**: When a component unmounts, any uncancelled `Konva.Animation` or `Konva.Tween` continues to run in the background, retaining deleted node references and leaking memory.

#### ❌ Anti-Pattern
```tsx
useEffect(() => {
  const anim = new Konva.Animation((frame) => {
    // animate shape...
  }, layer);
  anim.start();
  // ❌ Missing anim.stop() in cleanup: keeps RAF running forever!
}, []);
```

#### ✅ Best Practice
```tsx
useEffect(() => {
  const node = shapeRef.current;
  if (!node) return;

  const tween = new Konva.Tween({
    node,
    duration: 0.5,
    opacity: 1,
    easing: Konva.Easings.EaseInOut,
  });
  tween.play();

  return () => {
    // ✅ Destroy tween and clear node cache
    tween.destroy();
  };
}, []);
```

---

## Summary Checklist for Konva 10 & React-Konva 19

| Category | Optimization Goal | Actionable Pattern |
| :--- | :--- | :--- |
| **Layers** | Minimize canvas memory consumption | Keep layers $\le 3$. Use `listening={false}` on static layers. |
| **Dragging** | Prevent 60 FPS React re-renders | Uncontrolled dragging; update React state only on `onDragEnd`. |
| **Transformer** | Prevent stroke distortion and memory leaks | Attach via `useRef`. Reset `scaleX(1)`/`scaleY(1)` and update `width`/`height` in `onTransformEnd`. |
| **Caching** | Reduce draw complexity | Cache static composite groups. Release cache with `clearCache()` on unmount. |
| **Filters** | Leverage GPU acceleration | In Konva 10, use CSS filter strings `['blur(10px)']`. |
| **Rendering** | Skip redundant offscreen buffer passes | Set `perfectDrawEnabled={false}` and `shadowForStrokeEnabled={false}` on shapes. |
| **SSR / Next.js**| Prevent hydration/canvas SSR crashes | Use Next.js dynamic import with `ssr: false`. |
| **Context** | Share state across Stage boundary | Use standard React 19 `createContext` and `useContext` natively. |
