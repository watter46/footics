import type { EventStrategy } from './event-strategy';
import { CornerKickStrategy } from './events/corner-kick';
import { FreeKickStrategy } from './events/free-kick';
import { SuccessfulPassStrategy } from './events/successful-pass';
import { TargetedPassStrategy } from './events/targeted-pass';

export const eventStrategies: EventStrategy[] = [
  FreeKickStrategy,
  SuccessfulPassStrategy,
  CornerKickStrategy,
  TargetedPassStrategy,
];
