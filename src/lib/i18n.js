import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

import { supportedLanguageKeys } from "@/Content/SupportedLanguages";

if (!i18n.isInitialized) {
  i18n
    .use(HttpBackend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      fallbackLng: "en",
      supportedLngs: supportedLanguageKeys,
      ns: ["common"],
      defaultNS: "common",
      debug: process.env.NODE_ENV === "development",
      backend: {
        loadPath: "/locales/{{lng}}/{{ns}}.json",
      },
      detection: {
        order: ["cookie", "localStorage", "navigator"],
        caches: ["cookie"],
      },
      react: {
        useSuspense: false,
      },
    });
}

// Arabic is a supported app language, so document direction must follow the
// active language — on first load as well as on every change.
const RTL_LANGUAGES = ["ar", "he", "fa", "ur"];

const applyDirection = (lang) => {
  if (typeof document === "undefined") return;
  document.documentElement.dir = RTL_LANGUAGES.includes(lang) ? "rtl" : "ltr";
};

if (typeof window !== "undefined") {
  applyDirection(i18n.resolvedLanguage || i18n.language);
  i18n.on("languageChanged", applyDirection);
}

export default i18n;
