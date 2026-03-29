import { EventStrategy } from "../event-strategy";

export const CornerKickStrategy: EventStrategy = {
  id: "corner-kick",
  label: "Corner Kicks",
  description: "Events originating from a corner kick",
  color: "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]",
  sqlCondition: "(SELECT count(*) FROM UNNEST(qualifiers) AS t(q) WHERE t.q.type.value = 6) > 0"
};
