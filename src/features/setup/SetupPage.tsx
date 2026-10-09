import { KnowledgeStatus } from '@/shared/components/knowledge-status';
import { NavigationButton } from '@/shared/components/navigation-button';
import { ModelStatus } from '@/shared/components/model-status';
import { Page } from '@/shared/components/page';
import { useTranslation } from '@/shared/i18n';

export default function SetupPage() {
  const { t } = useTranslation();

  return (
    <Page nested title={t('setup.title')} description={t('setup.description')}>
      <KnowledgeStatus />
      <ModelStatus />
      <NavigationButton href="/(tabs)/search" label={t('setup.continueSearch')} />
      <NavigationButton href="/model" label={t('setup.reviewModel')} />
    </Page>
  );
}
