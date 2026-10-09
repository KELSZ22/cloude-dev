import { NavigationButton } from '@/shared/components/navigation-button';
import { ModelStatus } from '@/shared/components/model-status';
import { Page } from '@/shared/components/page';
import { StatusCard } from '@/shared/components/status-card';
import { useTranslation } from '@/shared/i18n';

export default function AssistantPage() {
  const { t } = useTranslation();

  return (
    <Page title={t('assistant.title')} description={t('assistant.description')}>
      <ModelStatus />
      <StatusCard variant="ai" title={t('assistant.pendingTitle')} description={t('assistant.pendingBody')}>
        <NavigationButton href="/model" label={t('assistant.viewModel')} />
      </StatusCard>
      <NavigationButton href="/(tabs)/search" label={t('assistant.goToSearch')} />
    </Page>
  );
}
