"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { translations, Language } from "./translations";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (path: string, replacers?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");

  // Load language from localStorage once client side mounts
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("league-map-lang") as Language;
      if (stored === "tr" || stored === "en") {
        setLangState(stored);
      } else {
        setLangState("en");
      }
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("league-map-lang", newLang);
    }
  };

  const t = (path: string, replacers?: Record<string, string | number>): string => {
    const keys = path.split(".");
    let current: any = translations[lang];

    for (const key of keys) {
      if (current && typeof current === "object" && key in current) {
        current = current[key];
      } else {
        // Fallback to English translations first before showing raw path
        let fallback: any = translations["en"];
        let foundFallback = true;
        for (const fKey of keys) {
          if (fallback && typeof fallback === "object" && fKey in fallback) {
            fallback = fallback[fKey];
          } else {
            foundFallback = false;
            break;
          }
        }
        if (foundFallback && typeof fallback === "string") {
          current = fallback;
        } else {
          return path;
        }
        break;
      }
    }

    if (typeof current !== "string") {
      return path;
    }

    let text = current;
    if (replacers) {
      for (const [key, value] of Object.entries(replacers)) {
        text = text.replace(new RegExp(`{${key}}`, "g"), String(value));
      }
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
}
