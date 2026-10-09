import {
  assessScreenText, buildAssistantRequest, cleanScreenText, repeatsEarlierAnswer,
  type AssistantRequest, type ScreenQuality, type Turn,
} from './prompts';

/** Text from one user-approved capture. It lives in memory only and is gone when discarded or the app closes. */
export interface ScreenContext {
  captureId: string;
  capturedAt: number;
  text: string;
  quality: ScreenQuality;
  words: number;
  lines: number;
}

export type AttachResult =
  | { attached: true; context: ScreenContext }
  /** Nothing readable: the screen was blank, mostly visual, or protected from capture. */
  | { attached: false };

/**
 * The floating assistant's own conversation. It is separate from anything asked in the main app,
 * and holds at most one captured screen at a time.
 */
export class AssistantSession {
  private turns: Turn[] = [];
  private screen: ScreenContext | null = null;

  get screenContext(): ScreenContext | null { return this.screen; }
  get history(): readonly Turn[] { return this.turns; }

  /** A new capture replaces the previous one; text that cannot be read attaches nothing. */
  attachScreen(capture: { captureId: string; capturedAt: number; text: string }): AttachResult {
    const text = cleanScreenText(capture.text);
    const { quality, words, lines } = assessScreenText(text);
    if (quality === 'empty') {
      this.screen = null;
      return { attached: false };
    }
    this.screen = { captureId: capture.captureId, capturedAt: capture.capturedAt, text, quality, words, lines };
    return { attached: true, context: this.screen };
  }

  discardScreen(): void { this.screen = null; }

  clear(): void {
    this.turns = [];
    this.screen = null;
  }

  /**
   * The latest question is what the model answers. The attached screen, if any, is reference
   * material for it; earlier turns only help with follow-ups.
   */
  buildRequest(question: string, options: { askedAgain?: boolean } = {}): AssistantRequest {
    const screen = this.screen ? { id: this.screen.captureId, text: this.screen.text } : null;
    return buildAssistantRequest(question, this.turns, screen, options);
  }

  /** True when a reply only repeats something this conversation already answered. */
  repeatsEarlierAnswer(reply: string): boolean { return repeatsEarlierAnswer(reply, this.turns); }

  record(question: string, answer: string): void {
    this.turns.push({ question, answer, screenId: this.screen?.captureId ?? null });
    // Only the most recent turns are ever sent to the model, so older ones need not be kept.
    if (this.turns.length > 12) this.turns = this.turns.slice(-12);
  }
}
