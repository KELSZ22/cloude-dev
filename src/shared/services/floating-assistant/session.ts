import {
  assessScreenText, buildChatPrompt, buildScreenPrompt, cleanScreenText, type ScreenQuality, type Turn,
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

  /** Uses the captured screen only while one is attached; otherwise this is an ordinary question. */
  buildPrompt(question: string): { prompt: string; usesScreen: boolean } {
    return this.screen
      ? { prompt: buildScreenPrompt(question, this.screen.text, this.turns), usesScreen: true }
      : { prompt: buildChatPrompt(question, this.turns), usesScreen: false };
  }

  record(question: string, answer: string): void {
    this.turns.push({ question, answer });
    // Only the most recent turns are ever sent to the model, so older ones need not be kept.
    if (this.turns.length > 12) this.turns = this.turns.slice(-12);
  }
}
