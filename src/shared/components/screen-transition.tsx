import type { ComponentType } from "react";

/** How a screen arrives, named after the native stack animation the same route uses. */
export type ScreenTransition = "push" | "fade" | "modal";

/**
 * The native stack animates screens itself, so there is nothing to add on a phone. The web build
 * resolves screen-transition.web.tsx instead, where the stack does not animate at all.
 */
export function withScreenTransition<P extends object>(
  Screen: ComponentType<P>,
  _transition: ScreenTransition = "push",
): ComponentType<P> {
  return Screen;
}
