/**
 * What Seekora can be asked. Both assistants share this so the same request gets the same
 * treatment in the app and in the floating bubble.
 *
 * Only requests the app genuinely cannot serve are named here: it has no connection while
 * answering, no permission to act on the phone, and no access to the user's accounts. Anything
 * else is a knowledge question, answered from the offline library where possible.
 *
 * The patterns deliberately under-match. A missed case falls through to normal handling, which is
 * merely unhelpful; a false positive refuses a legitimate study question, which is worse. So a
 * topic word never classifies on its own: an order has to read as an order ("Set an alarm", not
 * "How do I set an alarm?"), and a request for live data has to ask about the present moment.
 */

export type OutOfScope =
  /** Needs data from the moment it is asked: today's weather, news, prices, scores, the time. */
  | 'live-data'
  /** Asks Seekora to do something on the phone: send a message, set an alarm, open an app. */
  | 'device-action'
  /** Asks about the user's own accounts, messages or photos, which Seekora cannot read. */
  | 'personal-data';

/** A present-moment word, required so "how do typhoons form" stays a knowledge question. */
const NOW = String.raw`(?:today|tonight|tomorrow|right now|current(?:ly)?|latest|this (?:week|morning|afternoon|evening))`;
/** An order starts the message. A how-to question about the same action does not. */
const ORDER = String.raw`^(?:please\s+|hey,?\s*seekora[,\s]+)?`;

const order = (pattern: string) => new RegExp(ORDER + pattern, 'i');
const nowAbout = (topics: string) => [
  new RegExp(String.raw`\b(?:${topics})\b[^.?!]*\b${NOW}\b`, 'i'),
  new RegExp(String.raw`\b${NOW}\b[^.?!]*\b(?:${topics})\b`, 'i'),
];

const LIVE_DATA: readonly RegExp[] = [
  ...nowAbout('weather|forecast|raining|typhoon|traffic'),
  ...nowAbout('news|headlines|exchange rate|stock price|share price'),
  /\bwhat (?:time|day|date) is it\b/i,
  /\b(?:today's|current) (?:date|time|news|price|weather)\b/i,
  /\btemperature (?:outside|here|today|right now)\b/i,
  new RegExp(String.raw`\bwho won\b[^.?!]*\b(?:${NOW}|last night|yesterday|this season)\b`, 'i'),
];

const DEVICE_ACTION: readonly RegExp[] = [
  /\bremind me\b/i,
  order(String.raw`(?:set|cancel|snooze)\s+(?:(?:an?|my|the)\s+)?(?:alarm|timer|reminder)\b`),
  order(String.raw`(?:send|text|forward)\s+(?:(?:an?|my|the)\s+)?(?:email|e-mail|text|message|sms|photo|file)\b`),
  // Capitalised so a contact's name counts, but "Call Stack" after "what does" never reaches here.
  new RegExp(ORDER + String.raw`(?:call|dial|ring|video call)\s+(?:him|her|them|my\b|mom|dad|[A-Z]\w+)`),
  order(String.raw`(?:open|launch|install|uninstall|update)\s+(?:the\s+)?[\w .-]{0,24}app\b`),
  order(String.raw`turn\s+(?:on|off)\s+(?:the\s+)?(?:wi-?fi|bluetooth|flashlight|torch|data|airplane mode|location|gps)\b`),
  order(String.raw`(?:take|snap)\s+(?:a\s+)?(?:photo|picture|screenshot|selfie)\b`),
  order(String.raw`(?:navigate|directions|take me)\s+to\b`),
  order(String.raw`play\s+(?:some\s+)?(?:music|a song|spotify|youtube)\b`),
];

/**
 * Only the user's own private data. Their reading material is in scope, so "my library",
 * "my documents", "my articles" and "my packs" must not appear here.
 */
const PERSONAL_DATA: readonly RegExp[] = [
  /\bmy (?:messages|texts|text messages|emails|e-mails|inbox|chats|contacts|photos|gallery|camera roll|calendar|passwords?|bank|balance|location|call log|browsing history)\b/i,
  /\bwho (?:texted|messaged|called|emailed) me\b/i,
  /\bwhere am i\b/i,
  /\bwhat(?:'s| is) (?:on )?my (?:schedule|calendar)\b/i,
];

const CHECKS: readonly (readonly [OutOfScope, readonly RegExp[]])[] = [
  ['device-action', DEVICE_ACTION],
  ['personal-data', PERSONAL_DATA],
  ['live-data', LIVE_DATA],
];

/**
 * Names the reason a request is outside what the app can do, or null when it is a question
 * Seekora should try to answer.
 */
export function classifyOutOfScope(question: string): OutOfScope | null {
  const asked = question.trim();
  if (!asked) return null;
  for (const [reason, patterns] of CHECKS) {
    if (patterns.some((pattern) => pattern.test(asked))) return reason;
  }
  return null;
}
