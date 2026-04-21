import type { EventStrategy } from '../event-strategy';

export const FreeKickStrategy: EventStrategy = {
  id: 'free-kick',
  label: 'Free Kicks',
  description:
    'Set pieces originating from a foul (type.value = 5 in qualifiers)',
  color:
    'bg-amber-600 hover:bg-amber-500 text-white shadow-[0_0_15px_rgba(217,119,6,0.5)]',
  predicate: (event) =>
    event.type_value === 44 ||
    (event.qualifiers || []).some((q: any) => q.type?.value === 5),
};
