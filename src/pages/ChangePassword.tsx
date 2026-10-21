import { useState } from "react";
import { Form, Input, Button, Card, Typography, Alert, message } from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { api, apiErrorCode } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";

export default function ChangePassword() {
  const { t } = useTranslation();
  const { user, setMustChangePassword } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    if (values.newPassword !== values.confirmPassword) {
      setError(t("auth.passwordsMustMatch"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const path = user?.scope === "PLATFORM" ? "/platform/auth/change-password" : "/auth/change-password";
      await api.post(path, { currentPassword: values.currentPassword, newPassword: values.newPassword });
      message.success(t("common.save"));
      setMustChangePassword(false);
      navigate("/");
    } catch (e) {
      setError(t(`errors.${apiErrorCode(e)}`));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={{ maxWidth: 480 }}>
      <Typography.Title level={4}>{t("auth.changePasswordTitle")}</Typography.Title>
      {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} showIcon />}
      <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
        <Form.Item name="currentPassword" label={t("auth.currentPassword")} rules={[{ required: true }]}>
          <Input.Password />
        </Form.Item>
        <Form.Item name="newPassword" label={t("auth.newPassword")} rules={[{ required: true, min: 10 }]}>
          <Input.Password />
        </Form.Item>
        <Form.Item name="confirmPassword" label={t("auth.confirmPassword")} rules={[{ required: true }]}>
          <Input.Password />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>{t("common.save")}</Button>
      </Form>
    </Card>
  );
}
