import { nanoid } from 'nanoid';

/**
 * Generate a unique ID, optionally prefixed.
 *
 * @param prefix - Optional prefix for the ID (e.g. 'player', 'arrow')
 * @returns Generated unique string ID
 */
export function generateId(prefix?: string): string {
  const id = nanoid();
  return prefix ? `${prefix}_${id}` : id;
}
