import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useEffect, useState } from 'react';

import { getHomeContent } from '@/features/home/services';
import type { HomeContent } from '@/features/home/types/home.types';
import { ThemedText } from '@/shared/components/themed-text';

export function useHome() {
  const [content, setContent] = useState<HomeContent | null>(null);

  useEffect(() => {
    void getHomeContent().then(setContent);
  }, []);

  const devMenuHint = getDevMenuHint();

  return { content, devMenuHint };
}

function getDevMenuHint() {
  if (Platform.OS === 'web') {
    return <ThemedText type="small">use browser devtools</ThemedText>;
  }
  if (Device.isDevice) {
    return (
      <ThemedText type="small">
        shake device or press <ThemedText type="code">m</ThemedText> in terminal
      </ThemedText>
    );
  }
  const shortcut = Platform.OS === 'android' ? 'cmd+m (or ctrl+m)' : 'cmd+d';
  return (
    <ThemedText type="small">
      press <ThemedText type="code">{shortcut}</ThemedText>
    </ThemedText>
  );
}
