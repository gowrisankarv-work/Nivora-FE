import { useState } from "react";
import { Table, Button, Drawer, Form, Input, Select, message, Space, Tag, Card, Progress, Avatar, Empty } from "antd";
import { PlusOutlined, UserOutlined, MailOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiErrorCode } from "@/api/client";
import type { User } from "@/api/types";

export default function Users() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: users, isLoading } = useQuery({ queryKey: ["users"], queryFn: async () => (await api.get<User[]>("/users")).data });
  const { data: seats } = useQuery({ queryKey: ["seats"], queryFn: async () => (await api.get<{ used: number; max: number }>("/users/seats")).data });

  const inviteMutation = useMutation({
    mutationFn: async (v: Record<string, unknown>) => api.post("/users", v),
    onSuccess: () => { message.success(t("common.save")); setOpen(false); form.resetFields(); queryClient.invalidateQueries({ queryKey: ["users"] }); queryClient.invalidateQueries({ queryKey: ["seats"] }); },
    onError: (e) => message.error(t(`errors.${apiErrorCode(e)}`)),
  });

  const disableMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/users/${id}/disable`),
    onSuccess: () => { message.success(t("common.save")); queryClient.invalidateQueries({ queryKey: ["users"] }); queryClient.invalidateQueries({ queryKey: ["seats"] }); },
    onError: (e) => message.error(t(`errors.${apiErrorCode(e)}`)),
  });

  const enableMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/users/${id}/enable`),
    onSuccess: () => { message.success(t("common.save")); queryClient.invalidateQueries({ queryKey: ["users"] }); queryClient.invalidateQueries({ queryKey: ["seats"] }); },
    onError: (e) => message.error(t(`errors.${apiErrorCode(e)}`)),
  });

  const resendMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/users/${id}/resend-invite`),
    onSuccess: () => message.success(t("common.save")),
    onError: (e) => message.error(t(`errors.${apiErrorCode(e)}`)),
  });

  const initials = (name: string) => name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  const columns = [
    {
      title: t("common.name"), dataIndex: "name",
      render: (name: string, u: User) => (
        <Space>
          <Avatar size={32} style={{ background: u.role === "ADM" ? "var(--c-primary-light)" : "#f0f2f3", color: u.role === "ADM" ? "var(--c-primary-dark)" : "#475569", fontWeight: 600, fontSize: 12 }}>
            {initials(name)}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>{name}</div>
            <div style={{ fontSize: 12, color: "var(--c-text-faint)" }}>{u.email}</div>
          </div>
        </Space>
      ),
    },
    { title: t("users.role"), dataIndex: "role", render: (r: string) => <Tag color={r === "ADM" ? "gold" : "default"}>{t(`users.${r.toLowerCase()}`)}</Tag> },
    { title: t("common.status"), dataIndex: "status", render: (s: string) => <Tag color={s === "ACTIVE" ? "success" : s === "INVITED" ? "processing" : "default"}>{t(`users.${s === "INVITED" ? "invited" : s.toLowerCase()}`, s)}</Tag> },
    {
      title: t("common.actions"),
      render: (_: unknown, u: User) => (
        <Space>
          {u.status === "INVITED" && <Button size="small" onClick={() => resendMutation.mutate(u.id)}>{t("users.resendInvite")}</Button>}
          {u.status === "DISABLED" ? (
            <Button size="small" onClick={() => enableMutation.mutate(u.id)}>{t("users.enable")}</Button>
          ) : (
            <Button size="small" danger onClick={() => disableMutation.mutate(u.id)}>{t("users.disable")}</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t("users.title")}</h1>
          <p>{seats && t("users.seatUsage", { used: seats.used, max: seats.max })}</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)} size="large" disabled={seats && seats.used >= seats.max}>
          {t("users.inviteUser")}
        </Button>
      </div>

      {seats && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Progress
              type="circle"
              size={56}
              percent={Math.round((seats.used / seats.max) * 100)}
              strokeColor={seats.used >= seats.max ? "var(--c-danger)" : "var(--c-primary)"}
              format={() => `${seats.used}/${seats.max}`}
            />
            <div>
              <div style={{ fontWeight: 600 }}>{t("users.seatUsage", { used: seats.used, max: seats.max })}</div>
              <div style={{ fontSize: 13, color: "var(--c-text-secondary)" }}>{t("users.seatLimitReached")}</div>
            </div>
          </div>
        </Card>
      )}

      <Card styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={users}
          loading={isLoading}
          pagination={{ style: { paddingInline: 20 } }}
          locale={{ emptyText: <Empty description={t("common.noData")} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 32 }} /> }}
        />
      </Card>

      <Drawer title={t("users.inviteUser")} open={open} onClose={() => setOpen(false)}>
        <Form form={form} layout="vertical" initialValues={{ role: "STAFF", language: "en" }} onFinish={(v) => inviteMutation.mutate(v)}>
          <Form.Item name="name" label={t("common.name")} rules={[{ required: true }]}><Input prefix={<UserOutlined style={{ color: "var(--c-text-faint)" }} />} /></Form.Item>
          <Form.Item name="email" label={t("common.email")} rules={[{ required: true, type: "email" }]}><Input prefix={<MailOutlined style={{ color: "var(--c-text-faint)" }} />} /></Form.Item>
          <Form.Item name="phone" label={t("common.phone")}><Input /></Form.Item>
          <Form.Item name="role" label={t("users.role")}>
            <Select options={[{ value: "ADM", label: t("users.adm") }, { value: "STAFF", label: t("users.staff") }]} />
          </Form.Item>
          <Form.Item name="language" label={t("common.language")}>
            <Select options={[{ value: "en", label: t("common.english") }, { value: "ta", label: t("common.tamil") }]} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={inviteMutation.isPending} size="large">{t("common.save")}</Button>
        </Form>
      </Drawer>
    </div>
  );
}
