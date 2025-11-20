export function GridDiagonalThumbnail({ color = "#ff2e8b", spacing = 10 }) {
  return (
    <svg
      width={40}
      height={40}
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g
        strokeWidth={1}
        stroke={color}
        fill="none"
        strokeLinecap="square"
        opacity={1}
      >
        <line x1="0" y1="0" x2={spacing} y2={spacing} />
        <line x1={spacing} y1="0" x2={spacing * 2} y2={spacing} />
        <line x1={spacing * 2} y1="0" x2={spacing * 3} y2={spacing} />
        <line x1={spacing * 3} y1="0" x2={spacing * 4} y2={spacing} />

        <line x1={spacing} y1={spacing} x2="0" y2={spacing * 2} />
        <line x1={spacing} y1={spacing} x2={spacing * 2} y2={spacing * 2} />
        <line x1={spacing * 3} y1={spacing} x2={spacing * 2} y2={spacing * 2} />
        <line x1={spacing * 3} y1={spacing} x2={spacing * 4} y2={spacing * 2} />

        <line x1={spacing} y1={spacing * 2} x2="0" y2={spacing * 3} />
        <line x1={spacing * 2} y1={spacing * 2} x2={spacing} y2={spacing * 3} />
        <line
          x1={spacing * 2}
          y1={spacing * 2}
          x2={spacing * 3}
          y2={spacing * 3}
        />
        <line
          x1={spacing * 3}
          y1={spacing * 2}
          x2={spacing * 4}
          y2={spacing * 3}
        />

        <line x1={0} y1={spacing * 3} x2={spacing} y2={spacing * 4} />
        <line x1={spacing} y1={spacing * 3} x2={spacing * 2} y2={spacing * 4} />
        <line
          x1={spacing * 3}
          y1={spacing * 3}
          x2={spacing * 2}
          y2={spacing * 4}
        />
        <line
          x1={spacing * 4}
          y1={spacing * 3}
          x2={spacing * 3}
          y2={spacing * 4}
        />
      </g>
    </svg>
  );
}
