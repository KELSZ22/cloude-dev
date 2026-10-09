import { NavigationButton } from '@/shared/components/navigation-button';
import { ModelStatus } from '@/shared/components/model-status';
import { Page } from '@/shared/components/page';
import { StatusCard } from '@/shared/components/status-card';
import { useTranslation } from '@/shared/i18n';
import { contentSources } from '@/shared/constants/content-sources';

export default function SetupPage() {
  const { t } = useTranslation();

  return (
    <Page nested title={t('setup.title')} description={t('setup.description')}>
      <StatusCard title={t(contentSources.openStax ? 'setup.searchTitle' : 'reading.setupTitle')} description={t(contentSources.openStax ? 'setup.searchBody' : 'reading.setupBody')} />
      {!contentSources.openStax ? <NavigationButton href="/(tabs)/search" label={t('reading.browse')} /> : null}
      <ModelStatus />
      <NavigationButton href="/(tabs)/search" label={t('setup.continueSearch')} />
      <NavigationButton href="/model" label={t('setup.reviewModel')} />
    </Page>
  );
}
