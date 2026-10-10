import { Image } from "expo-image";
import { router, type Href } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useColorScheme } from "@/shared/hooks/use-color-scheme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation } from "@/shared/i18n";

export type DashboardActionCardVariant = "readLearn" | "library";

type DashboardActionCardProps = {
  label: string;
  title: string;
  subtitle: string;
  href?: Href;
  variant: DashboardActionCardVariant;
};

const logos = {
  readLearn: require("@/assets/dashboard/read-and-learn.webp"),
  library: require("@/assets/dashboard/library.webp"),
} as const;

function variantPalette(variant: DashboardActionCardVariant, scheme: "light" | "dark") {
  if (variant === "readLearn") {
    return scheme === "light"
      ? {
          halo: "rgba(16, 185, 129, 0.2)",
          chevron: "#047857",
          subtitle: "#5A756D",
          shadow: "0 4px 14px rgba(15, 23, 42, 0.08)",
        }
      : {
          halo: "rgba(52, 211, 153, 0.22)",
          chevron: "#34D399",
          subtitle: "#8FAEA4",
          shadow: "0 4px 14px rgba(0, 0, 0, 0.35)",
        };
  }

  return scheme === "light"
    ? {
        halo: "rgba(37, 99, 235, 0.16)",
        chevron: "#1D4ED8",
        subtitle: "#5A6D80",
        shadow: "0 4px 14px rgba(15, 23, 42, 0.08)",
      }
    : {
        halo: "rgba(96, 165, 250, 0.2)",
        chevron: "#60A5FA",
        subtitle: "#8FA3B8",
        shadow: "0 4px 14px rgba(0, 0, 0, 0.35)",
      };
}

export function DashboardActionCard({
  label,
  title,
  subtitle,
  href,
  variant,
}: DashboardActionCardProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const scheme = useColorScheme();
  const palette = variantPalette(variant, scheme);
  const disabled = !href;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={disabled ? `${label}, ${t("common.comingSoon")}` : label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        if (href) router.navigate(href);
      }}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? colors.backgroundSelected : colors.backgroundElement,
          boxShadow: palette.shadow,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.halo, { backgroundColor: palette.halo }]}>
          <Image
            source={logos[variant]}
            contentFit="contain"
            accessible={false}
            accessibilityLabel=""
            style={styles.logo}
          />
        </View>
        <View style={styles.chevronWrap}>
          <SymbolView
            name={{
              ios: "chevron.right",
              android: "chevron_right",
              web: "chevron_right",
            }}
            size={20}
            tintColor={palette.chevron}
          />
        </View>
      </View>
      <View style={styles.copy}>
        <ThemedText type="smallBold" style={styles.title}>
          {title}
        </ThemedText>
        <ThemedText
          type="small"
          style={[styles.subtitle, { color: palette.subtitle }]}
        >
          {disabled ? t("common.comingSoonLabel") : subtitle}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: "46%",
    minHeight: 148,
    borderRadius: 24,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  halo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 48,
    height: 48,
  },
  chevronWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    gap: 4,
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: "left",
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: "left",
  },
});
