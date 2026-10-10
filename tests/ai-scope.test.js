import { describe, expect, test } from 'bun:test';

import { normalizeAnswer, repeatsAnswer } from '../src/shared/services/ai/repetition';
import { classifyOutOfScope } from '../src/shared/services/ai/scope';
import { RAG_LIMITS } from '../src/shared/services/rag/context-builder';
import { isFollowUp, resolveFollowUp } from '../src/shared/services/rag/follow-up';

describe('what the app cannot be asked', () => {
  test('names requests that need the moment they are asked in', () => {
    for (const question of [
      "What's the weather today?",
      'Is it raining right now?',
      'Give me the latest news',
      'What time is it?',
      "What is today's date?",
      'Who won the game last night?',
    ]) {
      expect(classifyOutOfScope(question)).toBe('live-data');
    }
  });

  test('names requests to act on the phone', () => {
    for (const question of [
      'Remind me to study at 8pm',
      'Set an alarm for 6am',
      'Send a message to my groupmate',
      'Open the Messenger app',
      'Turn on the flashlight',
      'Play some music',
    ]) {
      expect(classifyOutOfScope(question)).toBe('device-action');
    }
  });

  test('names requests for the reader\'s own accounts', () => {
    for (const question of ['Read my messages', 'Who texted me?', 'What is on my calendar?', 'Where am I?']) {
      expect(classifyOutOfScope(question)).toBe('personal-data');
    }
  });

  // A false positive refuses a legitimate study question, which is worse than answering badly.
  test('leaves study questions alone, including ones that share words with the patterns', () => {
    for (const question of [
      'How does weather form in the tropics?',
      'What causes a typhoon?',
      'What is a set in mathematics?',
      'Recommend a book about algebra',
      'Explain the news cycle as a concept',
      'What is the current in a circuit?',
      'What is the current temperature of the Sun?',
      'What does a call stack do?',
      'Who won the 1986 election?',
      'How does my library search work?',
      'What are my documents stored as?',
      'Summarize the main points of photosynthesis',
      '',
    ]) {
      expect(classifyOutOfScope(question)).toBeNull();
    }
  });

  // How-to questions about the same actions are knowledge questions Seekora can try to answer.
  test('an order is refused but a question about how to do it is not', () => {
    for (const [order, question] of [
      ['Set an alarm for 6am', 'How do I set an alarm on Android?'],
      ['Open the Messenger app', 'How do I open the Settings app?'],
      ['Turn on the flashlight', 'How do I turn on the flashlight?'],
      ['Take a photo of this', 'How do I take a photo in low light?'],
      ['Play some music', 'What makes music sound sad?'],
    ]) {
      expect(classifyOutOfScope(order)).toBe('device-action');
      expect(classifyOutOfScope(question)).toBeNull();
    }
  });
});

describe('repeated answers', () => {
  test('case, spacing and punctuation do not make an answer new', () => {
    const earlier = ['Multiply the exponents.'];
    expect(repeatsAnswer('multiply   the exponents!', earlier)).toBe(true);
    expect(repeatsAnswer('Multiply the exponents, then simplify.', earlier)).toBe(false);
    expect(repeatsAnswer('', earlier)).toBe(false);
    expect(repeatsAnswer('Anything.', [])).toBe(false);
    expect(normalizeAnswer('  Hello,  world! ')).toBe('hello world');
  });
});

describe('follow-up questions', () => {
  const history = [{ question: 'How do I factor a quadratic equation?', answer: 'Split the middle term. [1]' }];

  test('a question that names no subject of its own is a follow-up', () => {
    for (const question of ['Why?', 'Tell me more', 'Can you give an example?', 'Explain that again', 'What about the discriminant?']) {
      expect(isFollowUp(question)).toBe(true);
    }
  });

  test('a short question that names a subject is not', () => {
    for (const question of ['What is slope?', 'What is the quadratic formula?', 'Define photosynthesis']) {
      expect(isFollowUp(question)).toBe(false);
    }
  });

  test('a follow-up is searched with the question it refers back to', () => {
    expect(resolveFollowUp('Why?', history)).toBe('How do I factor a quadratic equation? Why?');
    expect(resolveFollowUp('Tell me more', history)).toBe('How do I factor a quadratic equation? Tell me more');
  });

  test('a fresh question is left exactly as asked', () => {
    expect(resolveFollowUp('What is the slope of a line?', history)).toBe('What is the slope of a line?');
    expect(resolveFollowUp('Why?', [])).toBe('Why?');
  });

  test('a chain of follow-ups keeps pointing at the subject, not at the previous follow-up', () => {
    const chain = [...history, { question: 'Why?', answer: 'Because the factors multiply back. [1]' }];
    expect(resolveFollowUp('And then?', chain)).toBe('How do I factor a quadratic equation? And then?');
  });

  test('the carried question gives way to the new one and never overruns the prompt', () => {
    const long = `${'Explain how the elimination method solves a system of equations '.repeat(12)}?`;
    const resolved = resolveFollowUp('Why?', [{ question: long, answer: 'A long answer.' }]);
    expect(resolved.length).toBeLessThanOrEqual(RAG_LIMITS.questionChars);
    expect(resolved.endsWith('Why?')).toBe(true);
  });
});
