import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import ta from "./ta.json";

const stored = typeof localStorage !== "undefined" ? localStorage.getItem("language") : null;

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ta: { translation: ta } },
  lng: stored || "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export function setLanguage(lang: "en" | "ta") {
  i18n.changeLanguage(lang);
  localStorage.setItem("language", lang);
  document.documentElement.lang = lang;
}

export default i18n;
