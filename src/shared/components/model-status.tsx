import { useTranslation } from '@/shared/i18n';
import { useModel } from '@/shared/providers/model-provider';
import { StatusCard } from './status-card';

export function ModelStatus() {
  const { installed, state, native, operation } = useModel();
  const { t } = useTranslation();
  const title = !native ? t('model.unavailableWeb')
    : operation ? t('model.setupInProgress')
    : state.status === 'ready' ? t('model.loaded')
    : state.status === 'generating' ? t('model.generating')
    : state.status === 'unsupported' ? t('model.devBuildTitle')
    : installed ? t('model.installedNotLoaded') : t('model.notInstalled');
  const description = state.status === 'unsupported' ? state.reason
    : state.status === 'error' ? state.message
    : !native ? t('model.webBody')
    : installed ? t('model.installedBody')
    : t('model.missingBody');
  return <StatusCard variant="ai" title={title} description={description} />;
}
