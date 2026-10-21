import { useState } from "react";
import { Form, Input, Button, Typography, Alert } from "antd";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { apiErrorCode } from "@/api/client";
import { AuthLayout } from "@/components/AuthLayout";

export default function PlatformLogin() {
  const { t } = useTranslation();
  const { loginPlatform } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      await loginPlatform(values.email, values.password);
      navigate("/platform");
    } catch (e) {
      setError(t(`errors.${apiErrorCode(e)}`, t("auth.invalidCredentials")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-card">
        <Typography.Title level={2}>{t("auth.platformLoginTitle")}</Typography.Title>
        <p className="auth-card-sub">{t("platform.title")}</p>
        {error && <Alert type="error" message={error} style={{ marginBottom: 20 }} showIcon />}
        <Form layout="vertical" onFinish={onFinish} requiredMark={false} size="large">
          <Form.Item name="email" label={t("common.email")} rules={[{ required: true, type: "email" }]}>
            <Input prefix={<MailOutlined style={{ color: "var(--c-text-faint)" }} />} />
          </Form.Item>
          <Form.Item name="password" label={t("auth.password")} rules={[{ required: true }]}>
            <Input.Password prefix={<LockOutlined style={{ color: "var(--c-text-faint)" }} />} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading} size="large" style={{ marginTop: 8 }}>
            {t("auth.login")}
          </Button>
        </Form>
        <div className="auth-footer-link">
          <Link to="/login">{t("auth.tenantLogin")}</Link>
        </div>
      </div>
    </AuthLayout>
  );
}
