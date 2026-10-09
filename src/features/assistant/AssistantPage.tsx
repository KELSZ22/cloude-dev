import { useState } from 'react';

import { ActionButton } from '@/shared/components/action-button';
import { KnowledgeStatus } from '@/shared/components/knowledge-status';
import { ModelStatus } from '@/shared/components/model-status';
import { NavigationButton } from '@/shared/components/navigation-button';
import { Page } from '@/shared/components/page';
import { StatusCard } from '@/shared/components/status-card';
import { TextField } from '@/shared/components/text-field';
import { ThemedText } from '@/shared/components/themed-text';
import { useModel } from '@/shared/providers/model-provider';
import { AnswerCard } from './components/AnswerCard';
import { useGroundedAnswer } from './hooks';

export default function AssistantPage() {
  const [question, setQuestion] = useState('');
  const model = useModel();
  const { ask, stop, busy, streamed, result, error, modelReady, libraryReady } = useGroundedAnswer();
  const canAsk = libraryReady && !busy && question.trim().length > 0;
  return (
    <Page title="Ask Seekora" description="Answers are written from passages in your offline library, with sources you can open.">
      <TextField label="Your question" placeholder="For example: How do I solve a quadratic equation by factoring?"
        value={question} onChangeText={setQuestion} multiline maxLength={400} editable={!busy} />
      <ActionButton label={modelReady ? 'Ask Seekora' : 'Find supporting passages'} disabled={!canAsk}
        onPress={() => { void ask(question); }} />
      {busy && <StatusCard title={modelReady ? 'Writing an answer on this device…' : 'Searching your library…'}
        description="Nothing leaves this device.">
        {streamed !== '' && <ThemedText selectable>{streamed}</ThemedText>}
        <ActionButton label="Stop" onPress={stop} />
      </StatusCard>}
      {error && <ThemedText themeColor="error" accessibilityRole="alert">{error}</ThemedText>}
      {result && <AnswerCard result={result} />}
      <KnowledgeStatus />
      <ModelStatus />
      {model.error && <ThemedText themeColor="error" accessibilityRole="alert">{model.error}</ThemedText>}
      {!modelReady && model.installed && <ActionButton label="Load the on-device model" disabled={model.operation !== null}
        onPress={() => { void model.loadModel(); }} />}
      {!modelReady && !model.installed && <NavigationButton href="/model" label="Set up the on-device model" />}
    </Page>
  );
}
