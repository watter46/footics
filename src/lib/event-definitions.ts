export interface EventItem {
  label: string;
  keywords: string[];
}

export interface EventSubGroup {
  name: string;
  events: EventItem[];
}

export interface EventGroup {
  id: string; // "AT", "DF", etc.
  name: string; // "攻撃", "守備", etc.
  color: string; // "#2E5BFF", etc.
  shortcutKey: string; // "1", "2", "3", etc. for Ctrl+1
  subGroups: EventSubGroup[];
}

import { AT_GROUP } from './data/event-groups/at';
import { DE_GROUP } from './data/event-groups/de';
import { DF_GROUP } from './data/event-groups/df';
import { GK_GROUP } from './data/event-groups/gk';
import { MT_GROUP } from './data/event-groups/mt';
import { TR_GROUP } from './data/event-groups/tr';

export const EVENT_GROUPS: EventGroup[] = [
  AT_GROUP,
  DF_GROUP,
  TR_GROUP,
  GK_GROUP,
  DE_GROUP,
  MT_GROUP,
];

export interface FlattenedEvent {
  label: string;
  keywords: string[];
  groupCode: string;
  groupName: string;
  groupColor: string;
  subGroupName: string;
  shortcutKey: string;
}

export function getFlattenedEvents(): FlattenedEvent[] {
  const result: FlattenedEvent[] = [];
  for (const group of EVENT_GROUPS) {
    for (const subGroup of group.subGroups) {
      for (const event of subGroup.events) {
        result.push({
          label: event.label,
          keywords: event.keywords,
          groupCode: group.id,
          groupName: group.name,
          groupColor: group.color,
          subGroupName: subGroup.name,
          shortcutKey: group.shortcutKey,
        });
      }
    }
  }
  return result;
}

export function getEventMetadata(label: string): FlattenedEvent | null {
  const flattened = getFlattenedEvents();
  return flattened.find((e) => e.label === label) || null;
}
