import { Card, Tabs, Form, Input, Select, InputNumber, TimePicker, Switch, Button, message, Space, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { api, apiErrorCode } from "@/api/client";
import type { SettingsDocument } from "@/api/types";
import { PenaltyConfigForm } from "@/components/PenaltyConfigForm";

export default function SettingsPage() {
  const { t } = useTranslation();
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t("settings.title")}</h1>
          <p>{t("app.tagline")}</p>
        </div>
      </div>
      <Card>
        <Tabs
          items={[
            { key: "general", label: t("settings.general"), children: <GeneralTab /> },
            // Tenant-wide loan/penalty defaults tab disabled - { key: "defaults", label: t("settings.defaults"), children: <DefaultsTab /> },
            { key: "reminders", label: t("settings.reminders"), children: <RemindersTab /> },
          ]}
        />
      </Card>
    </div>
  );
}

function useSettings() {
  return useQuery({ queryKey: ["settings"], queryFn: async () => (await api.get<SettingsDocument>("/settings/general")).data });
}

function GeneralTab() {
  const { t } = useTranslation();
  const { data } = useSettings();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (v: Record<string, unknown>) => api.put("/settings/general", v),
    onSuccess: () => { message.success(t("common.save")); queryClient.invalidateQueries({ queryKey: ["settings"] }); },
    onError: (e) => message.error(t(`errors.${apiErrorCode(e)}`)),
  });

  const fyMutation = useMutation({
    mutationFn: async (v: Record<string, unknown>) => api.put("/settings/financial-year", v),
    onSuccess: () => { message.success(t("common.save")); queryClient.invalidateQueries({ queryKey: ["settings"] }); },
    onError: (e) => message.error(t(`errors.${apiErrorCode(e)}`)),
  });

  if (!data) return null;

  return (
    <>
      <Form layout="vertical" initialValues={data} onFinish={(v) => mutation.mutate(v)}>
        <Form.Item name="businessName" label={t("settings.businessName")} rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="defaultLanguage" label={t("settings.defaultLanguage")}>
          <Select options={[{ value: "en", label: t("common.english") }, { value: "ta", label: t("common.tamil") }]} />
        </Form.Item>
        <Form.Item name="skipSundayDefault" label={t("loans.skipSunday")} valuePropName="checked"><Switch /></Form.Item>
        <Button type="primary" htmlType="submit" loading={mutation.isPending}>{t("common.save")}</Button>
      </Form>
      <Typography.Title level={5} style={{ marginTop: 24 }}>{t("settings.financialYear")}</Typography.Title>
      <Form layout="inline" initialValues={data.financialYear} onFinish={(v) => fyMutation.mutate(v)}>
        <Form.Item name="startMonth" label={t("settings.startMonth")}><InputNumber min={1} max={12} /></Form.Item>
        <Form.Item name="startDay" label={t("settings.startDay")}><InputNumber min={1} max={31} /></Form.Item>
        <Button htmlType="submit" loading={fyMutation.isPending}>{t("common.save")}</Button>
      </Form>
    </>
  );
}

function DefaultsTab() {
  const { t } = useTranslation();
  const { data } = useSettings();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (v: Record<string, unknown>) => api.put("/settings/defaults", v),
    onSuccess: () => { message.success(t("common.save")); queryClient.invalidateQueries({ queryKey: ["settings"] }); },
    onError: (e) => message.error(t(`errors.${apiErrorCode(e)}`)),
  });

  const penaltyMutation = useMutation({
    mutationFn: async (v: unknown) => api.put("/settings/penalty-default", v),
    onSuccess: () => { message.success(t("common.save")); queryClient.invalidateQueries({ queryKey: ["settings"] }); },
    onError: (e) => message.error(t(`errors.${apiErrorCode(e)}`)),
  });

  if (!data) return null;

  return (
    <>
      <Form layout="vertical" initialValues={data.defaults} onFinish={(v) => mutation.mutate(v)}>
        <Form.Item name="method" label={t("loans.method")}>
          <Select allowClear options={["FLAT", "REDUCING_BALANCE", "INTEREST_ONLY", "COMPOUND"].map((m) => ({ value: m, label: m }))} />
        </Form.Item>
        <Form.Item name="ratePercent" label={t("loans.rate")}><InputNumber style={{ width: "100%" }} /></Form.Item>
        <Form.Item name="frequency" label={t("loans.frequency")}>
          <Select allowClear options={["DAILY", "WEEKLY", "MONTHLY"].map((f) => ({ value: f, label: t(`loans.${f.toLowerCase()}`) }))} />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={mutation.isPending}>{t("common.save")}</Button>
      </Form>
      <Typography.Title level={5} style={{ marginTop: 24 }}>{t("settings.penaltyDefault")}</Typography.Title>
      <Form layout="vertical" initialValues={data.defaults.penalty} onFinish={(v) => penaltyMutation.mutate(v)}>
        <Form.Item name="root">
          <PenaltyConfigForm value={data.defaults.penalty} onChange={(v) => penaltyMutation.mutate(v)} />
        </Form.Item>
      </Form>
    </>
  );
}

function RemindersTab() {
  const { t } = useTranslation();
  const { data } = useSettings();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (v: Record<string, unknown>) =>
      api.put("/settings/reminders", { ...v, sendTime: dayjs(v.sendTime as any).format("HH:mm:ss"), recipients: (v.recipients as string)?.split(",").map((s) => s.trim()).filter(Boolean) }),
    onSuccess: () => { message.success(t("common.save")); queryClient.invalidateQueries({ queryKey: ["settings"] }); },
    onError: (e) => message.error(t(`errors.${apiErrorCode(e)}`)),
  });

  const testMutation = useMutation({
    mutationFn: async () => (await api.post("/settings/reminders/test-email", {})).data,
    onSuccess: (res) => message[res.status === "success" ? "success" : "error"](res.status === "success" ? t("settings.testEmailSuccess") : `${t("settings.testEmailFailed")}: ${res.message}`),
  });

  const sendNowMutation = useMutation({
    mutationFn: async () => api.post("/settings/reminders/send-digest-now"),
    onSuccess: () => message.success(t("common.save")),
  });

  if (!data) return null;
  const reminders = data.reminders;

  return (
    <Form
      layout="vertical"
      initialValues={{ ...reminders, sendTime: dayjs(reminders.sendTime, "HH:mm:ss"), recipients: reminders.recipients?.join(", ") }}
      onFinish={(v) => mutation.mutate(v)}
    >
      <Form.Item name="sendTime" label={t("settings.sendTime")}><TimePicker format="HH:mm" /></Form.Item>
      <Form.Item name="emailEnabled" label={t("settings.emailEnabled")} valuePropName="checked"><Switch /></Form.Item>
      <Form.Item name="inAppEnabled" label={t("settings.inAppEnabled")} valuePropName="checked"><Switch /></Form.Item>
      <Form.Item name="includeOverdue" label={t("settings.includeOverdue")} valuePropName="checked"><Switch /></Form.Item>
      <Form.Item name="overdueDays" label={t("settings.overdueDays")}><InputNumber min={1} max={60} /></Form.Item>
      <Form.Item name="recipients" label={t("settings.recipients")}><Input placeholder="a@example.com, b@example.com" /></Form.Item>
      <Form.Item name="digestLanguage" label={t("settings.digestLanguage")}>
        <Select options={[{ value: "USER", label: t("settings.userLanguage") }, { value: "en", label: t("common.english") }, { value: "ta", label: t("common.tamil") }, { value: "both", label: t("settings.both") }]} />
      </Form.Item>
      <Space>
        <Button type="primary" htmlType="submit" loading={mutation.isPending}>{t("common.save")}</Button>
        <Button onClick={() => testMutation.mutate()} loading={testMutation.isPending}>{t("settings.testEmail")}</Button>
        <Button onClick={() => sendNowMutation.mutate()} loading={sendNowMutation.isPending}>{t("settings.sendDigestNow")}</Button>
      </Space>
    </Form>
  );
}
