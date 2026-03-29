import { EventStrategy } from "../event-strategy";

export const SuccessfulPassStrategy: EventStrategy = {
  id: "successful-pass",
  label: "Successful Passes",
  description: "Completed passes between teammates (type_value = 1 and outcome = true)",
  color: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(5,150,105,0.5)]",
  sqlCondition: "type_value = 1 AND outcome = true"
};
