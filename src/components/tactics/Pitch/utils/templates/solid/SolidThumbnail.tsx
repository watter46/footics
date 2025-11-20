interface SolidThumbnailProps {
  color?: string;
}

export function SolidThumbnail({ color = "#10b981" }: SolidThumbnailProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className="h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="100" height="100" fill={color} />
    </svg>
  );
}
