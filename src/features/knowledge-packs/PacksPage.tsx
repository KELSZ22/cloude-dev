import { ActionButton } from '@/shared/components/action-button';
import { KnowledgeStatus } from '@/shared/components/knowledge-status';
import { Page } from '@/shared/components/page';
import { StatusCard } from '@/shared/components/status-card';
import { ThemedText } from '@/shared/components/themed-text';
import { useTranslation } from '@/shared/i18n';
import { useKnowledge } from '@/shared/providers/knowledge-provider';

export default function PacksPage() {
  const { t } = useTranslation();
  const { state, bundled, installing, installPacks } = useKnowledge();
  const packs = state.status === 'ready' ? state.packs : [];
  const available = bundled.filter((pack) => !packs.some((installed) => installed.id === pack.id));
  return (
    <Page nested title={t('stack.knowledgePacks')} description={t('packs.description')}>
      <KnowledgeStatus />
      {packs.map((pack) => (
        <StatusCard key={pack.id} title={pack.name} description={pack.description}>
          <ThemedText type="small">{t('packs.versionLine', { version: pack.version, language: pack.language })}</ThemedText>
          <ThemedText type="small">{t('packs.author', { author: pack.author })}</ThemedText>
          <ThemedText type="small">{t('packs.origin', { source: pack.source })}</ThemedText>
          <ThemedText type="small">{t('packs.license', { license: pack.license })}</ThemedText>
        </StatusCard>
      ))}
      {available.map((pack) => (
        <StatusCard key={pack.id} title={pack.title} description={pack.description}>
          <ThemedText type="small">{t('onboarding.packMeta', { passages: pack.passages, language: pack.language.toUpperCase(), license: pack.license })}</ThemedText>
          <ActionButton label={t('packs.add')} disabled={installing || state.status !== 'ready'}
            onPress={() => { void installPacks([pack.id]); }} />
        </StatusCard>
      ))}
      <StatusCard title={t('packs.moreTitle')} description={t('packs.moreBody')} />
    </Page>
  );
}
