export type DefaultFormationPlayer = {
  shirtNo: string;
  position: string;
  x: number;
  y: number;
};

export const DEFAULT_4231_HOME: DefaultFormationPlayer[] = [
  { shirtNo: '1', position: 'GK', x: 7, y: 50 },
  { shirtNo: '2', position: 'RB', x: 20, y: 18 },
  { shirtNo: '5', position: 'CB', x: 18, y: 38 },
  { shirtNo: '6', position: 'CB', x: 18, y: 62 },
  { shirtNo: '3', position: 'LB', x: 20, y: 82 },
  { shirtNo: '4', position: 'DM', x: 30, y: 36 },
  { shirtNo: '8', position: 'DM', x: 30, y: 64 },
  { shirtNo: '7', position: 'RM', x: 42, y: 18 },
  { shirtNo: '10', position: 'AM', x: 40, y: 50 },
  { shirtNo: '11', position: 'LM', x: 42, y: 82 },
  { shirtNo: '9', position: 'ST', x: 46, y: 50 },
];

export const DEFAULT_442_AWAY: DefaultFormationPlayer[] = [
  { shirtNo: '1', position: 'GK', x: 93, y: 50 },
  { shirtNo: '3', position: 'LB', x: 80, y: 18 },
  { shirtNo: '6', position: 'CB', x: 82, y: 38 },
  { shirtNo: '5', position: 'CB', x: 82, y: 62 },
  { shirtNo: '2', position: 'RB', x: 80, y: 82 },
  { shirtNo: '11', position: 'LM', x: 68, y: 18 },
  { shirtNo: '4', position: 'CM', x: 70, y: 38 },
  { shirtNo: '8', position: 'CM', x: 70, y: 62 },
  { shirtNo: '7', position: 'RM', x: 68, y: 82 },
  { shirtNo: '10', position: 'CF', x: 54, y: 40 },
  { shirtNo: '9', position: 'CF', x: 54, y: 60 },
];

export const DEFAULT_442_HOME: DefaultFormationPlayer[] = [
  { shirtNo: '1', position: 'GK', x: 10, y: 50 },
  { shirtNo: '2', position: 'RB', x: 25, y: 20 },
  { shirtNo: '5', position: 'CB', x: 25, y: 37 },
  { shirtNo: '6', position: 'CB', x: 25, y: 63 },
  { shirtNo: '3', position: 'LB', x: 25, y: 80 },
  { shirtNo: '7', position: 'RM', x: 45, y: 20 },
  { shirtNo: '8', position: 'CM', x: 45, y: 37 },
  { shirtNo: '4', position: 'CM', x: 45, y: 63 },
  { shirtNo: '11', position: 'LM', x: 45, y: 80 },
  { shirtNo: '9', position: 'CF', x: 63, y: 37 },
  { shirtNo: '10', position: 'CF', x: 63, y: 63 },
];
