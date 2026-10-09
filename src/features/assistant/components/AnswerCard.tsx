import { PassageLink } from '@/shared/components/passage-link';
import { StatusCard } from '@/shared/components/status-card';
import { ThemedText } from '@/shared/components/themed-text';
import type { AskResult } from '../hooks';

const INSUFFICIENT = {
  'no-match': 'Nothing in your offline library mentions this topic.',
  'weak-match': 'Your offline library mentions parts of this question, but no passage covers enough of it to support an answer.',
  'model-declined': 'The passages found in your offline library do not answer this question.',
} as const;

export function AnswerCard({ result }: { result: AskResult }) {
  if (result.status === 'insufficient-evidence') {
    return <StatusCard title="Not enough evidence" description={`${INSUFFICIENT[result.reason]} Seekora does not answer without a source. Try different words, or add content to your library.`} />;
  }
  const title = result.status === 'passages-only' ? 'Supporting passages'
    : result.citedByModel ? 'Sources' : 'Passages used for this answer';
  return (
    <>
      {result.status === 'answered'
        ? <StatusCard variant="ai" title="Answer" description="Generated on this device from the sources below. Check the passages for the exact wording.">
            <ThemedText selectable>{result.text}</ThemedText>
          </StatusCard>
        : <StatusCard title="Model not loaded" description="These passages match your question. Load the on-device model to get an explanation written from them." />}
      <ThemedText type="subtitle" accessibilityRole="header">{title}</ThemedText>
      {result.citations.map((citation) => (
        <PassageLink key={citation.chunkId} chunkId={citation.chunkId} title={citation.title} marker={citation.sourceId}
          detail="Open the stored passage" />
      ))}
    </>
  );
}
