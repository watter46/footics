/**
 * リアルな3D光沢サッカーボール SVG
 * - 球面ラジアルグラデーション (白パネル)
 * - 陰影ラジアルグラデーション (黒パネル)
 * - パネル間のシームライン (縫い目)
 * - 球面光沢ハイライト
 */
export const SOCCER_BALL_SVG = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="ballShine" cx="35%" cy="32%" r="68%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="55%" stop-color="#f8fafc"/>
      <stop offset="85%" stop-color="#cbd5e1"/>
      <stop offset="100%" stop-color="#64748b"/>
    </radialGradient>
    <radialGradient id="patchShine" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#334155"/>
      <stop offset="70%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#090d16"/>
    </radialGradient>
  </defs>
  <!-- 外周ドロップシャドウ & 球体ベース -->
  <circle cx="50" cy="50" r="47.5" fill="url(#ballShine)" stroke="#0f172a" stroke-width="2.5"/>

  <!-- 白パネル間のシームライン (縫い目) -->
  <g stroke="#334155" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <!-- 中心から外周への連結線 -->
    <line x1="50" y1="32.5" x2="50" y2="16.5"/>
    <line x1="66.6" y1="44.6" x2="80.5" y2="39.5"/>
    <line x1="60.3" y1="64.0" x2="69.5" y2="76.5"/>
    <line x1="39.7" y1="64.0" x2="30.5" y2="76.5"/>
    <line x1="33.4" y1="44.6" x2="19.5" y2="39.5"/>

    <!-- 外周ヘキサゴン連結線 -->
    <line x1="50" y1="16.5" x2="68.0" y2="21.5"/>
    <line x1="80.5" y1="39.5" x2="84.5" y2="58.5"/>
    <line x1="69.5" y1="76.5" x2="50.0" y2="84.0"/>
    <line x1="30.5" y1="76.5" x2="15.5" y2="58.5"/>
    <line x1="19.5" y1="39.5" x2="32.0" y2="21.5"/>
    <line x1="32.0" y1="21.5" x2="50.0" y2="16.5"/>
    <line x1="68.0" y1="21.5" x2="80.5" y2="39.5"/>
    <line x1="84.5" y1="58.5" x2="69.5" y2="76.5"/>
    <line x1="50.0" y1="84.0" x2="30.5" y2="76.5"/>
    <line x1="15.5" y1="58.5" x2="19.5" y2="39.5"/>
  </g>

  <!-- 黒五角形パッチ群 (中心 + 外周5箇所) -->
  <!-- 1. 中央の正五角形 -->
  <polygon points="50,32.5 66.6,44.6 60.3,64.0 39.7,64.0 33.4,44.6" fill="url(#patchShine)" stroke="#0f172a" stroke-width="1.2"/>

  <!-- 2. 上部黒パッチ (湾曲外周) -->
  <path d="M 36.5,5.2 A 47.5,47.5 0 0,1 63.5,5.2 L 68.0,21.5 L 50.0,16.5 L 32.0,21.5 Z" fill="url(#patchShine)" stroke="#0f172a" stroke-width="1.2"/>

  <!-- 3. 右上黒パッチ -->
  <path d="M 87.8,25.2 A 47.5,47.5 0 0,1 97.2,50.0 L 84.5,58.5 L 80.5,39.5 L 68.0,21.5 Z" fill="url(#patchShine)" stroke="#0f172a" stroke-width="1.2"/>

  <!-- 4. 右下黒パッチ -->
  <path d="M 82.5,76.8 A 47.5,47.5 0 0,1 59.8,95.5 L 50.0,84.0 L 69.5,76.5 L 84.5,58.5 Z" fill="url(#patchShine)" stroke="#0f172a" stroke-width="1.2"/>

  <!-- 5. 左下黒パッチ -->
  <path d="M 40.2,95.5 A 47.5,47.5 0 0,1 17.5,76.8 L 15.5,58.5 L 30.5,76.5 L 50.0,84.0 Z" fill="url(#patchShine)" stroke="#0f172a" stroke-width="1.2"/>

  <!-- 6. 左上黒パッチ -->
  <path d="M 2.8,50.0 A 47.5,47.5 0 0,1 12.2,25.2 L 32.0,21.5 L 19.5,39.5 L 15.5,58.5 Z" fill="url(#patchShine)" stroke="#0f172a" stroke-width="1.2"/>

  <!-- 球面ハイライト (光沢) -->
  <ellipse cx="38" cy="28" rx="20" ry="12" transform="rotate(-30 38 28)" fill="white" opacity="0.22"/>
</svg>`;

let cachedSoccerBallImage: HTMLImageElement | null = null;
let cachedSoccerBallDataUrl: string | null = null;

export function getSoccerBallDataUrl(): string {
  if (!cachedSoccerBallDataUrl) {
    cachedSoccerBallDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(SOCCER_BALL_SVG)}`;
  }
  return cachedSoccerBallDataUrl;
}

export function getSoccerBallImage(): Promise<HTMLImageElement> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window not available'));
  }
  if (cachedSoccerBallImage && cachedSoccerBallImage.complete) {
    return Promise.resolve(cachedSoccerBallImage);
  }

  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.src = getSoccerBallDataUrl();
    img.onload = () => {
      cachedSoccerBallImage = img;
      resolve(img);
    };
    img.onerror = (err) => reject(err);
  });
}
