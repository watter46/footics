export type FormationLine =
  | 'goalkeeper'
  | 'defender'
  | 'midfielder'
  | 'forward'
  | 'other';

export interface FormationPlayerInput {
  id?: number | string;
  name: string;
  number?: number | null;
  position?: string | null;
}

export interface PlayerCoordinates {
  top: number;
  left: number;
}

export interface FormationWithCoordinates extends FormationPlayerInput {
  line: FormationLine;
  coordinates: PlayerCoordinates;
}

export interface FieldPosition {
  col: number;
  row: number;
}

export interface FieldPositionPlayer extends FormationPlayerInput {
  fieldPosition: FieldPosition;
  [key: string]: unknown;
}

export type GridPlayerNullable = FormationPlayerInput & {
  grid?: string | null;
  isStarter: boolean;
  [key: string]: unknown;
};

export type GridPlayer = GridPlayerNullable & {
  grid: string;
};
