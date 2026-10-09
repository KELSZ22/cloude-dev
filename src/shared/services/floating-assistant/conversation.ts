import type { ScreenCaptureEvent } from '@/infrastructure/floating-assistant/native';
import type { GenerationRequest } from '@/infrastructure/llm';
import { generateParagraph } from '../rag/answer-question';
import { ASSISTANT_LIMITS, previewScreenText, saysNotOnScreen } from './prompts';
import type { AssistantSession } from './session';

/** The part of the overlay the conversation talks to. The native module satisfies it. */
export interface AssistantOverlay {
  beginReply(id: string): void;
  appendReply(id: string, chunk: string): void;
  endReply(id: string, text: string, isError: boolean): void;
  showNotice(text: string): void;
  submitUserMessage(text: string): void;
  setScreenAttached(attached: boolean, summary: string | null): void;
}

/** The part of the app's one model the conversation uses. It never loads a second model. */
export interface AssistantModel {
  installed: unknown;
  ensureLoaded(): Promise<boolean>;
  generate(request: GenerationRequest): Promise<string>;
  cancel(): Promise<void>;
}

/** Everything the assistant can say that is not a model answer. The caller supplies the wording. */
export type AssistantMessage =
  | 'busy' | 'modelBusy' | 'modelMissing' | 'noAnswer' | 'stopped' | 'failed'
  | 'captureDenied' | 'captureFailed' | 'captureEmpty' | 'captureSparse' | 'captureReady'
  | 'screenDiscarded' | 'screenLimit' | 'askExplain' | 'askSummarize' | 'linesRead';

interface Dependencies {
  overlay: AssistantOverlay;
  session: AssistantSession;
  /** Called on every use, because the app's model object changes as it loads and unloads. */
  model(): AssistantModel;
  say(message: AssistantMessage, vars?: Record<string, string | number>): string;
  onScreenContext?(attached: boolean): void;
}

/**
 * One floating-assistant conversation: answers one question at a time with the app's model, and
 * holds text from a screen capture only after the user approved that capture.
 */
export class AssistantConversation {
  private readonly deps: Dependencies;
  private answering: AbortController | null = null;

  constructor(deps: Dependencies) { this.deps = deps; }

  get isAnswering(): boolean { return this.answering !== null; }

  async answer(id: string, text: string): Promise<void> {
    const { overlay, session, say } = this.deps;
    const replyId = `${id}:reply`;
    if (this.answering) {
      overlay.endReply(replyId, say('busy'), true);
      return;
    }
    const controller = new AbortController();
    this.answering = controller;
    overlay.beginReply(replyId);
    try {
      if (!(await this.deps.model().ensureLoaded())) {
        overlay.endReply(replyId, say(this.deps.model().installed ? 'modelBusy' : 'modelMissing'), true);
        return;
      }
      // Stopped while the model was loading: do not start an answer nobody is waiting for.
      if (controller.signal.aborted) {
        overlay.endReply(replyId, say('stopped'), true);
        return;
      }
      const ask = async (askedAgain: boolean, stream: boolean) => {
        const { system, history, prompt, usesScreen } = session.buildRequest(text, { askedAgain });
        const reply = (await generateParagraph((request) => this.deps.model().generate(request), {
          system, history, prompt, maxTokens: ASSISTANT_LIMITS.replyTokens, repeatPenalty: ASSISTANT_LIMITS.repeatPenalty,
          signal: controller.signal,
          onToken: stream ? (token) => overlay.appendReply(replyId, token) : undefined,
        })).trim();
        return { reply, usesScreen };
      };
      let { reply, usesScreen } = await ask(false, true);
      // A small model often copies its last reply when the user rephrases. One retry, without earlier
      // replies to copy; endReply then replaces the streamed repeat with the new answer.
      if (reply && session.repeatsEarlierAnswer(reply) && !controller.signal.aborted) {
        const retry = await ask(true, false);
        if (retry.reply) ({ reply, usesScreen } = retry);
      }
      if (!reply) {
        overlay.endReply(replyId, say('noAnswer'), true);
        return;
      }
      session.record(text, reply);
      overlay.endReply(replyId, reply, false);
      // Most often the question was about a picture or video, which text recognition cannot read.
      if (usesScreen && saysNotOnScreen(reply)) overlay.showNotice(say('screenLimit'));
    } catch (failure) {
      overlay.endReply(replyId, controller.signal.aborted ? say('stopped')
        : failure instanceof Error ? failure.message : say('failed'), true);
    } finally {
      this.answering = null;
    }
  }

  /** Takes the result of a capture the user approved. Nothing is kept unless readable text came back. */
  captured(event: ScreenCaptureEvent): void {
    const { overlay, session, say } = this.deps;
    if (event.status === 'denied') return overlay.showNotice(say('captureDenied'));
    if (event.status === 'failed') return overlay.showNotice(say('captureFailed'));
    const result = event.status === 'ok' ? session.attachScreen(event) : { attached: false as const };
    if (!result.attached) {
      this.dropScreen();
      return overlay.showNotice(say('captureEmpty'));
    }
    this.deps.onScreenContext?.(true);
    // The sample shows the user exactly what was read. It sits with the attached text and goes when that is discarded.
    overlay.setScreenAttached(true, `${say('linesRead', { count: result.context.lines })}\n“${previewScreenText(result.context.text)}”`);
    if (result.context.quality === 'sparse') overlay.showNotice(say('captureSparse'));
    if (event.action === 'explain') overlay.submitUserMessage(say('askExplain'));
    else if (event.action === 'summarize') overlay.submitUserMessage(say('askSummarize'));
    else overlay.showNotice(say('captureReady'));
  }

  cancel(): void {
    if (!this.answering) return;
    this.answering.abort();
    void this.deps.model().cancel();
  }

  discardScreen(options: { notify: boolean }): void {
    this.dropScreen();
    if (options.notify) this.deps.overlay.showNotice(this.deps.say('screenDiscarded'));
  }

  /** The overlay is gone: stop any answer and forget the conversation and captured text. */
  end(): void {
    this.answering?.abort();
    this.deps.session.clear();
    this.deps.onScreenContext?.(false);
  }

  private dropScreen(): void {
    this.deps.session.discardScreen();
    this.deps.onScreenContext?.(false);
    this.deps.overlay.setScreenAttached(false, null);
  }
}
