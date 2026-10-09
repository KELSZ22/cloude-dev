import { createElement } from "react";
import { StyleSheet, View } from "react-native";

export function PdfFrame({ uri }: { uri: string }) {
  return (
    <View style={styles.frame}>
      {createElement("iframe", {
        src: uri,
        title: "PDF",
        style: { width: "100%", height: "100%", border: "none" },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, minHeight: 480 },
});
