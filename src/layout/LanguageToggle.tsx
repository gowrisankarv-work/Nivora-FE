import { Segmented } from "antd";
import { useTranslation } from "react-i18next";
import { setLanguage } from "@/i18n/i18n";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const { user } = useAuth();

  const onChange = async (value: string | number) => {
    const lang = value as "en" | "ta";
    setLanguage(lang);
    if (user && user.scope === "TENANT") {
      try {
        await api.patch("/users/me/language", { language: lang });
      } catch {
        /* non-fatal */
      }
    }
  };

  return (
    <Segmented
      size="small"
      value={i18n.language}
      onChange={onChange}
      options={[
        { label: "EN", value: "en" },
        { label: "தமிழ்", value: "ta" },
      ]}
    />
  );
}
