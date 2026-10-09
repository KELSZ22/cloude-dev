import { Alert } from 'react-native';

import { ActionButton } from '@/shared/components/action-button';
import { ModelStatus } from '@/shared/components/model-status';
import { NavigationButton } from '@/shared/components/navigation-button';
import { Page } from '@/shared/components/page';
import { StatusCard } from '@/shared/components/status-card';
import { ThemedText } from '@/shared/components/themed-text';
import { localModel } from '@/shared/constants/local-model';
import { useTranslation } from '@/shared/i18n';
import { useModel } from '@/shared/providers/model-provider';

export default function ModelPage() {
  const model = useModel();
  const { t } = useTranslation();
  const busy = model.operation !== null;
  function confirmRemove() {
    Alert.alert(t('model.removeTitle'), t('model.removeBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.remove'), style: 'destructive', onPress: () => { void model.removeModel(); } },
    ]);
  }
  const working = model.operation === 'importing' || model.operation === 'verifying'
    ? t('model.checking', { percent: Math.round(model.progress * 100) })
    : model.operation === 'preparing' ? t('model.preparing')
    : model.operation === 'testing' ? t('model.testing')
    : model.operation === 'answering' ? t('model.answering')
    : model.operation === 'loading' ? t('model.loading')
    : model.operation === 'choosing' ? t('model.choosing')
    : t('model.updating');
  return (
    <Page nested title={t('stack.onDeviceModel')} description={t('model.description')}>
      <ModelStatus />
      <StatusCard title={localModel.name} description={t('model.cardBody')}>
        <NavigationButton href={localModel.downloadUrl} label={t('model.openDownload')} />
        <ActionButton label={t('model.importGguf')} disabled={!model.native || busy || !!model.installed}
          onPress={() => { void model.importModel(); }} />
        <ActionButton label={t('model.verifyLoad')} disabled={!model.native || busy || !model.installed || model.state.status === 'ready'}
          onPress={() => { void model.loadModel(); }} />
        <ActionButton label={t('model.unload')} disabled={busy || !model.installed || (model.state.status !== 'ready' && model.state.status !== 'error')}
          onPress={() => { void model.unloadModel(); }} />
        <ActionButton label={t('model.removeFiles')} destructive disabled={!model.native || busy} onPress={confirmRemove} />
      </StatusCard>
      {busy && <StatusCard variant="ai" title={t('model.working')} description={working}>
        <ActionButton label={t('model.cancelOperation')} disabled={model.operation === 'restoring' || model.operation === 'preparing' || model.operation === 'removing' || model.operation === 'unloading'}
          onPress={() => { void model.cancel(); }} />
      </StatusCard>}
      {model.error && <ThemedText themeColor="error" accessibilityRole="alert">{model.error}</ThemedText>}
      <StatusCard variant="ai" title={t('model.testTitle')} description={t('model.testBody')}>
        <ActionButton label={t('model.runTest')} disabled={busy || model.state.status !== 'ready'} onPress={() => { void model.testModel(); }} />
        {model.output !== '' && <ThemedText selectable>{model.output}</ThemedText>}
      </StatusCard>
      <StatusCard title={t('model.devBuildTitle')} description={t('model.devBuildBody')} />
    </Page>
  );
}
