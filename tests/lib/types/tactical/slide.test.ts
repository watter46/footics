import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BOUNDARY_BOX,
  DEFAULT_BOUNDARY_BOX_16_9,
} from '@/lib/types/tactical/slide';

describe('tactical slide boundary box defaults', () => {
  it('DEFAULT_BOUNDARY_BOX is unified to DEFAULT_BOUNDARY_BOX_16_9', () => {
    expect(DEFAULT_BOUNDARY_BOX).toBe(DEFAULT_BOUNDARY_BOX_16_9);
    expect(DEFAULT_BOUNDARY_BOX).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      enabled: true,
      visible: false,
      fitTarget: 'pitch',
    });
  });
});
