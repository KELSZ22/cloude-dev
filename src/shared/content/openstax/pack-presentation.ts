import type { ImageSource } from "expo-image";
import type { SymbolViewProps } from "expo-symbols";

import type { ThemeColor } from "@/shared/constants/theme";

import type { OpenStaxPackCategory } from "./types";

const earth = require("@/assets/catalog/earth.jpg");
const castle = require("@/assets/catalog/castle.jpg");
const colosseum = require("@/assets/catalog/colosseum.jpg");
const city = require("@/assets/catalog/city.jpg");
const wind = require("@/assets/catalog/wind.jpg");
const solar = require("@/assets/catalog/solar.jpg");
const hydro = require("@/assets/catalog/hydro.jpg");

const CATEGORY_ART: Record<OpenStaxPackCategory, ImageSource> = {
  science: earth,
  history: colosseum,
  technology: city,
  culture: castle,
};

const CATEGORY_ACCENT: Record<OpenStaxPackCategory, ThemeColor> = {
  science: "accentBlue",
  history: "accentGold",
  technology: "tint",
  culture: "tint",
};

const CATEGORY_ICON: Record<OpenStaxPackCategory, SymbolViewProps["name"]> = {
  science: { ios: "globe.americas.fill", android: "public", web: "public" },
  history: {
    ios: "building.columns.fill",
    android: "account_balance",
    web: "account_balance",
  },
  technology: { ios: "laptopcomputer", android: "computer", web: "computer" },
  culture: { ios: "graduationcap.fill", android: "school", web: "school" },
};

const PACK_ART_OVERRIDES: Record<string, ImageSource> = {
  math: solar,
  matematicas: solar,
  nursing: hydro,
  "computer-science": city,
  business: city,
  "social-sciences": colosseum,
  humanities: colosseum,
  science: earth,
  ciencia: earth,
};

export function packArtwork(packId: string, category: OpenStaxPackCategory): ImageSource {
  return PACK_ART_OVERRIDES[packId] ?? CATEGORY_ART[category];
}

export function packAccent(category: OpenStaxPackCategory): ThemeColor {
  return CATEGORY_ACCENT[category];
}

export function packIcon(category: OpenStaxPackCategory): SymbolViewProps["name"] {
  return CATEGORY_ICON[category];
}

export function bookArtwork(category: OpenStaxPackCategory, index: number): ImageSource {
  const pool = [wind, solar, hydro, earth];
  return pool[index % pool.length] ?? CATEGORY_ART[category];
}
