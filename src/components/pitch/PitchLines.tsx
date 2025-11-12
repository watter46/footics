import type { FieldCourtOptions, FieldLineOptions } from './types';

interface PitchLinesProps {
  court: FieldCourtOptions;
  line: FieldLineOptions;
}

/**
 * フィールドラインコンポーネント（SVGベース）
 *
 * 台形・カスタムフレーム時の3D変形に対応したフィールドライン描画。
 * ハーフコートは上側にハーフウェーライン＋半円センターサークル、
 * 下側にペナルティエリアのみ表示。
 */
export function PitchLines({ court, line }: PitchLinesProps) {
  // SVGビューボックス（基準座標系）
  const viewBox = '0 0 400 600'; // width: 400, height: 600

  // フィールドサイズ（SVG座標）
  const fieldWidth = 480;
  const fieldHeight = 600;
  const fieldX = (400 - fieldWidth) / 2; // 中央配置
  const fieldY = (600 - fieldHeight) / 2; // 中央配置

  // エリアサイズ（フィールド幅の3.2/5 = 64%）
  const penaltyAreaWidth = fieldWidth * 0.64;
  const penaltyAreaHalfWidth = penaltyAreaWidth / 2;
  // ハーフコート時はペナルティエリアを大きくする
  const penaltyAreaHeight = court === 'half' ? 120 : 90;
  const goalAreaWidth = fieldWidth * 0.35;
  const goalAreaHalfWidth = goalAreaWidth / 2;
  const goalAreaHeight = 25;

  // ライン描画共通設定（線の結合部分を滑らかにして重なりを防ぐ）
  const lineProps = {
    stroke: line.color,
    strokeWidth: line.width,
    strokeOpacity: line.opacity,
    fill: 'none',
    strokeLinejoin: 'miter' as const,
    strokeLinecap: 'square' as const,
    vectorEffect: 'non-scaling-stroke' as const,
  };

  return (
    <div className="pointer-events-none absolute inset-0">
      <svg
        className="h-full w-full"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* フィールド外枠 */}
        <rect
          x={fieldX}
          y={fieldY}
          width={fieldWidth}
          height={fieldHeight}
          {...lineProps}
        />

        {court === 'full' ? (
          // フルコート
          <>
            {/* 中央線 */}
            <line
              x1={fieldX}
              y1={fieldY + fieldHeight / 2}
              x2={fieldX + fieldWidth}
              y2={fieldY + fieldHeight / 2}
              {...lineProps}
            />

            {/* センターサークル */}
            <circle
              cx={fieldX + fieldWidth / 2}
              cy={fieldY + fieldHeight / 2}
              r={40}
              {...lineProps}
            />

            {/* ペナルティエリア（上部） - 外枠との重なりを避けて1px内側から描画 */}
            <path
              d={`M ${fieldX + fieldWidth / 2 - penaltyAreaHalfWidth} ${
                fieldY + 1
              }
                  L ${fieldX + fieldWidth / 2 - penaltyAreaHalfWidth} ${
                fieldY + penaltyAreaHeight
              }
                  L ${fieldX + fieldWidth / 2 + penaltyAreaHalfWidth} ${
                fieldY + penaltyAreaHeight
              }
                  L ${fieldX + fieldWidth / 2 + penaltyAreaHalfWidth} ${
                fieldY + 1
              }`}
              {...lineProps}
            />

            {/* ペナルティエリア（下部） - 外枠との重なりを避けて1px内側から描画 */}
            <path
              d={`M ${fieldX + fieldWidth / 2 - penaltyAreaHalfWidth} ${
                fieldY + fieldHeight - 1
              }
                  L ${fieldX + fieldWidth / 2 - penaltyAreaHalfWidth} ${
                fieldY + fieldHeight - penaltyAreaHeight
              }
                  L ${fieldX + fieldWidth / 2 + penaltyAreaHalfWidth} ${
                fieldY + fieldHeight - penaltyAreaHeight
              }
                  L ${fieldX + fieldWidth / 2 + penaltyAreaHalfWidth} ${
                fieldY + fieldHeight - 1
              }`}
              {...lineProps}
            />

            {/* ゴールエリア（上部） - 外枠との重なりを避けて1px内側から描画 */}
            <path
              d={`M ${fieldX + fieldWidth / 2 - goalAreaHalfWidth} ${fieldY + 1}
                  L ${fieldX + fieldWidth / 2 - goalAreaHalfWidth} ${
                fieldY + goalAreaHeight
              }
                  L ${fieldX + fieldWidth / 2 + goalAreaHalfWidth} ${
                fieldY + goalAreaHeight
              }
                  L ${fieldX + fieldWidth / 2 + goalAreaHalfWidth} ${
                fieldY + 1
              }`}
              {...lineProps}
            />

            {/* ゴールエリア（下部） - 外枠との重なりを避けて1px内側から描画 */}
            <path
              d={`M ${fieldX + fieldWidth / 2 - goalAreaHalfWidth} ${
                fieldY + fieldHeight - 1
              }
                  L ${fieldX + fieldWidth / 2 - goalAreaHalfWidth} ${
                fieldY + fieldHeight - goalAreaHeight
              }
                  L ${fieldX + fieldWidth / 2 + goalAreaHalfWidth} ${
                fieldY + fieldHeight - goalAreaHeight
              }
                  L ${fieldX + fieldWidth / 2 + goalAreaHalfWidth} ${
                fieldY + fieldHeight - 1
              }`}
              {...lineProps}
            />
          </>
        ) : (
          // ハーフコート
          <>
            {/* ハーフウェーライン（上辺） */}
            <line
              x1={fieldX}
              y1={fieldY}
              x2={fieldX + fieldWidth}
              y2={fieldY}
              {...lineProps}
            />

            {/* 半円センターサークル（下向き・大きめ） */}
            <path
              d={`M ${fieldX + fieldWidth / 2 - 60} ${fieldY} 
                  A 60 60 0 0 0 ${fieldX + fieldWidth / 2 + 60} ${fieldY}`}
              {...lineProps}
            />

            {/* ペナルティエリア（下部のみ） - 外枠との重なりを避けて1px内側から描画 */}
            <path
              d={`M ${fieldX + fieldWidth / 2 - penaltyAreaHalfWidth} ${
                fieldY + fieldHeight - 1
              }
                  L ${fieldX + fieldWidth / 2 - penaltyAreaHalfWidth} ${
                fieldY + fieldHeight - penaltyAreaHeight
              }
                  L ${fieldX + fieldWidth / 2 + penaltyAreaHalfWidth} ${
                fieldY + fieldHeight - penaltyAreaHeight
              }
                  L ${fieldX + fieldWidth / 2 + penaltyAreaHalfWidth} ${
                fieldY + fieldHeight - 1
              }`}
              {...lineProps}
            />

            {/* ゴールエリア（下部のみ） - 外枠との重なりを避けて1px内側から描画 */}
            <path
              d={`M ${fieldX + fieldWidth / 2 - goalAreaHalfWidth} ${
                fieldY + fieldHeight - 1
              }
                  L ${fieldX + fieldWidth / 2 - goalAreaHalfWidth} ${
                fieldY + fieldHeight - goalAreaHeight
              }
                  L ${fieldX + fieldWidth / 2 + goalAreaHalfWidth} ${
                fieldY + fieldHeight - goalAreaHeight
              }
                  L ${fieldX + fieldWidth / 2 + goalAreaHalfWidth} ${
                fieldY + fieldHeight - 1
              }`}
              {...lineProps}
            />
          </>
        )}
      </svg>
    </div>
  );
}
