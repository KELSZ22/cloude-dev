import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { ActionButton } from "@/shared/components/action-button";
import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation } from "@/shared/i18n";

import { pdfStorageKey } from "@/infrastructure/resources/pdf-record";

import { providerLabel, RESEARCH_PROVIDER_IDS } from "../config";
import { searchResources } from "../services/resource-search.service";
import {
  PdfSaveError,
  savedPdfIds,
  saveResourcePdf,
} from "../services/save-resource-pdf";
import type {
  AccessStatus,
  FederatedSearchResult,
  ResourceResult,
} from "../types/resource.types";

const PAGE_SIZE = 8;

type ResourceSnapshot = {
  query: string;
  items: ResourceResult[];
  page: FederatedSearchResult | null;
  failed: boolean;
};

export function ResourceSearchResults({
  query,
  immediate = false,
}: {
  query: string;
  immediate?: boolean;
}) {
  const colors = useTheme();
  const { t } = useTranslation();
  const trimmed = query.trim();
  const [debounced, setDebounced] = useState(trimmed);
  const submitted = immediate ? trimmed : debounced;
  const [snapshot, setSnapshot] = useState<ResourceSnapshot | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [pdfBusyId, setPdfBusyId] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<{
    id: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    void savedPdfIds().then(setSavedIds);
  }, []);

  useEffect(() => {
    if (immediate) return;
    const handle = setTimeout(() => setDebounced(trimmed), 400);
    return () => clearTimeout(handle);
  }, [immediate, trimmed]);

  useEffect(() => {
    if (submitted.length < 2) return;
    const controller = new AbortController();
    const request = submitted;
    void searchResources(
      {
        query: request,
        pageSize: PAGE_SIZE,
        signal: controller.signal,
      },
      RESEARCH_PROVIDER_IDS,
    )
      .then((next) => {
        if (controller.signal.aborted) return;
        setSnapshot({ query: request, items: next.results, page: next, failed: false });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setSnapshot({ query: request, items: [], page: null, failed: true });
        }
      });
    return () => controller.abort();
  }, [submitted]);

  const current = snapshot?.query === submitted ? snapshot : null;
  const items = current?.items ?? [];
  const page = current?.page ?? null;
  const failed = current?.failed ?? false;
  const loading = submitted.length >= 2 && current === null;

  async function loadMore() {
    if (!page?.nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await searchResources(
        {
          query: submitted,
          pageSize: PAGE_SIZE,
          cursor: page.nextCursor,
        },
        RESEARCH_PROVIDER_IDS,
      );
      setSnapshot((existing) => {
        if (!existing || existing.query !== submitted) return existing;
        const seen = new Set(existing.items.map((item) => item.id));
        return {
          query: submitted,
          page: next,
          failed: false,
          items: [...existing.items, ...next.results.filter((item) => !seen.has(item.id))],
        };
      });
    } catch {
      setSnapshot((existing) =>
        existing && existing.query === submitted ? { ...existing, failed: true } : existing,
      );
    } finally {
      setLoadingMore(false);
    }
  }

  async function downloadPdf(item: ResourceResult, url: string) {
    setPdfBusyId(item.id);
    setPdfError(null);
    try {
      await saveResourcePdf({ resourceId: item.id, title: item.title, url });
      setSavedIds((current) =>
        current.includes(pdfStorageKey(item.id))
          ? current
          : [...current, pdfStorageKey(item.id)],
      );
      router.push({
        pathname: "/pdf/[id]",
        params: { id: pdfStorageKey(item.id) },
      });
    } catch (error) {
      const code = error instanceof PdfSaveError ? error.code : "network";
      const key =
        code === "not-pdf"
          ? "search.pdfFailedType"
          : code === "too-large"
            ? "search.pdfFailedSize"
            : code === "storage"
              ? "search.pdfFailedStorage"
              : "search.pdfFailedNetwork";
      setPdfError({ id: item.id, message: t(key) });
    } finally {
      setPdfBusyId(null);
    }
  }

  if (submitted.length < 2) return null;

  const message = failed
    ? t("search.resourcesFailed")
    : page?.networkUnavailable
      ? t("search.resourcesOffline")
      : null;
  const partial =
    page?.providers.some((status) => status.state === "error") ?? false;
  const accessLabel: Record<AccessStatus, string> = {
    "open-access": t("search.accessOpen"),
    restricted: t("search.accessRestricted"),
    unknown: t("search.accessUnknown"),
  };

  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="tint">
        {t("search.resourcesTitle")}
      </ThemedText>
      {loading ? (
        <ActivityIndicator
          color={colors.tint}
          accessibilityLabel={t("search.resourcesSearching")}
        />
      ) : null}
      {message ? (
        <ThemedText accessibilityRole="alert" style={{ color: colors.error }}>
          {message}
        </ThemedText>
      ) : null}
      {!loading && !message && items.length === 0 ? (
        <ThemedText themeColor="textSecondary">
          {t("search.resourcesEmpty")}
        </ThemedText>
      ) : null}
      {!loading && items.length > 0 ? (
        <ThemedText
          type="small"
          themeColor="textSecondary"
          accessibilityLiveRegion="polite"
        >
          {t("search.resourcesCount", { count: items.length })}
          {partial ? ` · ${t("search.resourcesPartial")}` : ""}
        </ThemedText>
      ) : null}
      {items.map((item) => {
        const pdf =
          item.canDownload === true ? (item.pdfUrl ?? item.fileUrl) : undefined;
        const source = [
          item.provenance ?? providerLabel(item.provider),
          ...(item.alsoFoundAt ?? []).map(providerLabel),
        ]
          .filter(Boolean)
          .join(" · ");
        const authors = item.authors.slice(0, 3).join(", ");
        return (
          <View
            key={item.id}
            style={[
              styles.card,
              {
                backgroundColor: colors.backgroundElement,
                borderColor: colors.dashboardBorder,
              },
            ]}
          >
            <ThemedText type="smallBold" numberOfLines={2}>
              {item.title}
            </ThemedText>
            {authors ? (
              <ThemedText
                type="small"
                themeColor="textSecondary"
                numberOfLines={1}
              >
                {authors}
              </ThemedText>
            ) : null}
            {item.description ? (
              <ThemedText
                type="small"
                themeColor="textSecondary"
                numberOfLines={2}
              >
                {item.description}
              </ThemedText>
            ) : null}
            <ThemedText type="small" themeColor="textSecondary">
              {source} · {accessLabel[item.accessStatus]}
              {item.license ? ` · ${item.license}` : ""}
            </ThemedText>
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`${t("search.resourcesOpen")}: ${item.title}`}
                onPress={() => void Linking.openURL(item.sourceUrl)}
              >
                <ThemedText type="smallBold" style={{ color: colors.tint }}>
                  {t("search.resourcesOpen")}
                </ThemedText>
              </Pressable>
              {pdf ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${savedIds.includes(pdfStorageKey(item.id)) ? t("search.resourcesReadPdf") : t("search.resourcesDownloadPdf")}: ${item.title}`}
                  disabled={pdfBusyId === item.id}
                  onPress={() => {
                    if (savedIds.includes(pdfStorageKey(item.id))) {
                      router.push({
                        pathname: "/pdf/[id]",
                        params: { id: pdfStorageKey(item.id) },
                      });
                      return;
                    }
                    void downloadPdf(item, pdf);
                  }}
                >
                  <ThemedText type="smallBold" style={{ color: colors.tint }}>
                    {pdfBusyId === item.id
                      ? t("search.resourcesDownloadingPdf")
                      : savedIds.includes(pdfStorageKey(item.id))
                        ? t("search.resourcesReadPdf")
                        : t("search.resourcesDownloadPdf")}
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
            {pdfError?.id === item.id ? (
              <ThemedText
                accessibilityRole="alert"
                style={{ color: colors.error }}
              >
                {pdfError.message}
              </ThemedText>
            ) : null}
          </View>
        );
      })}
      {page?.nextCursor && !loading ? (
        <ActionButton
          label={
            loadingMore
              ? t("search.resourcesSearching")
              : t("search.resourcesMore")
          }
          disabled={loadingMore}
          onPress={() => void loadMore()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  card: { borderWidth: 1, borderRadius: 18, padding: Spacing.three, gap: 4 },
  actions: { flexDirection: "row", gap: Spacing.three, marginTop: 4 },
});
