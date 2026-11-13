import type { ScreenNormCoord } from '@/lib/types/tactical/branded';
import type {
  DomainArrowAnnotation,
  DomainBallState,
  DomainPlayer,
  DomainPlayerTrajectory,
  DomainTextAnnotation,
  DomainZoneAnnotation,
  PitchPlayer,
} from '@/lib/types/tactical/domain-entities';
import type {
  DomainSlide,
  DomainTacticalPhase,
  DomainTacticalProject,
} from '@/lib/types/tactical/domain-hierarchy';
import type {
  ConnectLine,
  MarkerStyle,
  PlayerBadge,
  PlayerFocus,
  VisionCone,
} from '@/lib/types/tactical/player';
import type {
  AspectRatio,
  XMediaPresetKey,
} from '@/lib/types/tactical/primitives';
import type { Easing } from '@/lib/types/tactical/slide';
import type { DirectorCameraCommand } from './commands-director';

export type { DirectorCameraCommand };

export type EntityKind = 'player' | 'arrow' | 'zone' | 'text';

export interface PlayerMoveDelta {
  readonly id: string;
  readonly x: ScreenNormCoord;
  readonly y: ScreenNormCoord;
}

export type SlideCommand =
  | { readonly type: 'ADD_PLAYER'; readonly player: DomainPlayer }
  | {
      readonly type: 'MOVE_PLAYERS';
      readonly moves: readonly PlayerMoveDelta[];
    }
  | {
      readonly type: 'UPDATE_PLAYER';
      readonly id: string;
      readonly patch: Partial<PitchPlayer>;
    }
  | {
      readonly type: 'MOVE_PLAYER_TO_BENCH';
      readonly id: string;
      readonly benchX?: ScreenNormCoord;
      readonly benchY?: ScreenNormCoord;
    }
  | {
      readonly type: 'MOVE_PLAYER_TO_PITCH';
      readonly id: string;
      readonly x: ScreenNormCoord;
      readonly y: ScreenNormCoord;
    }
  | { readonly type: 'REMOVE_PLAYER'; readonly id: string }
  | { readonly type: 'ADD_ARROW'; readonly arrow: DomainArrowAnnotation }
  | {
      readonly type: 'UPDATE_ARROW';
      readonly id: string;
      readonly patch: Partial<DomainArrowAnnotation>;
    }
  | { readonly type: 'REMOVE_ARROW'; readonly id: string }
  | { readonly type: 'ADD_ZONE'; readonly zone: DomainZoneAnnotation }
  | {
      readonly type: 'UPDATE_ZONE';
      readonly id: string;
      readonly patch: Partial<DomainZoneAnnotation>;
    }
  | { readonly type: 'REMOVE_ZONE'; readonly id: string }
  | { readonly type: 'ADD_TEXT'; readonly text: DomainTextAnnotation }
  | {
      readonly type: 'UPDATE_TEXT';
      readonly id: string;
      readonly patch: Partial<DomainTextAnnotation>;
    }
  | { readonly type: 'REMOVE_TEXT'; readonly id: string }
  | { readonly type: 'UPDATE_BALL'; readonly patch: Partial<DomainBallState> }
  | { readonly type: 'TOGGLE_BALL_LOCK' }
  | {
      readonly type: 'SET_PLAYER_TRAJECTORY';
      readonly playerId: string;
      readonly trajectory: DomainPlayerTrajectory | undefined;
    }
  | {
      readonly type: 'SET_PLAYER_VISION_CONE';
      readonly playerId: string;
      readonly cone: VisionCone | undefined;
    }
  | {
      readonly type: 'ADD_CONNECT_LINE';
      readonly playerId: string;
      readonly line: ConnectLine;
    }
  | {
      readonly type: 'UPDATE_CONNECT_LINE';
      readonly playerId: string;
      readonly lineId: string;
      readonly patch: Partial<ConnectLine>;
    }
  | {
      readonly type: 'REMOVE_CONNECT_LINE';
      readonly playerId: string;
      readonly lineId: string;
    }
  | {
      readonly type: 'ADD_PLAYER_BADGE';
      readonly playerId: string;
      readonly badge: PlayerBadge;
    }
  | {
      readonly type: 'REMOVE_PLAYER_BADGE';
      readonly playerId: string;
      readonly badgeId: string;
    }
  | {
      readonly type: 'SET_PLAYER_FOCUS';
      readonly playerId: string;
      readonly focus: PlayerFocus | undefined;
    }
  | {
      readonly type: 'TOGGLE_ENTITY_LOCK';
      readonly id: string;
      readonly kind: EntityKind;
    }
  | {
      readonly type: 'INSERT_ENTITIES';
      readonly players?: readonly DomainPlayer[];
      readonly arrows?: readonly DomainArrowAnnotation[];
      readonly zones?: readonly DomainZoneAnnotation[];
      readonly texts?: readonly DomainTextAnnotation[];
    }
  | { readonly type: 'DELETE_ENTITIES'; readonly ids: readonly string[] }
  | { readonly type: 'SWAP_TEAM_SIDES' }
  | { readonly type: 'RESET_SLIDE_OBJECTS' }
  | {
      readonly type: 'SWAP_PLAYERS';
      readonly playerAId: string;
      readonly playerBId: string;
    }
  | { readonly type: 'CLEAR_PITCH_PLAYERS' }
  | {
      readonly type: 'REPLACE_PLAYERS';
      readonly players: readonly DomainPlayer[];
    }
  | {
      readonly type: 'UPDATE_SLIDE_META';
      readonly patch: Partial<
        Pick<
          DomainSlide,
          | 'label'
          | 'transitionDurationMs'
          | 'pauseMs'
          | 'easing'
          | 'cameraTransitionMode'
          | 'cameraDurationMs'
          | 'pitchTransform'
        >
      >;
    };

export type TacticalCommand =
  | {
      readonly type: 'APPLY_SLIDE_COMMAND';
      readonly phaseId: string;
      readonly slideId: string;
      readonly command: SlideCommand;
    }
  | {
      readonly type: 'ADD_SLIDE';
      readonly phaseId: string;
      readonly afterSlideId?: string;
      readonly mode?: 'object-free' | 'full' | 'blank';
      readonly newSlideId?: string;
    }
  | {
      readonly type: 'DUPLICATE_SLIDE';
      readonly phaseId: string;
      readonly slideId: string;
      readonly newSlideId?: string;
    }
  | {
      readonly type: 'DELETE_SLIDE';
      readonly phaseId: string;
      readonly slideId: string;
    }
  | {
      readonly type: 'REORDER_SLIDES';
      readonly phaseId: string;
      readonly orderedSlideIds: readonly string[];
    }
  | {
      readonly type: 'ADD_PHASE';
      readonly name: string;
      readonly newPhaseId?: string;
      readonly newSlideId?: string;
    }
  | {
      readonly type: 'UPDATE_PHASE';
      readonly phaseId: string;
      readonly patch: Partial<Omit<DomainTacticalPhase, 'id' | 'slides'>>;
    }
  | { readonly type: 'DELETE_PHASE'; readonly phaseId: string }
  | {
      readonly type: 'UPDATE_ALL_SLIDE_TRANSITIONS';
      readonly patch: Partial<
        Pick<
          DomainSlide,
          | 'transitionDurationMs'
          | 'pauseMs'
          | 'easing'
          | 'cameraTransitionMode'
          | 'cameraDurationMs'
        >
      >;
    }
  | {
      readonly type: 'CHANGE_PHASE_ASPECT_RATIO';
      readonly phaseId: string;
      readonly aspectRatio: AspectRatio;
    }
  | {
      readonly type: 'APPLY_IMAGE_BACKGROUND';
      readonly phaseId: string;
      readonly slideId: string;
      readonly url: string;
      readonly newSlideId?: string;
    }
  | {
      readonly type: 'RESTORE_DEFAULT_PITCH';
      readonly phaseId: string;
    }
  | {
      readonly type: 'AUTO_FIT_BOUNDARY_BOX';
      readonly phaseId: string;
      readonly slideId?: string;
      readonly pitchRect?: { readonly width: number; readonly height: number };
    }
  | {
      readonly type: 'APPLY_X_MEDIA_PRESET';
      readonly phaseId: string;
      readonly presetKey: XMediaPresetKey | 'pitch_fit';
    }
  | {
      readonly type: 'CENTER_PITCH_AND_BOUNDARY';
      readonly phaseId: string;
      readonly slideId: string;
    }
  | {
      readonly type: 'APPLY_PLAYER_STYLE_TO_PHASE_SLIDES';
      readonly phaseId: string;
      readonly stylePatch: Partial<MarkerStyle>;
      readonly targetTeam: 'home' | 'away' | 'both';
    }
  | {
      readonly type: 'APPLY_BALL_SCALE_TO_PHASE_SLIDES';
      readonly phaseId: string;
      readonly sizeScale: number;
    }
  | {
      readonly type: 'SET_TEAM_COLOR';
      readonly team: 'home' | 'away';
      readonly primary: string;
      readonly secondary?: string;
    }
  | DirectorCameraCommand
  | {
      readonly type: 'UPDATE_PROJECT_META';
      readonly patch: Partial<
        Pick<
          DomainTacticalProject,
          | 'title'
          | 'homeColor'
          | 'awayColor'
          | 'pitchAppearance'
          | 'screenBackground'
          | 'tags'
          | 'matchFormations'
        >
      >;
    };
