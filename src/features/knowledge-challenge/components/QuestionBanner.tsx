import { Image } from "expo-image";
import type { SymbolViewProps } from "expo-symbols";
import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";

import { LeafDecor } from "@/shared/components/leaf-decor";
import { useTheme } from "@/shared/hooks/use-theme";
import { withAlpha } from "@/shared/lib/color";

export interface BannerImage {
  uri: string;
  fills: boolean;
  caption: string;
}

/**
 * The picture from the article the question came from. Falls back to the brand's own botanical
 * elements for articles that saved no usable image, and while one is being read from storage.
 */
export function QuestionBanner({
  icon,
  label,
  image,
}: {
  icon: SymbolViewProps["name"];
  label: string;
  image?: BannerImage | null;
}) {
  const colors = useTheme();

  return (
    <View
      accessible
      accessibilityLabel={image?.caption || label}
      style={[
        styles.banner,
        {
          backgroundColor: colors.backgroundSelected,
          borderColor: colors.dashboardBorder,
        },
      ]}
    >
      {image ? (
        <Image
          source={{ uri: image.uri }}
          contentFit={image.fills ? "cover" : "contain"}
          contentPosition="center"
          transition={160}
          accessible={false}
          accessibilityLabel=""
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <>
          <LeafDecor width={120} />
          <View
            style={[
              styles.disc,
              { backgroundColor: withAlpha(colors.backgroundElement, 0.75) },
            ]}
          >
            <SymbolView name={icon} size={44} tintColor={colors.tint} />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: "100%",
    aspectRatio: 16 / 9,
    maxHeight: 180,
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  disc: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
  },
});
