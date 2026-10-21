import { useState } from "react";
import { Form, Input, Button, Typography, Alert, Result } from "antd";
import { LockOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, apiErrorCode } from "@/api/client";
import { AuthLayout } from "@/components/AuthLayout";

export default function AcceptInvite() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const tenantCode = params.get("tenantCode") || "";
  const token = params.get("token") || "";

  const onFinish = async (values: { password: string; confirmPassword: string }) => {
    if (values.password !== values.confirmPassword) {
      setError(t("auth.passwordsMustMatch"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post("/auth/accept-invite", { tenantCode, token, password: values.password });
      setDone(true);
    } catch (e) {
      setError(t(`errors.${apiErrorCode(e)}`));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-card">
        {done ? (
          <Result status="success" title={t("auth.accountActivated")}
            extra={<Button type="primary" size="large" onClick={() => navigate("/login")}>{t("auth.login")}</Button>} />
        ) : (
          <>
            <Typography.Title level={2}>{t("auth.acceptInviteTitle")}</Typography.Title>
            <p className="auth-card-sub">{t("app.tagline")}</p>
            {error && <Alert type="error" message={error} style={{ marginBottom: 20 }} showIcon />}
            <Form layout="vertical" onFinish={onFinish} requiredMark={false} size="large">
              <Form.Item name="password" label={t("auth.newPassword")} rules={[{ required: true, min: 10 }]}>
                <Input.Password prefix={<LockOutlined style={{ color: "var(--c-text-faint)" }} />} />
              </Form.Item>
              <Form.Item name="confirmPassword" label={t("auth.confirmPassword")} rules={[{ required: true }]}>
                <Input.Password prefix={<LockOutlined style={{ color: "var(--c-text-faint)" }} />} />
              </Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading} size="large" style={{ marginTop: 8 }}>
                {t("auth.activateAccount")}
              </Button>
            </Form>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
