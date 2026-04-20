import type { TLShape } from 'tldraw';
import type { TLCaptureFrameShape } from '../shapes/capture-frame';
import type {
  TLMarkerArrowDashShape,
  TLMarkerArrowSolidShape,
  TLMarkerManMarkShape,
} from '../shapes/marker-arrow';
import type { TLMarkerConnectorShape } from '../shapes/marker-connector';
import type { TLMarkerFovShape } from '../shapes/marker-fov';
import type { TLMarkerShape } from '../shapes/marker-shape';
import type { TLZonePathShape } from '../shapes/zone-path';

export type AppShape =
  | TLShape
  | TLMarkerShape
  | TLMarkerArrowSolidShape
  | TLMarkerArrowDashShape
  | TLMarkerManMarkShape
  | TLMarkerFovShape
  | TLMarkerConnectorShape
  | TLZonePathShape
  | TLCaptureFrameShape;
