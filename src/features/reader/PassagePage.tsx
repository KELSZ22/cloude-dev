import { useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Page } from '@/shared/components/page';
import { StatusCard } from '@/shared/components/status-card';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { usePassage } from './hooks/usePassage';

export default function PassagePage() {
  const { chunkId } = useLocalSearchParams<{ chunkId: string }>();
  const view = usePassage(chunkId);
  const colors = useTheme();

  if (view.status === 'loading') return <Page nested title="Source passage" description="Opening the stored passage…" />;
  if (view.status === 'missing') {
    return (
      <Page nested title="Passage not found" description="This passage is no longer in your offline library.">
        <StatusCard title="Nothing to show" description="The knowledge pack it came from may have been removed or updated." />
      </Page>
    );
  }
  if (view.status === 'error') {
    return (
      <Page nested title="Source passage">
        <ThemedText themeColor="error" accessibilityRole="alert">{view.message}</ThemedText>
      </Page>
    );
  }

  const { chunk, document, pack, section } = view;
  const location = [document.chapter, document.section && `Section ${document.section}`].filter(Boolean).join(' · ');
  return (
    <Page nested title={document.title} description={location || undefined}>
      {section.map((part) => part.id === chunk.id
        ? <ThemedView key={part.id} type="backgroundSelected" accessibilityLabel="Cited passage"
            style={[styles.cited, { borderColor: colors.tint }]}>
            <ThemedText type="smallBold" themeColor="tint">Cited passage</ThemedText>
            <ThemedText selectable>{part.text}</ThemedText>
          </ThemedView>
        : <ThemedText key={part.id} selectable themeColor="textSecondary">{part.text}</ThemedText>)}
      <StatusCard title="Source details" description={pack ? `${pack.name} · version ${pack.version}` : 'Imported document'}>
        <ThemedText type="small">Author: {document.author ?? 'Unknown'}</ThemedText>
        {pack && <ThemedText type="small">Publisher: {pack.publisher}</ThemedText>}
        {pack && <ThemedText type="small">Origin: {pack.source}</ThemedText>}
        <ThemedText type="small">License: {document.license}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">Passage ID: {chunk.passageId ?? chunk.id}</ThemedText>
      </StatusCard>
    </Page>
  );
}

const styles = StyleSheet.create({
  cited: { borderWidth: 1, borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
});
