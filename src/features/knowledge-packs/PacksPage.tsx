import { Page } from '@/shared/components/page';
import { StatusCard } from '@/shared/components/status-card';
import { useTranslation } from '@/shared/i18n';

export default function PacksPage() {
  const { t } = useTranslation();

  return (
    <Page nested title={t('stack.knowledgePacks')} description={t('packs.description')}>
      <StatusCard title={t('packs.emptyTitle')} description={t('packs.emptyBody')} />
    </Page>
  );
}
