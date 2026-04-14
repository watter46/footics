export interface CaptureRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CaptureMetadata {
  x: number;
  y: number;
  width: number;
  height: number;
  devicePixelRatio: number;
  videoWidth?: number;
  videoHeight?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  originalVideoRect?: CaptureRect;
}

