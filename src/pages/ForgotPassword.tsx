import { useState } from "react";
import { Form, Input, Button, Typography, Result } from "antd";
import { MailOutlined, ShopOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { api } from "@/api/client";
import { AuthLayout } from "@/components/AuthLayout";

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const onFinish = async (values: { tenantCode: string; email: string }) => {
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", values);
    } finally {
      setLoading(false);
      setDone(true);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-card">
        {done ? (
          <Result status="success" title={t("auth.sendResetLink")}
            extra={<Link to="/login"><Button type="primary" size="large">{t("auth.login")}</Button></Link>} />
        ) : (
          <>
            <Typography.Title level={2}>{t("auth.forgotPasswordTitle")}</Typography.Title>
            <p className="auth-card-sub">{t("app.tagline")}</p>
            <Form layout="vertical" onFinish={onFinish} requiredMark={false} size="large">
              <Form.Item name="tenantCode" label={t("auth.tenantCode")} rules={[{ required: true }]}>
                <Input prefix={<ShopOutlined style={{ color: "var(--c-text-faint)" }} />} />
              </Form.Item>
              <Form.Item name="email" label={t("common.email")} rules={[{ required: true, type: "email" }]}>
                <Input prefix={<MailOutlined style={{ color: "var(--c-text-faint)" }} />} />
              </Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading} size="large" style={{ marginTop: 8 }}>
                {t("auth.sendResetLink")}
              </Button>
            </Form>
            <div className="auth-footer-link">
              <Link to="/login">{t("common.back")}</Link>
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
