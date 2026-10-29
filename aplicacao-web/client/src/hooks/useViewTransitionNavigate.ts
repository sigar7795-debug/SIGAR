import { useCallback } from "react";
import { flushSync } from "react-dom";
import { useLocation } from "wouter";

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => unknown;
};

export function supportsRouteViewTransitions() {
  if (typeof document === "undefined" || typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  return typeof (document as ViewTransitionDocument).startViewTransition === "function";
}

export function useViewTransitionNavigate() {
  const [, setLocation] = useLocation();

  return useCallback(
    (path: string) => {
      const commitNavigation = () => {
        flushSync(() => setLocation(path));
        window.scrollTo(0, 0);
      };

      const viewTransitionDocument = document as ViewTransitionDocument;
      if (!supportsRouteViewTransitions() || !viewTransitionDocument.startViewTransition) {
        commitNavigation();
        return;
      }

      viewTransitionDocument.startViewTransition(commitNavigation);
    },
    [setLocation],
  );
}
