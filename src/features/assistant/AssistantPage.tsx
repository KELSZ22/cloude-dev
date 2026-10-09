import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";

import { useAssistantSheetStore } from "@/shared/stores/assistant-sheet-store";

/** The assistant lives in a sheet. This route only remains so the AI tab can exist. */
export default function AssistantPage() {
  const openAssistant = useAssistantSheetStore((state) => state.openAssistant);

  useFocusEffect(
    useCallback(() => {
      openAssistant();
      if (router.canGoBack()) router.back();
      else router.replace("/");
    }, [openAssistant]),
  );

  return null;
}
