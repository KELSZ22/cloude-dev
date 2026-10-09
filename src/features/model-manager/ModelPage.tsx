import { Alert } from 'react-native';

import { ActionButton } from '@/shared/components/action-button';
import { ModelStatus } from '@/shared/components/model-status';
import { NavigationButton } from '@/shared/components/navigation-button';
import { Page } from '@/shared/components/page';
import { StatusCard } from '@/shared/components/status-card';
import { ThemedText } from '@/shared/components/themed-text';
import { localModel } from '@/shared/constants/local-model';
import { useModel } from '@/shared/providers/model-provider';

export default function ModelPage() {
  const model = useModel();
  const busy = model.operation !== null;
  function confirmRemove() {
    Alert.alert('Remove local model?', 'This deletes the app-owned model copy and frees storage. Your original file is kept.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => { void model.removeModel(); } },
    ]);
  }
  return (
    <Page nested title="On-device model" description="A compatible local model is required for AI answers.">
      <ModelStatus />
      <StatusCard title={localModel.name} description="529 MB · Apache 2.0 · text inference. Select the exact GGUF from the chosen Hugging Face repository. Import and loading verify its SHA-256. Import opens your phone's file picker; if it shows Google Drive or Recent, open its menu and choose Downloads. Nothing is uploaded.">
        <NavigationButton href={localModel.downloadUrl} label="Open model download (529 MB · online)" />
        <ActionButton label="Import local GGUF" disabled={!model.native || busy || !!model.installed}
          onPress={() => { void model.importModel(); }} />
        <ActionButton label="Verify and load model" disabled={!model.native || busy || !model.installed || model.state.status === 'ready'}
          onPress={() => { void model.loadModel(); }} />
        <ActionButton label="Unload model" disabled={busy || !model.installed || (model.state.status !== 'ready' && model.state.status !== 'error')}
          onPress={() => { void model.unloadModel(); }} />
        <ActionButton label="Remove model files" destructive disabled={!model.native || busy} onPress={confirmRemove} />
      </StatusCard>
      {busy && <StatusCard title="Working locally" description={
        model.operation === 'importing' || model.operation === 'verifying'
          ? `Checking model integrity · ${Math.round(model.progress * 100)}%`
          : model.operation === 'preparing' ? 'Setting up the built-in model. This takes a moment the first time.'
          : model.operation === 'testing' ? 'Generating a short runtime test…'
          : model.operation === 'answering' ? 'Answering a question in Ask Seekora…'
          : model.operation === 'loading' ? 'Loading model into memory…'
          : model.operation === 'choosing' ? 'Choose the GGUF file on your device.' : 'Updating model state…'
      }>
        <ActionButton label="Cancel operation" disabled={model.operation === 'restoring' || model.operation === 'preparing' || model.operation === 'removing' || model.operation === 'unloading'}
          onPress={() => { void model.cancel(); }} />
      </StatusCard>}
      {model.error && <ThemedText themeColor="error" accessibilityRole="alert">{model.error}</ThemedText>}
      <StatusCard title="Test local inference" description="This sends a fixed instruction to your on-device model. It is a runtime check, not a source-grounded research answer.">
        <ActionButton label="Run local test" disabled={busy || model.state.status !== 'ready'} onPress={() => { void model.testModel(); }} />
        {model.output !== '' && <ThemedText selectable>{model.output}</ThemedText>}
      </StatusCard>
      <StatusCard title="Development build required" description="Expo Go cannot run llama.rn. Loading uses a bounded CPU context. Actual model performance and memory requirements still need device validation. The model unloads when the app backgrounds." />
    </Page>
  );
}
