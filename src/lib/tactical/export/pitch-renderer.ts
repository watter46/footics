import type {
  AnimationOrientation,
  MarkerOptions,
  TacticalScene,
} from '@/stores/tactical-animation-store';
import type { InterpolatedFrameState } from '../interpolation';
import { getLastName } from '../player-formatting';

export interface RenderContext2D {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  globalAlpha: number;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  lineJoin: CanvasLineJoin;
  miterLimit: number;
  font: string;
  imageSmoothingEnabled: boolean;
  imageSmoothingQuality: ImageSmoothingQuality;

  beginPath(): void;
  closePath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  rect(x: number, y: number, w: number, h: number): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  strokeRect(x: number, y: number, w: number, h: number): void;
  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean,
  ): void;
  ellipse(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean,
  ): void;
  stroke(): void;
  fill(): void;
  clip(): void;
  save(): void;
  restore(): void;
  fillText(text: string, x: number, y: number, maxWidth?: number): void;
  strokeText(text: string, x: number, y: number, maxWidth?: number): void;
  drawImage(image: CanvasImageSource, dx: number, dy: number): void;
  drawImage(
    image: CanvasImageSource,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void;
  clearRect(x: number, y: number, w: number, h: number): void;
}

/**
 * ピッチ背景を一度だけ高精細に描画する
 */
export function drawPitchBackgroundToContext(
  ctx: RenderContext2D,
  width: number,
  height: number,
  orientation: AnimationOrientation,
  backgroundColor = '#020617',
) {
  // 1. 完全不透明なソリッド黒背景
  ctx.save();
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#e2b48d';
  ctx.fillStyle = '#e2b48d';
  ctx.globalAlpha = 0.8;

  if (orientation === 'vertical') {
    // 縦向きピッチ: viewBox "-1 -1 70 107"
    const scaleX = width / 70;
    const scaleY = height / 107;
    const mapX = (sx: number) => (sx + 1) * scaleX;
    const mapY = (sy: number) => (sy + 1) * scaleY;
    const sX = (w: number) => w * scaleX;
    const sY = (h: number) => h * scaleY;

    ctx.lineWidth = Math.max(1, 0.4 * scaleY);

    // 外枠 (0, 0, 68, 105)
    ctx.strokeRect(mapX(0), mapY(0), sX(68), sY(105));

    // ハーフウェーライン (0, 52.5) -> (68, 52.5)
    ctx.beginPath();
    ctx.moveTo(mapX(0), mapY(52.5));
    ctx.lineTo(mapX(68), mapY(52.5));
    ctx.stroke();

    // センターサークル (34, 52.5), r = 9.15
    ctx.beginPath();
    ctx.ellipse(mapX(34), mapY(52.5), sX(9.15), sY(9.15), 0, 0, Math.PI * 2);
    ctx.stroke();

    // センタースポット (34, 52.5), r = 0.4
    ctx.beginPath();
    ctx.ellipse(mapX(34), mapY(52.5), sX(0.4), sY(0.4), 0, 0, Math.PI * 2);
    ctx.fill();

    // トップ ペナルティエリア (13.85, 0, 40.3, 16.5)
    ctx.strokeRect(mapX(13.85), mapY(0), sX(40.3), sY(16.5));

    // トップ ゴールエリア (24.85, 0, 18.3, 5.5)
    ctx.strokeRect(mapX(24.85), mapY(0), sX(18.3), sY(5.5));

    // トップ ペナルティスポット (34, 11), r = 0.3
    ctx.beginPath();
    ctx.ellipse(mapX(34), mapY(11), sX(0.3), sY(0.3), 0, 0, Math.PI * 2);
    ctx.fill();

    // トップ ペナルティアーク (M 26.69 16.5 A 9.15 9.15 0 0 0 41.31 16.5)
    // 中心 (34, 11) から下向き (+Y) に円弧を描く: 右側(37°)から左側(143°)へ時計回り
    const topArcStartAngle = Math.atan2(16.5 - 11, 41.31 - 34);
    const topArcEndAngle = Math.atan2(16.5 - 11, 26.69 - 34);
    ctx.beginPath();
    ctx.ellipse(
      mapX(34),
      mapY(11),
      sX(9.15),
      sY(9.15),
      0,
      topArcStartAngle,
      topArcEndAngle,
      false,
    );
    ctx.stroke();

    // ボトム ペナルティエリア (13.85, 88.5, 40.3, 16.5)
    ctx.strokeRect(mapX(13.85), mapY(88.5), sX(40.3), sY(16.5));

    // ボトム ゴールエリア (24.85, 99.5, 18.3, 5.5)
    ctx.strokeRect(mapX(24.85), mapY(99.5), sX(18.3), sY(5.5));

    // ボトム ペナルティスポット (34, 94), r = 0.3
    ctx.beginPath();
    ctx.ellipse(mapX(34), mapY(94), sX(0.3), sY(0.3), 0, 0, Math.PI * 2);
    ctx.fill();

    // ボトム ペナルティアーク (M 26.69 88.5 A 9.15 9.15 0 0 1 41.31 88.5)
    // 中心 (34, 94) から上向き (-Y) に円弧を描く: 左側(-143°)から右側(-37°)へ時計回り
    const btmArcStartAngle = Math.atan2(88.5 - 94, 26.69 - 34);
    const btmArcEndAngle = Math.atan2(88.5 - 94, 41.31 - 34);
    ctx.beginPath();
    ctx.ellipse(
      mapX(34),
      mapY(94),
      sX(9.15),
      sY(9.15),
      0,
      btmArcStartAngle,
      btmArcEndAngle,
      false,
    );
    ctx.stroke();
  } else {
    // 横向きピッチ: viewBox "-1 -1 107 70"
    const scaleX = width / 107;
    const scaleY = height / 70;
    const mapX = (sx: number) => (sx + 1) * scaleX;
    const mapY = (sy: number) => (sy + 1) * scaleY;
    const sX = (w: number) => w * scaleX;
    const sY = (h: number) => h * scaleY;

    ctx.lineWidth = Math.max(1, 0.4 * scaleX);

    // 外枠 (0, 0, 105, 68)
    ctx.strokeRect(mapX(0), mapY(0), sX(105), sY(68));

    // ハーフウェーライン (52.5, 0) -> (52.5, 68)
    ctx.beginPath();
    ctx.moveTo(mapX(52.5), mapY(0));
    ctx.lineTo(mapX(52.5), mapY(68));
    ctx.stroke();

    // センターサークル (52.5, 34), r = 9.15
    ctx.beginPath();
    ctx.ellipse(mapX(52.5), mapY(34), sX(9.15), sY(9.15), 0, 0, Math.PI * 2);
    ctx.stroke();

    // センタースポット (52.5, 34), r = 0.4
    ctx.beginPath();
    ctx.ellipse(mapX(52.5), mapY(34), sX(0.4), sY(0.4), 0, 0, Math.PI * 2);
    ctx.fill();

    // 左 ペナルティエリア (0, 13.85, 16.5, 40.3)
    ctx.strokeRect(mapX(0), mapY(13.85), sX(16.5), sY(40.3));

    // 左 ゴールエリア (0, 24.85, 5.5, 18.3)
    ctx.strokeRect(mapX(0), mapY(24.85), sX(5.5), sY(18.3));

    // 左 ペナルティスポット (11, 34), r = 0.3
    ctx.beginPath();
    ctx.ellipse(mapX(11), mapY(34), sX(0.3), sY(0.3), 0, 0, Math.PI * 2);
    ctx.fill();

    // 左 ペナルティアーク (M 16.5 26.69 A 9.15 9.15 0 0 1 16.5 41.31)
    // 中心 (11, 34) から右向き (+X) に円弧を描く: 上側(-53°)から下側(+53°)へ時計回り
    const leftArcStartAngle = Math.atan2(26.69 - 34, 16.5 - 11);
    const leftArcEndAngle = Math.atan2(41.31 - 34, 16.5 - 11);
    ctx.beginPath();
    ctx.ellipse(
      mapX(11),
      mapY(34),
      sX(9.15),
      sY(9.15),
      0,
      leftArcStartAngle,
      leftArcEndAngle,
      false,
    );
    ctx.stroke();

    // 右 ペナルティエリア (88.5, 13.85, 16.5, 40.3)
    ctx.strokeRect(mapX(88.5), mapY(13.85), sX(16.5), sY(40.3));

    // 右 ゴールエリア (99.5, 24.85, 5.5, 18.3)
    ctx.strokeRect(mapX(99.5), mapY(24.85), sX(5.5), sY(18.3));

    // 右 ペナルティスポット (94, 34), r = 0.3
    ctx.beginPath();
    ctx.ellipse(mapX(94), mapY(34), sX(0.3), sY(0.3), 0, 0, Math.PI * 2);
    ctx.fill();

    // 右 ペナルティアーク (M 88.5 26.69 A 9.15 9.15 0 0 0 88.5 41.31)
    // 中心 (94, 34) から左向き (-X) に円弧を描く: 下側(+127°)から上側(-127°)へ時計回り (180°を経由)
    const rightArcStartAngle = Math.atan2(41.31 - 34, 88.5 - 94);
    const rightArcEndAngle = Math.atan2(26.69 - 34, 88.5 - 94);
    ctx.beginPath();
    ctx.ellipse(
      mapX(94),
      mapY(34),
      sX(9.15),
      sY(9.15),
      0,
      rightArcStartAngle,
      rightArcEndAngle,
      false,
    );
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * OffscreenCanvas を用いてピッチ背景のキャッシュキャンバスを生成
 */
export function createPitchBackground(
  width: number,
  height: number,
  orientation: AnimationOrientation,
  backgroundColor = '#020617',
): OffscreenCanvas {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d', {
    alpha: false,
    desynchronized: true,
  });
  if (!ctx) {
    throw new Error('Failed to create 2d context for pitch background');
  }

  drawPitchBackgroundToContext(
    ctx as unknown as RenderContext2D,
    width,
    height,
    orientation,
    backgroundColor,
  );
  return canvas;
}

export interface PlayerMetadata {
  playerId: string;
  name: string;
  shirtNo: string;
  team: 'home' | 'away';
  options: MarkerOptions;
}

/**
 * シーン配列から全選手のメタデータ辞書を構築
 */
export function extractPlayerMetadataMap(
  scenes: TacticalScene[],
): Map<string, PlayerMetadata> {
  const map = new Map<string, PlayerMetadata>();
  scenes.forEach((scene) => {
    Object.values(scene.players).forEach((p) => {
      if (!map.has(p.playerId)) {
        map.set(p.playerId, {
          playerId: p.playerId,
          name: p.name,
          shirtNo: p.shirtNo,
          team: p.team,
          options: { ...p.options },
        });
      }
    });
  });
  return map;
}

/**
 * サッカーボールを一度だけ高精細に事前描画した OffscreenCanvas を生成
 */
export function createSoccerBallCanvas(ballRadius: number): OffscreenCanvas {
  const size = Math.max(64, Math.ceil(ballRadius * 4));
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return canvas;

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.46;

  ctx.save();

  // 1. 球面ベース (3D 光沢ラジアルグラデーション)
  const ballShine = ctx.createRadialGradient(
    cx - r * 0.3,
    cy - r * 0.36,
    r * 0.05,
    cx,
    cy,
    r,
  );
  ballShine.addColorStop(0, '#ffffff');
  ballShine.addColorStop(0.55, '#f8fafc');
  ballShine.addColorStop(0.85, '#cbd5e1');
  ballShine.addColorStop(1, '#64748b');

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = ballShine;
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = Math.max(1.5, r * 0.05);
  ctx.stroke();

  // 2. パネル間のシームライン (縫い目)
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = Math.max(1, r * 0.038);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const mapSvg = (x: number, y: number) => ({
    x: cx + ((x - 50) / 47.5) * r,
    y: cy + ((y - 50) / 47.5) * r,
  });

  // シームライン群
  const seams: [number, number, number, number][] = [
    [50, 32.5, 50, 16.5],
    [66.6, 44.6, 80.5, 39.5],
    [60.3, 64.0, 69.5, 76.5],
    [39.7, 64.0, 30.5, 76.5],
    [33.4, 44.6, 19.5, 39.5],
    [50, 16.5, 68.0, 21.5],
    [80.5, 39.5, 84.5, 58.5],
    [69.5, 76.5, 50.0, 84.0],
    [30.5, 76.5, 15.5, 58.5],
    [19.5, 39.5, 32.0, 21.5],
    [32.0, 21.5, 50.0, 16.5],
    [68.0, 21.5, 80.5, 39.5],
    [84.5, 58.5, 69.5, 76.5],
    [50.0, 84.0, 30.5, 76.5],
    [15.5, 58.5, 19.5, 39.5],
  ];

  ctx.beginPath();
  seams.forEach(([x1, y1, x2, y2]) => {
    const p1 = mapSvg(x1, y1);
    const p2 = mapSvg(x2, y2);
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
  });
  ctx.stroke();

  // 3. 黒パッチの陰影ラジアルグラデーション
  const patchShine = ctx.createRadialGradient(
    cx - r * 0.3,
    cy - r * 0.3,
    r * 0.1,
    cx,
    cy,
    r,
  );
  patchShine.addColorStop(0, '#334155');
  patchShine.addColorStop(0.7, '#1e293b');
  patchShine.addColorStop(1, '#090d16');

  ctx.fillStyle = patchShine;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = Math.max(1, r * 0.025);

  // 中央五角形
  const centerPentagon = [
    [50, 32.5],
    [66.6, 44.6],
    [60.3, 64.0],
    [39.7, 64.0],
    [33.4, 44.6],
  ];
  ctx.beginPath();
  centerPentagon.forEach(([x, y], idx) => {
    const pt = mapSvg(x, y);
    if (idx === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 外周 5 パッチ
  const outerPatches = [
    // Top
    [
      [36.5, 5.2],
      [63.5, 5.2],
      [68.0, 21.5],
      [50.0, 16.5],
      [32.0, 21.5],
    ],
    // Top-Right
    [
      [87.8, 25.2],
      [97.2, 50.0],
      [84.5, 58.5],
      [80.5, 39.5],
      [68.0, 21.5],
    ],
    // Bottom-Right
    [
      [82.5, 76.8],
      [59.8, 95.5],
      [50.0, 84.0],
      [69.5, 76.5],
      [84.5, 58.5],
    ],
    // Bottom-Left
    [
      [40.2, 95.5],
      [17.5, 76.8],
      [15.5, 58.5],
      [30.5, 76.5],
      [50.0, 84.0],
    ],
    // Top-Left
    [
      [2.8, 50.0],
      [12.2, 25.2],
      [32.0, 21.5],
      [19.5, 39.5],
      [15.5, 58.5],
    ],
  ];

  outerPatches.forEach((pts) => {
    ctx.beginPath();
    pts.forEach(([x, y], idx) => {
      const pt = mapSvg(x, y);
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  // 4. 球面ハイライト (光沢)
  ctx.save();
  const hl = mapSvg(38, 28);
  ctx.translate(hl.x, hl.y);
  ctx.rotate((-30 * Math.PI) / 180);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.42, r * 0.25, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.fill();
  ctx.restore();

  ctx.restore();
  return canvas;
}

/**
 * 選手マーカーをそれぞれ一度だけ事前描画した OffscreenCanvas のマップを生成
 */
export function preRenderPlayerMarkers(
  playerMetadataMap: Map<string, PlayerMetadata>,
  width: number,
  height: number,
  photos?: Record<string, ImageBitmap>,
): Map<string, OffscreenCanvas> {
  const map = new Map<string, OffscreenCanvas>();
  const baseDim = Math.min(width, height);

  playerMetadataMap.forEach((meta, playerId) => {
    const sizeScale = meta.options.sizeScale ?? 1.0;
    const playerRadius = baseDim * 0.032 * sizeScale;

    // マーカーとラベルが収まる十分なサイズを確保
    const canvasSize = Math.ceil(playerRadius * 8);
    const canvas = new OffscreenCanvas(canvasSize, canvasSize);
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const cx = canvasSize / 2;
    const cy = canvasSize / 2;

    // マーカー本体サークル (円)
    ctx.beginPath();
    ctx.arc(cx, cy, playerRadius, 0, Math.PI * 2);
    ctx.fillStyle = meta.options.color;
    ctx.fill();

    const hasStroke =
      meta.options.strokeWidth !== 0 && meta.options.strokeColor !== 'none';
    if (hasStroke) {
      ctx.strokeStyle = meta.options.strokeColor || '#ffffff';
      ctx.lineWidth = Math.max(
        1,
        (meta.options.strokeWidth ?? 2) * (playerRadius * 0.06),
      );
      ctx.stroke();
    }

    // 内部コンテンツ (写真 または 背番号)
    const photoBitmap = photos?.[playerId];
    if (meta.options.insideContent === 'photo' && photoBitmap) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, playerRadius * 0.85, 0, Math.PI * 2);
      ctx.clip();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        photoBitmap,
        cx - playerRadius * 0.85,
        cy - playerRadius * 0.85,
        playerRadius * 1.7,
        playerRadius * 1.7,
      );
      ctx.restore();
    } else if (meta.options.insideContent === 'number' && meta.shirtNo) {
      const numberScale = meta.options.numberSizeScale ?? 1.0;
      const fontSize = Math.round(playerRadius * 1.15 * numberScale);
      ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(meta.shirtNo, cx, cy);
    }

    // 下部ラベル (ラストネーム / 背番号: 高精細アウトライン縁取り + 白文字フィル)
    if (meta.options.bottomLabel !== 'none') {
      const labelText =
        meta.options.bottomLabel === 'name'
          ? getLastName(meta.name)
          : meta.shirtNo
            ? `#${meta.shirtNo}`
            : '';

      if (labelText) {
        const labelScale = meta.options.labelSizeScale ?? 1.0;
        const labelFontSize = Math.max(
          8,
          Math.round(playerRadius * 0.8 * labelScale),
        );
        ctx.font = `bold ${labelFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const labelY =
          cy + playerRadius * 1.3 + Math.round(labelFontSize * 0.5);

        // ストローク縁取り (黒アウトラインで文字つぶれ防止)
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = Math.max(2, playerRadius * 0.16);
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.strokeText(labelText, cx, labelY);

        // 白文字フィル
        ctx.fillStyle = '#ffffff';
        ctx.fillText(labelText, cx, labelY);
      }
    }

    map.set(playerId, canvas);
  });

  return map;
}

/**
 * 1フレーム分の全要素（背景・選手マーカー・ボール）を Canvas 2D で直接描画
 */
export function renderPitchFrame(
  ctx: RenderContext2D,
  bgCanvas: CanvasImageSource,
  frameState: InterpolatedFrameState,
  playerMetadataMap: Map<string, PlayerMetadata>,
  width: number,
  height: number,
  photos?: Record<string, ImageBitmap>,
  teamVisibility?: 'both' | 'home' | 'away',
  ballCanvas?: CanvasImageSource,
  playerCanvasMap?: Map<string, OffscreenCanvas>,
) {
  // 1. 事前キャッシュされたピッチ背景をゼロコピー転送 (超高速 GPU blit)
  ctx.drawImage(bgCanvas, 0, 0, width, height);

  const baseDim = Math.min(width, height);
  const ballRadius = baseDim * 0.022;

  // 2. 選手マーカーの描画
  Object.entries(frameState.players).forEach(([playerId, pState]) => {
    if (!pState.visible || pState.opacity <= 0) return;

    const meta = playerMetadataMap.get(playerId);
    if (!meta) return;
    if (
      teamVisibility &&
      teamVisibility !== 'both' &&
      meta.team !== teamVisibility
    ) {
      return;
    }

    const sizeScale = meta.options.sizeScale ?? 1.0;
    const playerRadius = baseDim * 0.032 * sizeScale;

    const pxX = (pState.x / 100) * width;
    const pxY = (pState.y / 100) * height;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, pState.opacity));

    const playerCanvas = playerCanvasMap?.get(playerId);
    if (playerCanvas) {
      // 事前レンダリングされた Canvas をそのまま高速描画
      const cx = playerCanvas.width / 2;
      const cy = playerCanvas.height / 2;
      ctx.drawImage(playerCanvas, pxX - cx, pxY - cy);
    } else {
      // フォールバック (キャッシュがない場合)
      // マーカー本体サークル (円)
      ctx.beginPath();
      ctx.arc(pxX, pxY, playerRadius, 0, Math.PI * 2);
      ctx.fillStyle = meta.options.color;
      ctx.fill();

      const hasStroke =
        meta.options.strokeWidth !== 0 && meta.options.strokeColor !== 'none';
      if (hasStroke) {
        ctx.strokeStyle = meta.options.strokeColor || '#ffffff';
        ctx.lineWidth = Math.max(
          1,
          (meta.options.strokeWidth ?? 2) * (playerRadius * 0.06),
        );
        ctx.stroke();
      }

      // 内部コンテンツ (写真 または 背番号)
      const photoBitmap = photos?.[playerId];
      if (meta.options.insideContent === 'photo' && photoBitmap) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(pxX, pxY, playerRadius * 0.85, 0, Math.PI * 2);
        ctx.clip();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(
          photoBitmap,
          pxX - playerRadius * 0.85,
          pxY - playerRadius * 0.85,
          playerRadius * 1.7,
          playerRadius * 1.7,
        );
        ctx.restore();
      } else if (meta.options.insideContent === 'number' && meta.shirtNo) {
        const numberScale = meta.options.numberSizeScale ?? 1.0;
        const fontSize = Math.round(playerRadius * 1.15 * numberScale);
        ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(meta.shirtNo, pxX, pxY);
      }

      // 下部ラベル (ラストネーム / 背番号: 高精細アウトライン縁取り + 白文字フィル)
      if (meta.options.bottomLabel !== 'none') {
        const labelText =
          meta.options.bottomLabel === 'name'
            ? getLastName(meta.name)
            : meta.shirtNo
              ? `#${meta.shirtNo}`
              : '';

        if (labelText) {
          const labelScale = meta.options.labelSizeScale ?? 1.0;
          const labelFontSize = Math.max(
            8,
            Math.round(playerRadius * 0.8 * labelScale),
          );
          ctx.font = `bold ${labelFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const labelY =
            pxY + playerRadius * 1.3 + Math.round(labelFontSize * 0.5);

          // ストローク縁取り (黒アウトラインで文字つぶれ防止)
          ctx.strokeStyle = '#020617';
          ctx.lineWidth = Math.max(2, playerRadius * 0.16);
          ctx.lineJoin = 'round';
          ctx.miterLimit = 2;
          ctx.strokeText(labelText, pxX, labelY);

          // 白文字フィル
          ctx.fillStyle = '#ffffff';
          ctx.fillText(labelText, pxX, labelY);
        }
      }
    }

    ctx.restore();
  });

  // 3. ボールマーカーの描画 (事前キャッシュされた Canvas または Bitmap から超高速 blit)
  if (frameState.ballPos) {
    const ballPxX = (frameState.ballPos.x / 100) * width;
    const ballPxY = (frameState.ballPos.y / 100) * height;

    const ballBitmap = photos?.ball || ballCanvas;
    if (ballBitmap) {
      ctx.drawImage(
        ballBitmap,
        ballPxX - ballRadius,
        ballPxY - ballRadius,
        ballRadius * 2,
        ballRadius * 2,
      );
    } else {
      ctx.save();
      ctx.beginPath();
      ctx.arc(ballPxX, ballPxY, ballRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = Math.max(1.2, ballRadius * 0.08);
      ctx.stroke();
      ctx.restore();
    }
  }
}
