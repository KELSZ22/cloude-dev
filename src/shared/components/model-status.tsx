import { useModel } from '@/shared/providers/model-provider';
import { StatusCard } from './status-card';

export function ModelStatus() {
  const { installed, state, native, operation } = useModel();
  const title = !native ? 'AI unavailable on web'
    : operation ? 'Model setup in progress'
    : state.status === 'ready' ? 'Local model loaded'
    : state.status === 'generating' ? 'Local model generating'
    : state.status === 'unsupported' ? 'Development build required'
    : installed ? 'Model installed · not loaded' : 'Model not installed';
  const description = state.status === 'unsupported' ? state.reason
    : state.status === 'error' ? state.message
    : !native ? 'Use an Android development build for local inference.'
    : operation === 'preparing' ? 'Setting up the built-in Qwen3.5 0.8B model. This takes a moment the first time.'
    : state.status === 'ready' || state.status === 'generating' ? 'Qwen3.5 0.8B is running on this device. Answers are written from your offline library.'
    : installed ? 'Qwen3.5 0.8B is stored on this device. Load it to get explanations written from your offline library.'
    : 'Import the selected Qwen3.5 GGUF from your device. No model is downloaded automatically.';
  return <StatusCard variant="ai" title={title} description={description} />;
}
