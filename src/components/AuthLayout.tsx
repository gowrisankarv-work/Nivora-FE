import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircleFilled } from "@ant-design/icons";

export function AuthLayout({ children, topRight }: { children: ReactNode; topRight?: ReactNode }) {
  const { t } = useTranslation();

  const features = [
    t("auth.featureLedger"),
    t("auth.featureReminders"),
    t("auth.featureBilingual"),
  ];

  return (
    <div className="auth-shell">
      <div className="auth-hero desktop-only">
        <div className="auth-hero-brand">
          <span className="auth-hero-mark">
            <img src="/logo-mark.svg" alt="" />
          </span>
          <span className="auth-hero-name">{t("app.name")}</span>
        </div>
        <h1>{t("auth.heroTitle")}</h1>
        <p className="auth-hero-sub">{t("auth.heroSubtitle")}</p>
        <ul className="auth-hero-features">
          {features.map((f) => (
            <li key={f}>
              <CheckCircleFilled /> {f}
            </li>
          ))}
        </ul>
        <div className="auth-hero-glow" />
      </div>
      <div className="auth-panel">
        <div className="auth-panel-top">
          <div className="auth-panel-brand phone-only">
            <span className="auth-hero-mark small">
              <img src="/logo-mark.svg" alt="" />
            </span>
            <span className="auth-hero-name small">{t("app.name")}</span>
          </div>
          {topRight}
        </div>
        <div className="auth-panel-body">{children}</div>
      </div>
    </div>
  );
}
