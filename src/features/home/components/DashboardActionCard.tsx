import { Image } from "expo-image";
import { router, type Href } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { Colors, Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation } from "@/shared/i18n";

type DashboardActionCardProps = {
  label: string;
  title: string;
  href?: Href;
  icon: SymbolViewProps["name"];
  accent: string;
  useLogo?: boolean;
};

export function DashboardActionCard({ label, title, href, icon, accent, useLogo }: DashboardActionCardProps) {
  const colors = useTheme();
  const { t } = useTranslation();
  const disabled = !href;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={disabled ? `${label}, ${t("common.comingSoon")}` : label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => { if (href) router.navigate(href); }}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: colors.dashboardBorder,
          backgroundColor: pressed ? colors.backgroundSelected : colors.backgroundElement,
        },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: accent }]}>
        {useLogo ? (
          <Image
            source={require("@/assets/logo/logo-greenbg.png")}
            contentFit="contain"
            accessible={false}
            accessibilityLabel=""
            style={styles.logo}
          />
        ) : (
          <SymbolView name={icon} size={23} tintColor={Colors.light.backgroundElement} />
        )}
      </View>
      <ThemedText type="smallBold" style={styles.title}>{title}</ThemedText>
      {disabled ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.soon}>
          {t("common.comingSoonLabel")}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "46%",
    minHeight: 112,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.two,
    gap: 6,
  },
  icon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  logo: { width: "100%", height: "100%" },
  title: { textAlign: "center", fontSize: 14, lineHeight: 18 },
  soon: { fontSize: 10, lineHeight: 12 },
});
