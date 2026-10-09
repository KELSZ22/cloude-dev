import { Page } from '@/shared/components/page';
import { StatusCard } from '@/shared/components/status-card';

export default function PacksPage() {
  return (
    <Page nested title="Knowledge Packs" description="Expandable collections for your offline library.">
      <StatusCard title="No packs installed" description="The starter pack and pack installer are not included yet. Packs must have attribution, a redistribution license, and verified content checksums before installation." />
    </Page>
  );
}
