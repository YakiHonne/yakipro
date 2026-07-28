import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const DARK_THEMES = ["dark", "gray", "dark-gray"];

/**
 * next-themes only knows the real theme after hydration, so `resolvedTheme` is
 * `undefined` on the first client render. Components that branched on it were
 * defaulting to a hardcoded guess ("light"), which is wrong half the time and
 * produced the mismatched first paint: some pieces rendered light while the
 * `data-theme` attribute (set by the blocking script in _document) already said
 * dark, or vice-versa.
 *
 * Reading `data-theme` off the document element instead means we agree with
 * whatever that script already committed to, on the very first render.
 */
const readDocumentTheme = () => {
  if (typeof document === "undefined") return null;
  return document.documentElement.getAttribute("data-theme");
};

export default function useResolvedTheme() {
  const { theme, setTheme, resolvedTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const current = mounted
    ? resolvedTheme || readDocumentTheme()
    : readDocumentTheme();

  const isDark = DARK_THEMES.includes(current);

  return {
    theme,
    setTheme,
    systemTheme,
    // Never `undefined` once the document script has run, so consumers can branch
    // on it without inventing their own fallback.
    resolvedTheme: current || "dark",
    isDark,
    isLight: !!current && !isDark,
    mounted,
  };
}
