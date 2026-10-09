/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform, type TextStyle } from "react-native";

export const Colors = {
  light: {
    text: "#111827",
    /** Light teal tint — secondary / page backgrounds */
    background: "#E5F8F4",
    backgroundSecondary: "#E5F8F4",
    /** White surface — cards, sheets and input backgrounds */
    backgroundElement: "#FFFFFF",
    /** Warm canvas and colored accents for the illustrated dashboard. */
    backgroundWarm: "#FFFCF5",
    dashboardBorder: "#BEDDDD",
    accentBlue: "#009AAF",
    accentGold: "#E9A008",
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
    backgroundWarm: "#0D1B2A",
    dashboardBorder: "#365653",
    accentBlue: "#007F94",
    accentGold: "#B77905",
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

/**
 * Noto Sans ships one file per weight, and SDK 57 registers each file as its
 * own family, so a weight selects a family name instead of a `fontWeight`.
 * Keep this in sync with the faces loaded in `src/app/_layout.tsx`.
 */
export const NotoSans = {
  400: "NotoSans_400Regular",
  500: "NotoSans_500Medium",
  600: "NotoSans_600SemiBold",
  700: "NotoSans_700Bold",
} as const;

export const Fonts = {
  sans: NotoSans[400],
  medium: NotoSans[500],
  semibold: NotoSans[600],
  bold: NotoSans[700],
  mono: Platform.select({
    ios: "ui-monospace",
    web: "ui-monospace, SFMono-Regular, Menlo, monospace",
    default: "monospace",
  }),
} as const;

const WEIGHTS = [400, 500, 600, 700] as const;

/** Maps any React Native `fontWeight` onto the closest Noto Sans face. */
export function fontFamilyForWeight(weight: TextStyle["fontWeight"]) {
  const requested =
    weight === undefined || weight === "normal"
      ? 400
      : weight === "bold"
        ? 700
        : Number(weight);
  if (!Number.isFinite(requested)) return NotoSans[400];
  const nearest = WEIGHTS.reduce((closest, step) =>
    Math.abs(step - requested) < Math.abs(closest - requested) ? step : closest,
  );
  return NotoSans[nearest];
}

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
