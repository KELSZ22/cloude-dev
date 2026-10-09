import type { AppLocale } from "@/shared/stores/onboarding-store";

/** BCP-47 tag the speech recognisers expect, for the languages the app ships. */
export function recognitionLang(locale: AppLocale) {
  return locale === "fil" ? "fil-PH" : "en-US";
}
