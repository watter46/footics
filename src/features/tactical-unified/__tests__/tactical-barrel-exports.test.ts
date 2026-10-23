import { describe, expect, it } from 'vitest';
import * as TacticalBarrel from '@/features/tactical-unified';
import * as ToolbarBarrel from '@/features/tactical-unified/panels/toolbar';

describe('Tactical Unified Barrel Exports', () => {
  it('should export all active symbols', () => {
    expect(TacticalBarrel.TacticalUnifiedPage).toBeDefined();
    expect(TacticalBarrel.RightPanel).toBeDefined();
    expect(TacticalBarrel.TimelineBar).toBeDefined();
    expect(TacticalBarrel.TopBar).toBeDefined();
    expect(TacticalBarrel.DrawingToolbar).toBeDefined();
    expect(TacticalBarrel.BoundaryBox).toBeDefined();
    expect(TacticalBarrel.UnifiedCanvas).toBeDefined();
  });

  it('should not export dead panel symbols', () => {
    const barrel = TacticalBarrel as Record<string, unknown>;
    expect(barrel['InspectorPanel']).toBeUndefined();
    expect(barrel['FormationSubPanel']).toBeUndefined();
    expect(barrel['SlideStrip']).toBeUndefined();
  });

  it('should not export dead boundary-box controls from toolbar barrel', () => {
    const toolbar = ToolbarBarrel as Record<string, unknown>;
    expect(toolbar['BoundaryBoxHud']).toBeUndefined();
    expect(toolbar['BoundaryBoxTiltControls']).toBeUndefined();
  });
});
