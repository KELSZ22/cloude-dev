import type { ModelContextValue } from "@/shared/providers/model-provider";

/** What the one on-device model is doing, as the assistants report it above a chat. */
export type AssistantModelStatus = "ready" | "loading" | "busy" | "notLoaded" | "missing";

export function assistantModelStatus(model: ModelContextValue): AssistantModelStatus {
  if (!model.installed) return "missing";
  if (model.operation === "verifying" || model.operation === "loading") return "loading";
  if (model.state.status === "generating" || model.operation === "answering") return "busy";
  return model.state.status === "ready" ? "ready" : "notLoaded";
}
