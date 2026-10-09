import { Page } from '@/shared/components/page';
import { StatusCard } from '@/shared/components/status-card';
import { readiness } from '@/shared/constants/readiness';

export default function ImportPage() {
  return (
    <Page nested title="Import local knowledge" description="Add your own documents to your offline library.">
      <StatusCard {...readiness.import} />
      <StatusCard title="Supported formats roadmap" description="TXT and Markdown will be copied into app-managed storage and indexed locally. PDF support depends on validating an offline text parser. Scanned PDFs need OCR and are outside the initial MVP." />
    </Page>
  );
}
