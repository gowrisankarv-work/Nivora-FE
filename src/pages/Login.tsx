import { useState } from "react";
import { Form, Input, Button, Typography, Alert } from "antd";
import { LockOutlined, MailOutlined, ShopOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { apiErrorCode } from "@/api/client";
import { LanguageToggle } from "@/layout/LanguageToggle";
import { AuthLayout } from "@/components/AuthLayout";

export default function Login() {
  const { t } = useTranslation();
  const { loginTenant } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { tenantCode: string; email: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      await loginTenant(values.tenantCode, values.email, values.password);
      navigate("/");
    } catch (e) {
      setError(t(`errors.${apiErrorCode(e)}`, t("auth.invalidCredentials")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout topRight={<LanguageToggle />}>
      <div className="auth-card">
        <Typography.Title level={2}>{t("auth.loginTitle")}</Typography.Title>
        <p className="auth-card-sub">{t("auth.heroSubtitle")}</p>
        {error && <Alert type="error" message={error} style={{ marginBottom: 20 }} showIcon />}
        <Form layout="vertical" onFinish={onFinish} requiredMark={false} size="large">
          <Form.Item name="tenantCode" label={t("auth.tenantCode")} rules={[{ required: true, message: t("common.required") }]}>
            <Input prefix={<ShopOutlined style={{ color: "var(--c-text-faint)" }} />} autoCapitalize="off" placeholder="e.g. acme-finance" />
          </Form.Item>
          <Form.Item name="email" label={t("common.email")} rules={[{ required: true, type: "email", message: t("common.required") }]}>
            <Input prefix={<MailOutlined style={{ color: "var(--c-text-faint)" }} />} placeholder="you@business.com" />
          </Form.Item>
          <Form.Item name="password" label={t("auth.password")} rules={[{ required: true, message: t("common.required") }]}>
            <Input.Password prefix={<LockOutlined style={{ color: "var(--c-text-faint)" }} />} placeholder="••••••••" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading} size="large" style={{ marginTop: 8 }}>
            {t("auth.login")}
          </Button>
        </Form>
        <div className="auth-footer-link">
          <Link to="/forgot-password">{t("auth.forgotPassword")}</Link>
          <Link to="/platform/login">{t("auth.platformConsole")}</Link>
        </div>
      </div>
    </AuthLayout>
  );
}
