/**
 * Desktop-only development check. Runs the app's real retrieval, prompt, and citation code against a
 * model served by a local Ollama instance, so prompts can be tried without an Android device.
 * The app itself never talks to Ollama.
 *
 *   bun scripts/rag-desktop-check.mjs <ollama-model> ["question" ...]
 */
import samplePack from '../assets/knowledge-packs/algebra-starter-sample.json';
import { migrate } from '../src/infrastructure/database/migrations';
import { SqliteKnowledgeRepository } from '../src/infrastructure/database/sqlite-knowledge-repository';
import { parsePack } from '../src/infrastructure/knowledge/pack-format';
import { answerQuestion } from '../src/shared/services/rag/answer-question';
import { openTestDatabase } from '../tests/support/bun-sqlite-driver.js';

const [model, ...asked] = process.argv.slice(2);
if (!model) throw new Error('Usage: bun scripts/rag-desktop-check.mjs <ollama-model> ["question" ...]');
const questions = asked.length ? asked : [
  // The sample pack answers these.
  'How do I solve a quadratic equation by factoring?',
  'What is the quadratic formula?',
  'How do I find the slope of a line through two points?',
  'What does a negative exponent mean?',
  'What is the domain of a function?',
  'How does the elimination method work?',
  'What happens when you multiply powers with the same base?',
  // It does not answer these; each should end as insufficient evidence.
  'Who invented the quadratic formula?',
  'Who discovered the slope of a line?',
  'What is the derivative of a quadratic function?',
  'What is the capital of France?',
];

// Mirrors the settings in src/infrastructure/llm/llama-engine.ts.
const SYSTEM = 'Follow the user instruction. Be brief. Do not invent citations.';
async function generate({ prompt, maxTokens }) {
  const response = await fetch('http://127.0.0.1:11434/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      model, stream: false, think: false,
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: prompt }],
      options: { temperature: 0, num_ctx: 2048, num_predict: maxTokens },
    }),
  });
  if (!response.ok) throw new Error(`Ollama returned ${response.status}: ${await response.text()}`);
  return (await response.json()).message.content;
}

const database = openTestDatabase();
await migrate(database);
const repository = new SqliteKnowledgeRepository(database);
await repository.installPack(parsePack(samplePack));

for (const question of questions) {
  const started = performance.now();
  const answer = await answerQuestion({ repository, generate }, { question });
  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  console.log(`\nQ: ${question}  (${seconds}s)`);
  if (answer.status === 'insufficient-evidence') { console.log(`   insufficient evidence: ${answer.reason}`); continue; }
  console.log(`   ${answer.text.replace(/\n/g, '\n   ')}`);
  for (const citation of answer.citations) {
    const chunk = await repository.getChunk(citation.chunkId);
    console.log(`   [${citation.sourceId}] ${citation.title} -> ${chunk.passageId}${answer.citedByModel ? '' : ' (not cited by the model)'}`);
  }
}
