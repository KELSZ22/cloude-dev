import { Page } from '@/shared/components/page';
import { StatusCard } from '@/shared/components/status-card';
import { readiness } from '@/shared/constants/readiness';

export default function ModelPage() {
  return (
    <Page nested title="On-device model" description="A compatible local model is required for AI answers.">
      <StatusCard {...readiness.model} />
      <StatusCard title="Development build required" description="The planned llama.rn runtime requires a native Android development build. Expo Go will support the shell, but cannot run that runtime." />
      <StatusCard title="Bring your own GGUF" description="Manual model import will be added after compatibility validation. Model license, integrity, and available memory must be checked before loading. No model is bundled or downloaded automatically." />
    </Page>
  );
}
