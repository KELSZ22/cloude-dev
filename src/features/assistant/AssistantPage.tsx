import { useState } from 'react';

import { ActionButton } from '@/shared/components/action-button';
import { KnowledgeStatus } from '@/shared/components/knowledge-status';
import { ModelStatus } from '@/shared/components/model-status';
import { NavigationButton } from '@/shared/components/navigation-button';
import { Page } from '@/shared/components/page';
import { StatusCard } from '@/shared/components/status-card';
import { TextField } from '@/shared/components/text-field';
import { ThemedText } from '@/shared/components/themed-text';
import { useTranslation } from '@/shared/i18n';
import { useModel } from '@/shared/providers/model-provider';
import { AnswerCard } from './components/AnswerCard';
import { useGroundedAnswer } from './hooks';

export default function AssistantPage() {
  const [question, setQuestion] = useState('');
  const { t } = useTranslation();
  const model = useModel();
  const { ask, stop, busy, streamed, result, error, modelReady, libraryReady } = useGroundedAnswer();
  const canAsk = libraryReady && !busy && question.trim().length > 0;
  return (
    <Page title={t('assistant.title')} description={t('assistant.description')}>
      <TextField label={t('assistant.questionLabel')} placeholder={t('assistant.questionPlaceholder')}
        value={question} onChangeText={setQuestion} multiline maxLength={400} editable={!busy} />
      <ActionButton label={modelReady ? t('assistant.ask') : t('assistant.findPassages')} disabled={!canAsk}
        onPress={() => { void ask(question); }} />
      {busy && <StatusCard title={modelReady ? t('assistant.writing') : t('assistant.searching')}
        description={t('assistant.staysOnDevice')}>
        {streamed !== '' && <ThemedText selectable>{streamed}</ThemedText>}
        <ActionButton label={t('assistant.stop')} onPress={stop} />
      </StatusCard>}
      {error && <ThemedText themeColor="error" accessibilityRole="alert">{error}</ThemedText>}
      {result && <AnswerCard result={result} />}
      <KnowledgeStatus />
      <ModelStatus />
      {model.error && <ThemedText themeColor="error" accessibilityRole="alert">{model.error}</ThemedText>}
      {!modelReady && model.installed && <ActionButton label={t('assistant.loadModel')} disabled={model.operation !== null}
        onPress={() => { void model.loadModel(); }} />}
      {!modelReady && !model.installed && <NavigationButton href="/model" label={t('assistant.setupModel')} />}
    </Page>
  );
}
