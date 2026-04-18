import type { TLShape } from 'tldraw';
import type { TLLinkLineShape } from './link-line';
import type {
  TLMarkerArrowDashShape,
  TLMarkerArrowSolidShape,
  TLMarkerManMarkShape,
} from './marker-arrow';
import type { TLMarkerConnectorShape } from './marker-connector';
import type { TLMarkerFovShape } from './marker-fov';
import type { TLMarkerShape } from './marker-shape';
import type { TLZonePathShape } from './zone-path';

export type AppShape =
  | TLShape
  | TLMarkerShape
  | TLMarkerArrowSolidShape
  | TLMarkerArrowDashShape
  | TLMarkerManMarkShape
  | TLMarkerFovShape
  | TLMarkerConnectorShape
  | TLLinkLineShape
  | TLZonePathShape;
