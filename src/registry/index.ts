import { EventStrategy } from "./event-strategy";
import { FreeKickStrategy } from "./events/free-kick";
import { SuccessfulPassStrategy } from "./events/successful-pass";
import { CornerKickStrategy } from "./events/corner-kick";
import { TargetedPassStrategy } from "./events/targeted-pass";

export const eventStrategies: EventStrategy[] = [
  FreeKickStrategy,
  SuccessfulPassStrategy,
  CornerKickStrategy,
  TargetedPassStrategy,
];
