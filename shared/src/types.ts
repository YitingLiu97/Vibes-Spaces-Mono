export type ZoneHPosition = 'left' | 'center' | 'right';
export type CaptionFont = 'bebas' | 'serif' | 'mono';
export type CaptionHAlign = 'left' | 'center' | 'right';
export type CaptionVAlign = 'top' | 'middle' | 'bottom';

export interface SceneZone {
  imageUrl: string | null;
  position: ZoneHPosition;
}

export interface SceneCaption {
  text: string;
  font: CaptionFont;
  size: number;
  color: string;
  h: CaptionHAlign;
  v: CaptionVAlign;
}

export interface SceneTint {
  color: string;
  opacity: number;
}

// A circular speaker cluster overlay — moderator at the apex, panelists on a
// gentle arc below. The data is self-contained (photo URL + display name)
// so the composition JSON is portable without needing to re-fetch speakers.
export interface SceneSpeakerClusterItem {
  photoUrl: string | null;
  name: string;
  role: 'speaker' | 'moderator';
  // stable key used to deterministically jitter rotation/offset
  key: string;
}

export interface SceneSpeakerCluster {
  items: SceneSpeakerClusterItem[];
}

// Event-level branding lockup rendered at the top of the scene: logo +
// wordmark on the left, website on the right. The visual constants live in
// shared/src/fondBranding.ts so the JSON only needs to carry the toggle.
export interface SceneBranding {
  enabled: boolean;
}

export interface SceneComposition {
  zones: {
    header: SceneZone;
    center: SceneZone;
    footer: SceneZone;
  };
  caption: SceneCaption | null;
  tint: SceneTint | null;
  accent: string | null;
  // When present, renders the circular speaker arc on top of the video.
  // Optional + nullable so existing rows (and EMPTY_COMPOSITION) stay valid.
  speakerCluster?: SceneSpeakerCluster | null;
  branding?: SceneBranding | null;
}

export interface Scene {
  id: string;
  name: string;
  videoUrl: string;
  hideAttribution: boolean;
  loopEnabled: boolean;
  composition: SceneComposition | null;
}

export const EMPTY_COMPOSITION: SceneComposition = {
  zones: {
    header: { imageUrl: null, position: 'center' },
    center: { imageUrl: null, position: 'center' },
    footer: { imageUrl: null, position: 'center' },
  },
  caption: null,
  tint: null,
  accent: null,
  branding: null,
};

export interface Playlist {
  id: string;
  name: string;
  sceneIdsInOrder: string[];
}

export interface ScheduleEntry {
  id: string;
  sceneId: string | null;
  playlistId: string | null;
  startTime: string;
  endTime: string;
  weekdayMask: number | null;
  overrideDate: string | null;
}

export interface QueueItem {
  id: string;
  position: number;
  sceneId: string | null;
  playlistId: string | null;
  durationSeconds: number;
}

export interface OrgSettings {
  orgId: string;
  defaultSceneId: string | null;
  attributionEnabled: boolean;
  forcePlaySceneId: string | null;
  liveOverlayId: string | null;
  liveOverlayStartedAt: string | null;
  queueCurrentItemId: string | null;
  queueStartedAt: string | null;
}

export interface ResolvedSlot {
  sceneId: string | null;
  playlistId: string | null;
  sourceEntryId: string | null;
  // When set, the runtime should persist this as the new queue cursor
  // (queue_current_item_id + queue_started_at = now) if it differs from
  // settings.queueCurrentItemId. null means "queue is not driving playback".
  queueItemId: string | null;
}

export interface ClientStatus {
  orgId: string;
  clientVersion: string | null;
  currentSceneId: string | null;
  currentSceneName: string | null;
  currentSourceEntryId: string | null;
  lastHeartbeatAt: string;
}

export type HeartbeatHealth = 'green' | 'amber' | 'red' | 'unknown';

export type OverlayType = 'speaker_card' | 'text' | 'image_logo';
export type OverlayAnimation = 'fade' | 'slide-left' | 'slide-up';
export type OverlayPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'center';

export type TextCardPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'middle-center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface SpeakerCardContent {
  name: string;
  role?: string;
  title?: string;
  position?: TextCardPosition;
}

export interface TextOverlayContent {
  lines: string[];
  align?: 'left' | 'center' | 'right';
}

export interface ImageLogoContent {
  url: string;
  position: OverlayPosition;
}

export type OverlayContent = SpeakerCardContent | TextOverlayContent | ImageLogoContent;

export interface Overlay {
  id: string;
  orgId: string;
  name: string;
  type: OverlayType;
  content: OverlayContent;
  animation: OverlayAnimation;
  durationMs: number;
}

export type SegmentSpeakerRole = 'speaker' | 'moderator';

export interface Speaker {
  id: string;
  orgId: string;
  name: string;
  photoUrl: string | null;
}

export interface SegmentSpeakerRef {
  speakerId: string;
  role: SegmentSpeakerRole;
  position: number;
}

export interface Segment {
  id: string;
  orgId: string;
  title: string;
  subtitle: string | null;
  position: number;
  speakers: SegmentSpeakerRef[];
  composition: SceneComposition | null;
}
