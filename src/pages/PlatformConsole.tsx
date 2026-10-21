import { useState } from "react";
import { Table, Button, Drawer, Form, Input, InputNumber, message, Space, Tag, Card, Row, Col, Progress, Modal, Avatar } from "antd";
import { PlusOutlined, LogoutOutlined, DatabaseOutlined, TeamOutlined, ShopOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiErrorCode } from "@/api/client";
import type { CapacitySummary, TenantSummary } from "@/api/types";
import { useAuth } from "@/auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { LanguageToggle } from "@/layout/LanguageToggle";

export default function PlatformConsole() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [limitsTenant, setLimitsTenant] = useState<TenantSummary | null>(null);

  const { data: tenants, isLoading } = useQuery({ queryKey: ["tenants"], queryFn: async () => (await api.get<TenantSummary[]>("/platform/tenants")).data });
  const { data: capacity } = useQuery({ queryKey: ["capacity"], queryFn: async () => (await api.get<CapacitySummary>("/platform/capacity")).data });

  const createMutation = useMutation({
    mutationFn: async (v: Record<string, unknown>) => api.post("/platform/tenants", v),
    onSuccess: () => { message.success(t("common.save")); setOnboardOpen(false); queryClient.invalidateQueries({ queryKey: ["tenants"] }); },
    onError: (e) => message.error(t(`errors.${apiErrorCode(e)}`)),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ code, status }: { code: string; status: string }) => api.patch(`/platform/tenants/${code}/status`, { status }),
    onSuccess: () => { message.success(t("common.save")); queryClient.invalidateQueries({ queryKey: ["tenants"] }); },
    onError: (e) => message.error(t(`errors.${apiErrorCode(e)}`)),
  });

  const resendMutation = useMutation({
    mutationFn: async (code: string) => api.post(`/platform/tenants/${code}/resend-invite`),
    onSuccess: () => message.success(t("common.save")),
    onError: (e) => message.error(t(`errors.${apiErrorCode(e)}`)),
  });

  const limitsMutation = useMutation({
    mutationFn: async (v: { maxUsers?: number; maxCustomers?: number }) => api.patch(`/platform/tenants/${limitsTenant!.code}/limits`, v),
    onSuccess: () => { message.success(t("common.save")); setLimitsTenant(null); queryClient.invalidateQueries({ queryKey: ["tenants"] }); },
    onError: (e) => message.error(t(`errors.${apiErrorCode(e)}`)),
  });

  const columns = [
    {
      title: t("platform.tenantName"), dataIndex: "name",
      render: (name: string, r: TenantSummary) => (
        <Space>
          <Avatar size={32} style={{ background: "var(--c-primary-light)", color: "var(--c-primary-dark)" }} icon={<ShopOutlined />} />
          <div>
            <div style={{ fontWeight: 600 }}>{name}</div>
            <div style={{ fontSize: 12, color: "var(--c-text-faint)" }}>{r.code}</div>
          </div>
        </Space>
      ),
    },
    { title: t("platform.adminEmail"), dataIndex: "adminEmail" },
    { title: t("platform.seatUsage"), render: (_: unknown, r: TenantSummary) => `${r.seatsUsed} / ${r.maxUsers}` },
    { title: t("platform.customerUsage"), render: (_: unknown, r: TenantSummary) => `${r.customersUsed} / ${r.maxCustomers}` },
    { title: t("platform.activeLoans"), dataIndex: "activeLoans" },
    { title: t("common.status"), dataIndex: "status", render: (s: string) => <Tag color={s === "ACTIVE" ? "success" : "error"}>{s}</Tag> },
    {
      title: t("common.actions"),
      render: (_: unknown, r: TenantSummary) => (
        <Space>
          <Button size="small" onClick={() => setLimitsTenant(r)}>{t("platform.editLimits")}</Button>
          <Button size="small" onClick={() => resendMutation.mutate(r.code)}>{t("platform.resendInvite")}</Button>
          {r.status === "ACTIVE" ? (
            <Button size="small" danger onClick={() => statusMutation.mutate({ code: r.code, status: "SUSPENDED" })}>{t("platform.suspend")}</Button>
          ) : (
            <Button size="small" onClick={() => statusMutation.mutate({ code: r.code, status: "ACTIVE" })}>{t("platform.reactivate")}</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--c-bg)" }}>
      <div className="app-header" style={{ position: "sticky", top: 0, zIndex: 50 }}>
        <Space>
          <span className="sider-brand-mark"><img src="/logo-mark.svg" alt="" /></span>
          <span style={{ fontWeight: 700, fontSize: 16 }}>{t("platform.title")}</span>
        </Space>
        <Space size={16}>
          <LanguageToggle />
          <Button icon={<LogoutOutlined />} onClick={() => logout().then(() => navigate("/platform/login"))}>{t("common.logout")}</Button>
        </Space>
      </div>

      <div className="app-content">
        <div className="page-header">
          <div>
            <h1>{t("platform.tenants")}</h1>
            <p>{tenants ? `${tenants.length} ${t("platform.tenants").toLowerCase()}` : ""}</p>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOnboardOpen(true)} size="large">{t("platform.onboardTenant")}</Button>
        </div>

        {capacity && (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col xs={24} md={8}>
              <div className="stat-card" style={{ cursor: "default" }}>
                <div className="stat-icon" style={{ background: "var(--c-info-bg)", color: "var(--c-info)" }}><DatabaseOutlined /></div>
                <div className="stat-label">{t("platform.storageUsed")}</div>
                <div className="stat-value">{capacity.storageUsedMb} <span style={{ fontSize: 14, fontWeight: 500, color: "var(--c-text-faint)" }}>/ 512 MB</span></div>
                <Progress
                  percent={Math.min(100, Math.round((capacity.storageUsedMb / 512) * 100))}
                  showInfo={false}
                  strokeColor={capacity.thresholdStatus === "RED" ? "var(--c-danger)" : capacity.thresholdStatus === "AMBER" ? "var(--c-warning)" : "var(--c-primary)"}
                  style={{ marginTop: 10 }}
                />
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div className="stat-card" style={{ cursor: "default" }}>
                <div className="stat-icon" style={{ background: "var(--c-primary-light)", color: "var(--c-primary-dark)" }}><TeamOutlined /></div>
                <div className="stat-label">{t("platform.totalQuota")}</div>
                <div className="stat-value">{capacity.totalAllocatedQuota}</div>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div className="stat-card" style={{ cursor: "default" }}>
                <div className="stat-icon" style={{ background: "#f0f2f3", color: "#475569" }}><ShopOutlined /></div>
                <div className="stat-label">{t("platform.totalCustomers")}</div>
                <div className="stat-value">{capacity.totalActualCustomers}</div>
              </div>
            </Col>
          </Row>
        )}

        <Card styles={{ body: { padding: 0 } }}>
          <Table rowKey="code" columns={columns} dataSource={tenants} loading={isLoading} scroll={{ x: true }} pagination={{ style: { paddingInline: 20 } }} />
        </Card>
      </div>

      <Drawer title={t("platform.onboardTenant")} open={onboardOpen} onClose={() => setOnboardOpen(false)}>
        <Form layout="vertical" initialValues={{ maxCustomers: 500 }} onFinish={(v) => createMutation.mutate(v)}>
          <Form.Item name="name" label={t("platform.tenantName")} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="code" label={t("platform.tenantCode")} rules={[{ required: true, pattern: /^[a-z0-9-]{3,20}$/, message: "lowercase, digits, hyphens, 3-20 chars" }]}><Input /></Form.Item>
          <Form.Item name="adminName" label={t("platform.adminName")} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="adminEmail" label={t("platform.adminEmail")} rules={[{ required: true, type: "email" }]}><Input /></Form.Item>
          <Form.Item name="maxCustomers" label={t("platform.maxCustomers")} rules={[{ required: true }]}><InputNumber style={{ width: "100%" }} min={1} /></Form.Item>
          <Button type="primary" htmlType="submit" block loading={createMutation.isPending} size="large">{t("common.save")}</Button>
        </Form>
      </Drawer>

      <Modal title={t("platform.editLimits")} open={!!limitsTenant} onCancel={() => setLimitsTenant(null)} footer={null}>
        <Form layout="vertical" initialValues={limitsTenant || {}} onFinish={(v) => limitsMutation.mutate(v)}>
          <Form.Item name="maxUsers" label={t("platform.maxUsers")}><InputNumber style={{ width: "100%" }} min={1} /></Form.Item>
          <Form.Item name="maxCustomers" label={t("platform.maxCustomers")}><InputNumber style={{ width: "100%" }} min={1} /></Form.Item>
          <Button type="primary" htmlType="submit" block loading={limitsMutation.isPending} size="large">{t("common.save")}</Button>
        </Form>
      </Modal>
    </div>
  );
}
