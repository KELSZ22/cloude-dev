import { useOnboardingStore } from "@/shared/stores/onboarding-store";

import { en, type DeepString, type Dict } from "./en";
import { fil } from "./fil";

type LeafPaths<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : LeafPaths<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type MessageKey = LeafPaths<Dict>;

const catalogs = { en, fil } as const;

function lookup(dict: DeepString<Dict>, key: MessageKey) {
  const value = key.split(".").reduce<unknown>((node, part) => {
    if (node && typeof node === "object" && part in node) {
      return (node as Record<string, unknown>)[part];
    }
    return undefined;
  }, dict);
  return typeof value === "string" ? value : key;
}

function interpolate(
  template: string,
  vars?: Record<string, string | number>,
) {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    name in vars ? String(vars[name]) : "",
  );
}

export function useTranslation() {
  const locale = useOnboardingStore((state) => state.language);
  const dict = catalogs[locale];

  function t(key: MessageKey, vars?: Record<string, string | number>) {
    return interpolate(lookup(dict, key), vars);
  }

  return { t, locale };
}
