import { requireOptionalNativeModule } from 'expo';

export type AssistantModelStatus = 'ready' | 'loading' | 'busy' | 'notLoaded' | 'missing' | 'unavailable';

export interface UserMessageEvent { id: string; text: string; mode: string }

/** Result of one user-approved screen capture. Only recognised text crosses over; the image never does. */
export interface ScreenCaptureEvent {
  status: 'ok' | 'empty' | 'denied' | 'failed';
  captureId: string;
  capturedAt: number;
  text: string;
  blocks: number;
  lines: number;
  /** What the user asked for when starting the capture: "explain", "summarize", or null. */
  action: string | null;
}

export interface OverlayStateEvent { running: boolean; reason: string }

interface Subscription { remove(): void }

interface AssistantEvents {
  onUserMessage(event: UserMessageEvent): void;
  onScreenCaptured(event: ScreenCaptureEvent): void;
  onCancelRequested(): void;
  onClearContext(event: { scope?: string }): void;
  onOverlayState(event: OverlayStateEvent): void;
  onMemoryPressure(): void;
}

export interface NativeFloatingAssistant {
  canDrawOverlays(): boolean;
  openOverlaySettings(): void;
  notificationsEnabled(): boolean;
  isRunning(): boolean;
  /** Returns false, and starts nothing, when "display over other apps" has not been granted. */
  start(strings: Record<string, string>): boolean;
  stop(): void;
  resetBubblePosition(): void;
  setModelStatus(status: AssistantModelStatus): void;
  beginReply(id: string): void;
  appendReply(id: string, chunk: string): void;
  endReply(id: string, text: string, isError: boolean): void;
  showNotice(text: string): void;
  /** Adds a message to the chat as if the user had typed it, and reports it back through onUserMessage. */
  submitUserMessage(text: string): void;
  setScreenAttached(attached: boolean, summary: string | null): void;
  addListener<Name extends keyof AssistantEvents>(event: Name, listener: AssistantEvents[Name]): Subscription;
}

/** Null on web, on iOS, and in a build made before this module existed. Callers must handle that. */
export const floatingAssistantNative = requireOptionalNativeModule<NativeFloatingAssistant>('SeekoraFloatingAssistant');
