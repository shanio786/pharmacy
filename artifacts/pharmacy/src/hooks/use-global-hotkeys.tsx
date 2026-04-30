import { useEffect } from "react";
import { useLocation } from "wouter";

export function useGlobalHotkeys() {
  const [, navigate] = useLocation();

  useEffect(() => {
    function isTypingTarget(t: EventTarget | null): boolean {
      if (!(t instanceof HTMLElement)) return false;
      const tag = t.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (t.isContentEditable) return true;
      return false;
    }

    function handler(e: KeyboardEvent) {
      // Only listen to plain function keys; ignore when modifier active.
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const key = e.key;
      // F8 (print) and F4 (search) work even from inputs because they don't
      // type characters; everything else is suppressed in input fields.
      const inInput = isTypingTarget(e.target);
      switch (key) {
        case "F2":
          if (inInput) return;
          e.preventDefault();
          navigate("/pos");
          break;
        case "F3":
          if (inInput) return;
          e.preventDefault();
          navigate("/medicines");
          break;
        case "F4": {
          e.preventDefault();
          // Focus the first visible search-style input on the page.
          const candidate = document.querySelector<HTMLInputElement>(
            'input[type="search"], input[placeholder*="Search" i], input[placeholder*="search" i], input[data-testid*="search" i]',
          );
          candidate?.focus();
          candidate?.select?.();
          break;
        }
        case "F8":
          e.preventDefault();
          window.print();
          break;
        case "F9":
          if (inInput) return;
          e.preventDefault();
          navigate("/reports/sales");
          break;
        default:
          break;
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);
}
