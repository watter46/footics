import React from 'react';
import { MARKER_ARROW_STROKE_WIDTH } from './marker-styles';

// ---------------------------------------------------------------------------
// SVG path data (inlined from assets/svg/marker.svg)
// ---------------------------------------------------------------------------

export const MARKER_PATHS = [
  // Right arc
  'M58.641 34.7484C59.1516 34.8106 59.3236 35.4345 58.8904 35.7119C56.9266 36.9692 54.1023 38.0766 50.6102 38.9512C46.5029 39.9799 41.6187 40.6497 36.4444 40.8952C36.2016 40.9067 35.9774 40.7657 35.8816 40.5424L35.8362 40.4367C35.6747 40.0606 35.9397 39.639 36.3484 39.617C40.6482 39.3861 44.7004 38.8159 48.1282 37.9574C51.6414 37.0775 54.3747 35.9257 56.0669 34.6145C56.1934 34.5164 56.3524 34.4693 56.5113 34.4887L58.641 34.7484Z',
  // Upper-right arc
  'M48.8509 23.7561C48.9621 23.705 49.0874 23.6915 49.2069 23.718C53.5444 24.6797 57.002 25.9881 59.2266 27.5106C61.2924 28.9243 62.2257 30.4752 61.954 32.0261C61.9088 32.2837 61.6677 32.4493 61.4063 32.4409L59.6372 32.3843C59.2491 32.3719 58.984 31.9873 58.9982 31.5993C59.0448 30.3291 58.1969 29.0682 56.504 27.9096C54.7607 26.7165 52.1761 25.6695 48.9601 24.8473C48.4359 24.7133 48.3593 23.982 48.8509 23.7561V23.7561Z',
  // Top arc
  'M15.7789 24.5673C15.2595 24.3453 15.3274 23.5995 15.8812 23.4877C19.8008 22.697 24.2559 22.2038 28.8975 22.0509C33.708 21.8926 38.56 22.105 43.0423 22.6669C43.5699 22.7331 43.7298 23.4109 43.2921 23.7127L43.0383 23.8877C42.9168 23.9715 42.7684 24.0062 42.6223 23.9855C38.451 23.3942 33.8598 23.1614 29.3113 23.3111C24.7569 23.4611 20.4098 23.9892 16.7088 24.8415C16.5872 24.8695 16.4603 24.8585 16.3455 24.8095L15.7789 24.5673Z',
  // Left arc
  'M3.52222 34.1725C3.34201 34.1894 3.16236 34.1227 3.04466 33.9851C1.70258 32.4171 1.65181 30.765 2.90289 29.1868C4.19057 27.5626 6.81084 26.0754 10.4963 24.8757C10.611 24.8384 10.735 24.838 10.8501 24.874L11.0432 24.9345C11.5882 25.1053 11.596 25.8941 11.0637 26.1011C8.57431 27.0692 6.77764 28.2009 5.8126 29.4182C4.88782 30.5847 4.7534 31.7962 5.4041 32.9737C5.63924 33.3993 5.40955 33.9954 4.9255 34.0408L3.52222 34.1725Z',
  // Bottom-left arc
  'M32 40.415C32 40.7381 31.738 41.0002 31.415 40.9982C26.245 40.9663 21.1853 40.5116 16.7288 39.6771C12.8953 38.9591 9.6249 37.9819 7.1439 36.8194C6.6485 36.5873 6.76315 35.8935 7.30213 35.7996L9.00823 35.5026C9.1431 35.4791 9.28148 35.504 9.40109 35.5705C11.6388 36.8163 14.866 37.8562 18.7655 38.5865C22.6052 39.3056 26.9617 39.6992 31.4149 39.7309C31.738 39.7332 32 39.9949 32 40.318L32 40.415Z',
] as const;

export const MarkerDefs = ({ fid, color, hasArrows }: { fid: string; color: string; hasArrows: boolean }) => (
  <defs>
    {/* Shared drop-shadow filter (white glow for contrast) */}
    <filter
      id={`mds_${fid}`}
      filterUnits="userSpaceOnUse"
      x="-5"
      y="-5"
      width="74"
      height="74"
      colorInterpolationFilters="sRGB"
    >
      <feFlood floodOpacity="0" result="BackgroundImageFix" />
      <feColorMatrix
        in="SourceAlpha"
        type="matrix"
        values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        result="hardAlpha"
      />
      <feOffset />
      <feGaussianBlur stdDeviation="1.5" />
      <feComposite in2="hardAlpha" operator="out" />
      <feColorMatrix
        type="matrix"
        values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0"
      />
      <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
      <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
    </filter>

    {/* Foreground blur for center glow */}
    <filter
      id={`mfb_${fid}`}
      filterUnits="userSpaceOnUse"
      x="0"
      y="17"
      width="63"
      height="29"
      colorInterpolationFilters="sRGB"
    >
      <feFlood floodOpacity="0" result="BackgroundImageFix" />
      <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
      <feGaussianBlur stdDeviation="5" result="effect1_foregroundBlur" />
    </filter>

    {/* Clip path */}
    <clipPath id={`mcp_${fid}`}>
      <rect width="64" height="64" fill="white" />
    </clipPath>

    {/* Arrowhead marker */}
    {hasArrows && (
      <marker
        id={`mah_${fid}`}
        markerWidth="10"
        markerHeight="7"
        refX="9"
        refY="3.5"
        orient="auto"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill={color} />
      </marker>
    )}
  </defs>
);

export const MarkerBaseSVG = ({ scale, fid, color }: { scale: number; fid: string; color: string }) => (
  <g transform={`scale(${scale})`}>
    <g clipPath={`url(#mcp_${fid})`}>
      {MARKER_PATHS.map((d, i) => (
        <g key={i} filter={`url(#mds_${fid})`}>
          <path d={d} fill={color} />
        </g>
      ))}
      {/* Center glow ellipse */}
      <g filter={`url(#mfb_${fid})`}>
        <ellipse cx="31.5" cy="31.5" rx="21.5" ry="4.5" fill={color} />
      </g>
    </g>
  </g>
);
