const DEFAULT_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

export async function apiClient<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;
  const response = await fetch(`${DEFAULT_BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}
