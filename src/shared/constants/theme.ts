/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#111827",
    /** Light teal tint — secondary / page backgrounds */
    background: "#E5F8F4",
    backgroundSecondary: "#E5F8F4",
    /** White surface — cards, sheets and input backgrounds */
    backgroundElement: "#FFFFFF",
    /** Light green tint — selected cards and AI panels */
    backgroundSelected: "#E4F5EE",
    /** Captions, metadata and hints */
    textSecondary: "#64748B",
    tint: "#047857",
    /** Primary pressed — pressed buttons */
    tintPressed: "#087A55",
    /** Input fields, dividers and cards */
    border: "#E2E8F0",
    /** Disabled controls */
    disabled: "#CBD5E1",
    brand: "#0D1B2A",
    error: "#DC2626",
  },
  dark: {
    text: "#ffffff",
    background: "#0D1B2A",
    backgroundSecondary: "#122A28",
    backgroundElement: "#162638",
    backgroundSelected: "#193C35",
    textSecondary: "#A7B5C6",
    tint: "#34D399",
    tintPressed: "#087A55",
    border: "#304257",
    disabled: "#475569",
    brand: "#F8FAFC",
    error: "#F87171",
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({
  ios: 50,
  android: 80,
  web: 72,
  default: 56,
});
