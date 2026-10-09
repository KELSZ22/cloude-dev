import type { HomeContent } from '@/features/home/types/home.types';

export async function getHomeContent(): Promise<HomeContent> {
  return {
    title: 'Welcome to Expo',
    subtitle: 'get started',
  };
}
