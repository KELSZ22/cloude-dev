import { Page } from '@/shared/components/page';
import { StatusCard } from '@/shared/components/status-card';
import { useTranslation } from '@/shared/i18n';

export default function ImportPage() {
  const { t } = useTranslation();

  return (
    <Page nested title={t('import.title')} description={t('import.description')}>
      <StatusCard title={t('import.pendingTitle')} description={t('import.pendingBody')} />
      <StatusCard title={t('import.roadmapTitle')} description={t('import.roadmapBody')} />
    </Page>
  );
}
