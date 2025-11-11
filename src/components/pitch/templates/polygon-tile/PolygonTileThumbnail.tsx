export function PolygonTileThumbnail({ color = "#3b73b9" }) {
  return (
    <svg width={40} height={40} viewBox="0 0 40 40">
      <g
        shapeRendering="crispEdges"
        strokeLinejoin="round"
        fill="none"
        strokeWidth={1.5}
        stroke={color}
        opacity={0.7}
      >
        <polygon points="20,0 20,10 10,10" />
        <polygon points="10,10 10,0 0,10" />
        <polygon points="10,10 0,10 0,20" />
        <polygon points="20,20 10,10 20,10" />
        <polygon points="30,10 40,10 30,20" />
        <polygon points="20,10 30,10 30,0" />
        <polygon points="30,0 40,0 30,10" />
        <polygon points="40,20 30,20 40,10" />
        <polygon points="20,20 20,30 10,30" />
        <polygon points="0,20 10,20 0,30" />
        <polygon points="10,30 10,20 20,30" />
        <polygon points="10,30 0,30 0,40" />
        <polygon points="20,30 20,40 10,40" />
        <polygon points="30,30 40,30 30,20" />
        <polygon points="30,30 20,30 30,20" />
        <polygon points="30,30 30,40 20,40" />
        <polygon points="40,40 40,30 30,40" />
      </g>
      <rect
        width="40"
        height="40"
        fill="none"
        stroke="#888"
        strokeWidth={0.5}
      />
    </svg>
  );
}
