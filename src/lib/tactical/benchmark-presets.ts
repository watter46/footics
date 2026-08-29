/**
 * benchmark-presets.ts
 * Pre-configured tactical scenarios for animation & video export benchmark verification:
 * 1. Low Block Penetration (3 Slides: Rest Defense -> Overload Flank -> Cutback & Shot)
 * 2. High Press vs Build-up (2 Slides: Deep Build-up Trap -> Pressing Trigger & Turnover)
 */

import type { Slide, TacticalProject } from '@/lib/types/tactical-unified';
import { createDefaultPlayer } from '@/lib/types/tactical-unified';

const HOME_COLOR = '#034694'; // Chelsea Blue
const AWAY_COLOR = '#dc2626'; // Opponent Red

/**
 * 1. Low Block Penetration Preset (3 Slides)
 */
export function createLowBlockBenchmarkProject(): TacticalProject {
  const now = new Date().toISOString();
  const projectId = crypto.randomUUID();
  const slide1Id = crypto.randomUUID();
  const slide2Id = crypto.randomUUID();
  const slide3Id = crypto.randomUUID();

  // Slide 1: Setup - Attacking shape vs 5-4-1 Deep Low Block
  const slide1: Slide = {
    id: slide1Id,
    index: 0,
    label: '1. Structured Block',
    transitionDurationMs: 1200,
    pauseMs: 600,
    easing: 'ease-in-out',
    ball: { x: 52, y: 35, visible: true },
    boundaryBox: {
      enabled: true,
      x: 30,
      y: 10,
      width: 70,
      height: 80,
    },
    players: [
      // HOME (Attacking, Right direction)
      {
        ...createDefaultPlayer('home', 42, 35, HOME_COLOR),
        shirtNo: '8',
        position: 'CM',
      },
      {
        ...createDefaultPlayer('home', 35, 65, HOME_COLOR),
        shirtNo: '25',
        position: 'DMC',
      },
      {
        ...createDefaultPlayer('home', 65, 18, HOME_COLOR),
        shirtNo: '7',
        position: 'AMR',
      },
      {
        ...createDefaultPlayer('home', 58, 38, HOME_COLOR),
        shirtNo: '20',
        position: 'AMC',
      },
      {
        ...createDefaultPlayer('home', 72, 50, HOME_COLOR),
        shirtNo: '15',
        position: 'FW',
      },
      {
        ...createDefaultPlayer('home', 62, 75, HOME_COLOR),
        shirtNo: '10',
        position: 'AML',
      },
      // AWAY (5-4 Low Block)
      {
        ...createDefaultPlayer('away', 92, 50, AWAY_COLOR),
        shirtNo: '1',
        position: 'GK',
      },
      {
        ...createDefaultPlayer('away', 80, 20, AWAY_COLOR),
        shirtNo: '2',
        position: 'RWB',
      },
      {
        ...createDefaultPlayer('away', 80, 35, AWAY_COLOR),
        shirtNo: '4',
        position: 'RCB',
      },
      {
        ...createDefaultPlayer('away', 80, 50, AWAY_COLOR),
        shirtNo: '5',
        position: 'CB',
      },
      {
        ...createDefaultPlayer('away', 80, 65, AWAY_COLOR),
        shirtNo: '6',
        position: 'LCB',
      },
      {
        ...createDefaultPlayer('away', 80, 80, AWAY_COLOR),
        shirtNo: '3',
        position: 'LWB',
      },
      {
        ...createDefaultPlayer('away', 68, 30, AWAY_COLOR),
        shirtNo: '7',
        position: 'RM',
      },
      {
        ...createDefaultPlayer('away', 68, 45, AWAY_COLOR),
        shirtNo: '8',
        position: 'CM',
      },
      {
        ...createDefaultPlayer('away', 68, 55, AWAY_COLOR),
        shirtNo: '10',
        position: 'CM',
      },
      {
        ...createDefaultPlayer('away', 68, 70, AWAY_COLOR),
        shirtNo: '11',
        position: 'LM',
      },
    ],
    arrows: [
      {
        id: crypto.randomUUID(),
        annotationType: 'arrow',
        arrowType: 'pass',
        curveType: 'straight',
        points: [
          { x: 42, y: 35 },
          { x: 65, y: 18 },
        ],
        color: '#38bdf8',
        strokeWidth: 3,
        dashArray: [],
        arrowHead: true,
      },
    ],
    zones: [
      {
        id: crypto.randomUUID(),
        annotationType: 'zone',
        zoneType: 'space',
        shapeType: 'rect',
        x: 55,
        y: 15,
        width: 25,
        height: 30,
        points: [],
        color: '#38bdf8',
        opacity: 0.2,
        strokeWidth: 0,
        label: 'Overload Zone',
      },
    ],
    texts: [
      {
        id: crypto.randomUUID(),
        annotationType: 'text',
        x: 40,
        y: 12,
        content: '1. Shift to Right Half-Space',
        fontSize: 14,
        color: '#ffffff',
        bold: true,
        italic: false,
      },
    ],
  };

  // Slide 2: Penetration & Underlap to byline
  const slide2: Slide = {
    id: slide2Id,
    index: 1,
    label: '2. Underlap & Byline Entry',
    transitionDurationMs: 1400,
    pauseMs: 600,
    easing: 'ease-in-out',
    ball: { x: 82, y: 16, visible: true },
    boundaryBox: {
      enabled: true,
      x: 30,
      y: 10,
      width: 70,
      height: 80,
    },
    players: [
      {
        ...createDefaultPlayer('home', 50, 40, HOME_COLOR),
        shirtNo: '8',
        position: 'CM',
      },
      {
        ...createDefaultPlayer('home', 40, 60, HOME_COLOR),
        shirtNo: '25',
        position: 'DMC',
      },
      {
        ...createDefaultPlayer('home', 70, 15, HOME_COLOR),
        shirtNo: '7',
        position: 'AMR',
      },
      {
        ...createDefaultPlayer('home', 82, 16, HOME_COLOR),
        shirtNo: '20',
        position: 'AMC',
      },
      {
        ...createDefaultPlayer('home', 80, 48, HOME_COLOR),
        shirtNo: '15',
        position: 'FW',
      },
      {
        ...createDefaultPlayer('home', 68, 62, HOME_COLOR),
        shirtNo: '10',
        position: 'AML',
      },
      {
        ...createDefaultPlayer('away', 90, 42, AWAY_COLOR),
        shirtNo: '1',
        position: 'GK',
      },
      {
        ...createDefaultPlayer('away', 84, 18, AWAY_COLOR),
        shirtNo: '2',
        position: 'RWB',
      },
      {
        ...createDefaultPlayer('away', 83, 28, AWAY_COLOR),
        shirtNo: '4',
        position: 'RCB',
      },
      {
        ...createDefaultPlayer('away', 82, 45, AWAY_COLOR),
        shirtNo: '5',
        position: 'CB',
      },
      {
        ...createDefaultPlayer('away', 78, 60, AWAY_COLOR),
        shirtNo: '6',
        position: 'LCB',
      },
      {
        ...createDefaultPlayer('away', 75, 75, AWAY_COLOR),
        shirtNo: '3',
        position: 'LWB',
      },
      {
        ...createDefaultPlayer('away', 73, 24, AWAY_COLOR),
        shirtNo: '7',
        position: 'RM',
      },
      {
        ...createDefaultPlayer('away', 72, 38, AWAY_COLOR),
        shirtNo: '8',
        position: 'CM',
      },
      {
        ...createDefaultPlayer('away', 69, 52, AWAY_COLOR),
        shirtNo: '10',
        position: 'CM',
      },
      {
        ...createDefaultPlayer('away', 67, 68, AWAY_COLOR),
        shirtNo: '11',
        position: 'LM',
      },
    ],
    arrows: [
      {
        id: crypto.randomUUID(),
        annotationType: 'arrow',
        arrowType: 'pass',
        curveType: 'straight',
        points: [
          { x: 82, y: 16 },
          { x: 68, y: 48 },
        ],
        color: '#f59e0b',
        strokeWidth: 3,
        dashArray: [],
        arrowHead: true,
      },
    ],
    zones: [
      {
        id: crypto.randomUUID(),
        annotationType: 'zone',
        zoneType: 'space',
        shapeType: 'rect',
        x: 64,
        y: 36,
        width: 18,
        height: 25,
        points: [],
        color: '#f59e0b',
        opacity: 0.25,
        strokeWidth: 0,
        label: 'Cutback Area',
      },
    ],
    texts: [
      {
        id: crypto.randomUUID(),
        annotationType: 'text',
        x: 40,
        y: 12,
        content: '2. Low Cutback into Pocket',
        fontSize: 14,
        color: '#ffffff',
        bold: true,
        italic: false,
      },
    ],
  };

  // Slide 3: Cutback & Final Finish
  const slide3: Slide = {
    id: slide3Id,
    index: 2,
    label: '3. Cutback Finish',
    transitionDurationMs: 1200,
    pauseMs: 1000,
    easing: 'ease-in-out',
    ball: { x: 92, y: 48, visible: true },
    boundaryBox: {
      enabled: true,
      x: 30,
      y: 10,
      width: 70,
      height: 80,
    },
    players: [
      {
        ...createDefaultPlayer('home', 55, 42, HOME_COLOR),
        shirtNo: '8',
        position: 'CM',
      },
      {
        ...createDefaultPlayer('home', 42, 58, HOME_COLOR),
        shirtNo: '25',
        position: 'DMC',
      },
      {
        ...createDefaultPlayer('home', 72, 16, HOME_COLOR),
        shirtNo: '7',
        position: 'AMR',
      },
      {
        ...createDefaultPlayer('home', 82, 18, HOME_COLOR),
        shirtNo: '20',
        position: 'AMC',
      },
      {
        ...createDefaultPlayer('home', 83, 44, HOME_COLOR),
        shirtNo: '15',
        position: 'FW',
      },
      {
        ...createDefaultPlayer('home', 70, 48, HOME_COLOR),
        shirtNo: '10',
        position: 'AML',
      },
      {
        ...createDefaultPlayer('away', 89, 46, AWAY_COLOR),
        shirtNo: '1',
        position: 'GK',
      },
      {
        ...createDefaultPlayer('away', 84, 20, AWAY_COLOR),
        shirtNo: '2',
        position: 'RWB',
      },
      {
        ...createDefaultPlayer('away', 83, 30, AWAY_COLOR),
        shirtNo: '4',
        position: 'RCB',
      },
      {
        ...createDefaultPlayer('away', 80, 42, AWAY_COLOR),
        shirtNo: '5',
        position: 'CB',
      },
      {
        ...createDefaultPlayer('away', 76, 55, AWAY_COLOR),
        shirtNo: '6',
        position: 'LCB',
      },
      {
        ...createDefaultPlayer('away', 74, 70, AWAY_COLOR),
        shirtNo: '3',
        position: 'LWB',
      },
      {
        ...createDefaultPlayer('away', 74, 26, AWAY_COLOR),
        shirtNo: '7',
        position: 'RM',
      },
      {
        ...createDefaultPlayer('away', 72, 40, AWAY_COLOR),
        shirtNo: '8',
        position: 'CM',
      },
      {
        ...createDefaultPlayer('away', 68, 50, AWAY_COLOR),
        shirtNo: '10',
        position: 'CM',
      },
      {
        ...createDefaultPlayer('away', 66, 66, AWAY_COLOR),
        shirtNo: '11',
        position: 'LM',
      },
    ],
    arrows: [
      {
        id: crypto.randomUUID(),
        annotationType: 'arrow',
        arrowType: 'pass',
        curveType: 'straight',
        points: [
          { x: 70, y: 48 },
          { x: 92, y: 48 },
        ],
        color: '#22c55e',
        strokeWidth: 3.5,
        dashArray: [],
        arrowHead: true,
      },
    ],
    zones: [],
    texts: [
      {
        id: crypto.randomUUID(),
        annotationType: 'text',
        x: 40,
        y: 12,
        content: '3. One-Touch Goal',
        fontSize: 14,
        color: '#22c55e',
        bold: true,
        italic: false,
      },
    ],
  };

  return {
    id: projectId,
    title: 'Benchmark: Low Block Penetration',
    version: '2.0.0',
    createdAt: now,
    updatedAt: now,
    aspectRatio: '16:9',
    backgroundType: 'pitch',
    homeColor: { primary: HOME_COLOR },
    awayColor: { primary: AWAY_COLOR },
    activeSlideId: slide1Id,
    slides: [slide1, slide2, slide3],
    tags: ['benchmark', 'low-block', 'attack'],
  };
}

/**
 * 2. High Press vs Build-up Preset (2 Slides)
 */
export function createHighPressBenchmarkProject(): TacticalProject {
  const now = new Date().toISOString();
  const projectId = crypto.randomUUID();
  const slide1Id = crypto.randomUUID();
  const slide2Id = crypto.randomUUID();

  const slide1: Slide = {
    id: slide1Id,
    index: 0,
    label: '1. Build-up Trap Bait',
    transitionDurationMs: 1200,
    pauseMs: 600,
    easing: 'ease-in-out',
    ball: { x: 12, y: 48, visible: true },
    boundaryBox: {
      enabled: true,
      x: 0,
      y: 10,
      width: 70,
      height: 80,
    },
    players: [
      {
        ...createDefaultPlayer('away', 6, 48, AWAY_COLOR),
        shirtNo: '1',
        position: 'GK',
      },
      {
        ...createDefaultPlayer('away', 18, 30, AWAY_COLOR),
        shirtNo: '4',
        position: 'RCB',
      },
      {
        ...createDefaultPlayer('away', 18, 66, AWAY_COLOR),
        shirtNo: '5',
        position: 'LCB',
      },
      {
        ...createDefaultPlayer('away', 26, 48, AWAY_COLOR),
        shirtNo: '6',
        position: 'DMC',
      },
      {
        ...createDefaultPlayer('away', 28, 16, AWAY_COLOR),
        shirtNo: '2',
        position: 'RB',
      },
      {
        ...createDefaultPlayer('away', 28, 80, AWAY_COLOR),
        shirtNo: '3',
        position: 'LB',
      },
      {
        ...createDefaultPlayer('home', 30, 44, HOME_COLOR),
        shirtNo: '15',
        position: 'CF',
      },
      {
        ...createDefaultPlayer('home', 36, 26, HOME_COLOR),
        shirtNo: '11',
        position: 'AMR',
      },
      {
        ...createDefaultPlayer('home', 38, 48, HOME_COLOR),
        shirtNo: '20',
        position: 'AMC',
      },
      {
        ...createDefaultPlayer('home', 36, 70, HOME_COLOR),
        shirtNo: '7',
        position: 'AML',
      },
      {
        ...createDefaultPlayer('home', 48, 38, HOME_COLOR),
        shirtNo: '8',
        position: 'CM',
      },
      {
        ...createDefaultPlayer('home', 48, 58, HOME_COLOR),
        shirtNo: '25',
        position: 'DMC',
      },
    ],
    arrows: [
      {
        id: crypto.randomUUID(),
        annotationType: 'arrow',
        arrowType: 'defend',
        curveType: 'curved',
        points: [
          { x: 30, y: 44 },
          { x: 14, y: 35 },
        ],
        controlPoint: { x: 20, y: 42 },
        color: '#ef4444',
        strokeWidth: 3,
        dashArray: [],
        arrowHead: true,
      },
    ],
    zones: [
      {
        id: crypto.randomUUID(),
        annotationType: 'zone',
        zoneType: 'pressing',
        shapeType: 'rect',
        x: 10,
        y: 18,
        width: 24,
        height: 35,
        points: [],
        color: '#ef4444',
        opacity: 0.2,
        strokeWidth: 0,
        label: 'Pressing Trap',
      },
    ],
    texts: [
      {
        id: crypto.randomUUID(),
        annotationType: 'text',
        x: 15,
        y: 12,
        content: '1. Force Pass to Right Center Back',
        fontSize: 14,
        color: '#ffffff',
        bold: true,
        italic: false,
      },
    ],
  };

  const slide2: Slide = {
    id: slide2Id,
    index: 1,
    label: '2. Trap Closure & High Turnover',
    transitionDurationMs: 1200,
    pauseMs: 800,
    easing: 'ease-in-out',
    ball: { x: 19, y: 32, visible: true },
    boundaryBox: {
      enabled: true,
      x: 0,
      y: 10,
      width: 70,
      height: 80,
    },
    players: [
      {
        ...createDefaultPlayer('away', 7, 46, AWAY_COLOR),
        shirtNo: '1',
        position: 'GK',
      },
      {
        ...createDefaultPlayer('away', 18, 32, AWAY_COLOR),
        shirtNo: '4',
        position: 'RCB',
      },
      {
        ...createDefaultPlayer('away', 20, 64, AWAY_COLOR),
        shirtNo: '5',
        position: 'LCB',
      },
      {
        ...createDefaultPlayer('away', 24, 46, AWAY_COLOR),
        shirtNo: '6',
        position: 'DMC',
      },
      {
        ...createDefaultPlayer('away', 26, 18, AWAY_COLOR),
        shirtNo: '2',
        position: 'RB',
      },
      {
        ...createDefaultPlayer('away', 30, 78, AWAY_COLOR),
        shirtNo: '3',
        position: 'LB',
      },
      {
        ...createDefaultPlayer('home', 16, 36, HOME_COLOR),
        shirtNo: '15',
        position: 'CF',
      },
      {
        ...createDefaultPlayer('home', 23, 22, HOME_COLOR),
        shirtNo: '11',
        position: 'AMR',
      },
      {
        ...createDefaultPlayer('home', 25, 42, HOME_COLOR),
        shirtNo: '20',
        position: 'AMC',
      },
      {
        ...createDefaultPlayer('home', 34, 62, HOME_COLOR),
        shirtNo: '7',
        position: 'AML',
      },
      {
        ...createDefaultPlayer('home', 42, 34, HOME_COLOR),
        shirtNo: '8',
        position: 'CM',
      },
      {
        ...createDefaultPlayer('home', 44, 54, HOME_COLOR),
        shirtNo: '25',
        position: 'DMC',
      },
    ],
    arrows: [
      {
        id: crypto.randomUUID(),
        annotationType: 'arrow',
        arrowType: 'pass',
        curveType: 'straight',
        points: [
          { x: 19, y: 32 },
          { x: 8, y: 44 },
        ],
        color: '#22c55e',
        strokeWidth: 3.5,
        dashArray: [],
        arrowHead: true,
      },
    ],
    zones: [],
    texts: [
      {
        id: crypto.randomUUID(),
        annotationType: 'text',
        x: 15,
        y: 12,
        content: '2. Turnover & Immediate Shot',
        fontSize: 14,
        color: '#22c55e',
        bold: true,
        italic: false,
      },
    ],
  };

  return {
    id: projectId,
    title: 'Benchmark: High Press vs Build-up',
    version: '2.0.0',
    createdAt: now,
    updatedAt: now,
    aspectRatio: '16:9',
    backgroundType: 'pitch',
    homeColor: { primary: HOME_COLOR },
    awayColor: { primary: AWAY_COLOR },
    activeSlideId: slide1Id,
    slides: [slide1, slide2],
    tags: ['benchmark', 'high-press', 'defense'],
  };
}

/**
 * 3. 10-Slide Full Sequence Benchmark Preset (10 Slides, ~16 seconds)
 * Comprehensive end-to-end tactical progression from Build-up to Goal:
 *   1. Deep GK Build-up
 *   2. Progression to Pivots (DMC)
 *   3. Wide Switch to RB
 *   4. Half-space Underlap Entry
 *   5. Flank Overload (3v2)
 *   6. Low Cutback Preparation
 *   7. Box Entry Run & Cross
 *   8. First-time Volley/Shot
 *   9. Post-Shot Rebound / Rest Defense Transition
 *  10. Goal Celebration & Defensive Restructure
 */
export function createTenSlideFullSequenceBenchmarkProject(): TacticalProject {
  const now = new Date().toISOString();
  const projectId = crypto.randomUUID();

  // 10 slides configuration
  const slideConfigs = [
    {
      label: '1. Deep GK Build-up',
      ball: { x: 10, y: 50 },
      text: '1. GK Build-up Distribution',
    },
    {
      label: '2. Pivot Reception',
      ball: { x: 28, y: 46 },
      text: '2. DMC Receives Between Lines',
    },
    {
      label: '3. Switch to Right Flank',
      ball: { x: 45, y: 18 },
      text: '3. Diagonal Switch to RB',
    },
    {
      label: '4. Half-space Underlap',
      ball: { x: 62, y: 28 },
      text: '4. AMR Underlapping Run',
    },
    {
      label: '5. Wide Overload Triangulation',
      ball: { x: 74, y: 16 },
      text: '5. 3v2 Wide Triangle Creation',
    },
    {
      label: '6. Cutback Preparation',
      ball: { x: 86, y: 22 },
      text: '6. Byline Entry & Head-up',
    },
    {
      label: '7. Low Cutback into Box',
      ball: { x: 72, y: 46 },
      text: '7. Driven Pass to Penalty Spot',
    },
    {
      label: '8. First-time Strike',
      ball: { x: 92, y: 48 },
      text: '8. CF First-time Finish',
    },
    {
      label: '9. Rest Defense Lock',
      ball: { x: 94, y: 50 },
      text: '9. Goal Scored & Rest Defense Shape',
    },
    {
      label: '10. Celebration & Reset',
      ball: { x: 94, y: 50 },
      text: '10. Reset & Tactical Overview',
    },
  ];

  const slideIds = slideConfigs.map(() => crypto.randomUUID());

  const slides: Slide[] = slideConfigs.map((cfg, idx) => {
    // Dynamic progressive movement for players across the 10 slides
    const progress = idx / 9; // 0.0 to 1.0

    const homePlayers = [
      // GK
      {
        ...createDefaultPlayer('home', 8 + progress * 8, 50, HOME_COLOR),
        shirtNo: '1',
        position: 'GK',
      },
      // RCB / LCB
      {
        ...createDefaultPlayer(
          'home',
          22 + progress * 24,
          32 - progress * 4,
          HOME_COLOR,
        ),
        shirtNo: '4',
        position: 'RCB',
      },
      {
        ...createDefaultPlayer(
          'home',
          22 + progress * 24,
          68 + progress * 4,
          HOME_COLOR,
        ),
        shirtNo: '5',
        position: 'LCB',
      },
      // RB / LB
      {
        ...createDefaultPlayer('home', 30 + progress * 42, 14, HOME_COLOR),
        shirtNo: '2',
        position: 'RB',
      },
      {
        ...createDefaultPlayer('home', 30 + progress * 35, 86, HOME_COLOR),
        shirtNo: '3',
        position: 'LB',
      },
      // DMC / CM
      {
        ...createDefaultPlayer('home', 28 + progress * 32, 48, HOME_COLOR),
        shirtNo: '6',
        position: 'DMC',
      },
      {
        ...createDefaultPlayer('home', 38 + progress * 34, 38, HOME_COLOR),
        shirtNo: '8',
        position: 'CM',
      },
      {
        ...createDefaultPlayer('home', 40 + progress * 32, 62, HOME_COLOR),
        shirtNo: '10',
        position: 'CM',
      },
      // AMR / AMC / AML
      {
        ...createDefaultPlayer('home', 52 + progress * 32, 22, HOME_COLOR),
        shirtNo: '7',
        position: 'AMR',
      },
      {
        ...createDefaultPlayer('home', 54 + progress * 28, 48, HOME_COLOR),
        shirtNo: '11',
        position: 'AML',
      },
      // CF
      {
        ...createDefaultPlayer('home', 58 + progress * 26, 46, HOME_COLOR),
        shirtNo: '9',
        position: 'CF',
      },
    ];

    const awayPlayers = [
      // Opponent 4-4-2 shifting backward defensively
      {
        ...createDefaultPlayer('away', 92, 50, AWAY_COLOR),
        shirtNo: '1',
        position: 'GK',
      },
      {
        ...createDefaultPlayer('away', 82 - progress * 4, 18, AWAY_COLOR),
        shirtNo: '2',
        position: 'RB',
      },
      {
        ...createDefaultPlayer('away', 80 - progress * 5, 38, AWAY_COLOR),
        shirtNo: '4',
        position: 'RCB',
      },
      {
        ...createDefaultPlayer('away', 80 - progress * 5, 62, AWAY_COLOR),
        shirtNo: '5',
        position: 'LCB',
      },
      {
        ...createDefaultPlayer('away', 82 - progress * 4, 82, AWAY_COLOR),
        shirtNo: '3',
        position: 'LB',
      },
      {
        ...createDefaultPlayer('away', 68 - progress * 8, 22, AWAY_COLOR),
        shirtNo: '7',
        position: 'RM',
      },
      {
        ...createDefaultPlayer('away', 66 - progress * 8, 42, AWAY_COLOR),
        shirtNo: '8',
        position: 'CM',
      },
      {
        ...createDefaultPlayer('away', 66 - progress * 8, 58, AWAY_COLOR),
        shirtNo: '10',
        position: 'CM',
      },
      {
        ...createDefaultPlayer('away', 68 - progress * 8, 78, AWAY_COLOR),
        shirtNo: '11',
        position: 'LM',
      },
      {
        ...createDefaultPlayer('away', 52 - progress * 8, 44, AWAY_COLOR),
        shirtNo: '9',
        position: 'CF',
      },
      {
        ...createDefaultPlayer('away', 52 - progress * 8, 56, AWAY_COLOR),
        shirtNo: '19',
        position: 'SS',
      },
    ];

    return {
      id: slideIds[idx],
      index: idx,
      label: cfg.label,
      transitionDurationMs: 1200,
      pauseMs: 600,
      easing: 'ease-in-out',
      ball: { ...cfg.ball, visible: true },
      boundaryBox: {
        enabled: true,
        x: Math.max(0, Math.min(30, progress * 30)),
        y: 5,
        width: 70,
        height: 90,
      },
      players: [...homePlayers, ...awayPlayers],
      arrows:
        idx < 9
          ? [
              {
                id: crypto.randomUUID(),
                annotationType: 'arrow',
                arrowType: 'pass',
                curveType: 'straight',
                points: [
                  { x: cfg.ball.x, y: cfg.ball.y },
                  {
                    x: slideConfigs[idx + 1].ball.x,
                    y: slideConfigs[idx + 1].ball.y,
                  },
                ],
                color: idx === 7 ? '#22c55e' : '#38bdf8',
                strokeWidth: 3,
                dashArray: [],
                arrowHead: true,
              },
            ]
          : [],
      zones: [
        {
          id: crypto.randomUUID(),
          annotationType: 'zone',
          zoneType: 'space',
          shapeType: 'rect',
          x: Math.max(5, cfg.ball.x - 10),
          y: Math.max(5, cfg.ball.y - 12),
          width: 20,
          height: 24,
          points: [],
          color: idx === 7 ? '#22c55e' : '#38bdf8',
          opacity: 0.18,
          strokeWidth: 0,
          label: `Zone ${idx + 1}`,
        },
      ],
      texts: [
        {
          id: crypto.randomUUID(),
          annotationType: 'text',
          x: 20,
          y: 10,
          content: cfg.text,
          fontSize: 14,
          color: '#ffffff',
          bold: true,
          italic: false,
        },
      ],
    };
  });

  return {
    id: projectId,
    title: 'Benchmark: 10-Slide Full Progression (16s)',
    version: '2.0.0',
    createdAt: now,
    updatedAt: now,
    aspectRatio: '16:9',
    backgroundType: 'pitch',
    homeColor: { primary: HOME_COLOR },
    awayColor: { primary: AWAY_COLOR },
    activeSlideId: slideIds[0],
    slides,
    tags: ['benchmark', '10-slides', 'full-sequence', 'video-export'],
  };
}
