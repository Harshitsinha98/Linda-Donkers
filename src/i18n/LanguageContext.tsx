import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { content, type Content, type Lang } from "./content";

type Ctx = { lang: Lang; t: Content; setLang: (l: Lang) => void };

const LanguageContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "ld-lang";

function initialLang(): Lang {
  if (typeof window === "undefined") return "nl";
  const fromUrl = new URLSearchParams(window.location.search).get("lang");
  if (fromUrl === "en" || fromUrl === "nl") return fromUrl;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "nl") return stored;
  return "nl"; // Dutch is the default for everyone.
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "nl" ? "nl-BE" : "en";
  }, [lang]);

  const value = useMemo(() => ({ lang, t: content[lang], setLang }), [lang, setLang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used inside LanguageProvider");
  return ctx;
}
