/** Foundation status only. Replace with adapter health checks when native services are connected. */
export const readiness = {
  search: { title: 'Search setup pending', description: 'The local search index is not configured yet. No knowledge content is installed.' },
  model: { title: 'AI setup pending', description: 'The on-device runtime is not configured and no GGUF model is installed. AI answers are unavailable.' },
  import: { title: 'Import setup pending', description: 'Local document import is not available in this build yet. TXT and Markdown support comes first.' },
} as const;
