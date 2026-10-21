import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Descriptions, Tabs, Table, Tag, Button, Form, Select, InputNumber, Input, Modal, message, Space, Avatar, Popconfirm } from "antd";
import { ArrowLeftOutlined, PlusOutlined, EditOutlined, FileTextOutlined, DeleteOutlined, PoweroffOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiErrorCode } from "@/api/client";
import type { Customer, Guarantor, Loan, Installment } from "@/api/types";
import { formatInr, formatDate } from "@/utils/format";
import { useAuth } from "@/auth/AuthContext";
import { PenaltyConfigForm } from "@/components/PenaltyConfigForm";
import { CustomerFormDrawer } from "@/components/CustomerFormDrawer";
import { GuarantorFormDrawer } from "@/components/GuarantorFormDrawer";

export default function CustomerDetail() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const { data: customer } = useQuery({
    queryKey: ["customer", id],
    queryFn: async () => (await api.get<Customer>(`/customers/${id}`)).data,
  });

  const { data: loans } = useQuery({
    queryKey: ["loans", "customer", id],
    queryFn: async () => (await api.get<{ content: Loan[] }>("/loans", { params: { size: 100 } })).data.content.filter((l) => l.customerId === id),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: async () => {
      const nextStatus = customer!.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      return api.patch(`/customers/${id}/status`, { status: nextStatus, hasLoans: (loans || []).length > 0 });
    },
    onSuccess: () => {
      message.success(t("common.save"));
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
    },
    onError: (e) => message.error(t(`errors.${apiErrorCode(e)}`)),
  });

  if (!customer) return null;

  const outstanding = (loans || []).reduce((sum, l) => sum + (l.totalPayableAmount - l.paidAmount), 0);

  const loanColumns = [
    { title: t("loans.loanNo"), dataIndex: "loanNo" },
    { title: t("loans.method"), dataIndex: "method", render: (m: string) => t(`loans.${camel(m)}`, m) },
    { title: t("loans.outstanding"), dataIndex: "totalPayableAmount", render: (_: number, l: Loan) => formatInr(l.totalPayableAmount - l.paidAmount) },
    { title: t("common.status"), dataIndex: "status", render: (s: string) => <Tag>{t(`loans.${s.toLowerCase()}`, s)}</Tag> },
  ];

  const formatAddress = (a?: Customer["addressCurrent"]) =>
    a ? [a.line, a.village, a.taluk, a.district, a.pincode].filter(Boolean).join(", ") : "";

  const idProofTypeLabel = (type?: string, otherName?: string) => {
    if (!type) return "";
    if (type === "OTHER") return otherName || t("customers.idProofOther");
    return t(`customers.idProof${type.charAt(0) + type.slice(1).toLowerCase()}`);
  };

  const tabs = [
    {
      key: "profile", label: t("customers.detail"),
      children: (
        <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
          <Descriptions.Item label={t("customers.customerNo")}>{customer.customerNo}</Descriptions.Item>
          <Descriptions.Item label={t("common.name")}>{customer.name}</Descriptions.Item>
          <Descriptions.Item label={t("common.phone")}>{customer.phone}</Descriptions.Item>
          <Descriptions.Item label={t("customers.altPhone")}>{customer.altPhone}</Descriptions.Item>
          <Descriptions.Item label={t("customers.currentAddress")} span={2}>{formatAddress(customer.addressCurrent)}</Descriptions.Item>
          <Descriptions.Item label={t("customers.permanentAddress")} span={2}>{formatAddress(customer.addressPermanent)}</Descriptions.Item>
          <Descriptions.Item label={t("customers.occupation")}>{customer.occupation}</Descriptions.Item>
          <Descriptions.Item label={t("customers.idProofs")} span={2}>
            <Space direction="vertical" size={4}>
              {customer.idProofs.map((p) => (
                <Space key={p.type}>
                  <Tag>{idProofTypeLabel(p.type, p.otherTypeName)}</Tag>
                  <span>{p.number}</span>
                  {p.documentUrl && (
                    <Button type="link" icon={<FileTextOutlined />} href={p.documentUrl} target="_blank" rel="noreferrer" style={{ padding: 0 }}>
                      {t("customers.viewCurrent")}
                    </Button>
                  )}
                </Space>
              ))}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label={t("common.notes")} span={2}>{customer.notes}</Descriptions.Item>
          <Descriptions.Item label={t("customers.outstandingTotal")} span={2}>
            <b>{formatInr(outstanding)}</b>
          </Descriptions.Item>
        </Descriptions>
      ),
    },
    {
      key: "loans", label: t("customers.loans"),
      children: <Table rowKey="id" columns={loanColumns} dataSource={loans} onRow={(l) => ({ onClick: () => navigate(`/loans/${l.id}`) })} pagination={false} />,
    },
    {
      key: "guarantors", label: t("customers.guarantors"),
      children: <GuarantorsTab customerId={id!} />,
    },
  ];

  // Customer-level defaults tab disabled - see Settings page, which also has its Defaults tab disabled.
  // if (user?.role === "ADM") {
  //   tabs.push({
  //     key: "defaults", label: t("customers.defaults"),
  //     children: (
  //       <>
  //         <CustomerDefaultsForm customer={customer} onSaved={() => queryClient.invalidateQueries({ queryKey: ["customer", id] })} />
  //         <ApplyToLoansSection customer={customer} />
  //       </>
  //     ),
  //   });
  // }

  const initials = customer.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div>
      <div className="page-header">
        <Space align="center" size={14}>
          <Button type="text" shape="circle" className="icon-btn" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} />
          <Avatar size={44} src={customer.photoUrl} style={{ background: "var(--c-primary-light)", color: "var(--c-primary-dark)", fontWeight: 700 }}>
            {!customer.photoUrl && initials}
          </Avatar>
          <div>
            <Space align="center">
              <h1 style={{ marginBottom: 0 }}>{customer.name}</h1>
              <Tag color={customer.status === "ACTIVE" ? "success" : "default"}>{t(`common.${customer.status.toLowerCase()}`)}</Tag>
            </Space>
            <p>{customer.customerNo} &middot; {customer.phone}</p>
          </div>
        </Space>
        <Space>
          <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>{t("common.edit")}</Button>
          <Button
            icon={<PoweroffOutlined />}
            loading={statusMutation.isPending}
            onClick={() => statusMutation.mutate()}
          >
            {customer.status === "ACTIVE" ? t("customers.deactivate") : t("customers.activate")}
          </Button>
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => navigate(`/loans/new?customerId=${id}`)}>{t("loans.newLoan")}</Button>
        </Space>
      </div>
      <Card>
        <Tabs items={tabs} />
      </Card>

      <CustomerFormDrawer open={editOpen} onClose={() => setEditOpen(false)} customer={customer} onSaved={() => {}} />
    </div>
  );
}

function GuarantorsTab({ customerId }: { customerId: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Guarantor | undefined>(undefined);

  const { data: guarantors, isLoading } = useQuery({
    queryKey: ["guarantors", customerId],
    queryFn: async () => (await api.get<Guarantor[]>(`/customers/${customerId}/guarantors`)).data,
  });

  const statusMutation = useMutation({
    mutationFn: async (g: Guarantor) =>
      api.patch(`/guarantors/${g.id}/status`, { status: g.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }),
    onSuccess: () => { message.success(t("common.save")); queryClient.invalidateQueries({ queryKey: ["guarantors", customerId] }); },
    onError: (e) => message.error(t(`errors.${apiErrorCode(e)}`)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/guarantors/${id}`),
    onSuccess: () => { message.success(t("common.delete")); queryClient.invalidateQueries({ queryKey: ["guarantors", customerId] }); },
    onError: (e) => message.error(t(`errors.${apiErrorCode(e)}`)),
  });

  const idProofTypeLabel = (type?: string, otherName?: string) => {
    if (!type) return "";
    if (type === "OTHER") return otherName || t("customers.idProofOther");
    return t(`customers.idProof${type.charAt(0) + type.slice(1).toLowerCase()}`);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(undefined); setDrawerOpen(true); }}>
          {t("customers.addGuarantor")}
        </Button>
      </div>
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={guarantors}
        pagination={false}
        locale={{ emptyText: t("customers.noGuarantors") }}
        columns={[
          {
            title: t("common.name"), dataIndex: "name",
            render: (name: string, g: Guarantor) => (
              <Space>
                <Avatar size={32} src={g.photoUrl}>{!g.photoUrl && name[0]}</Avatar>
                <span style={{ fontWeight: 600 }}>{name}</span>
              </Space>
            ),
          },
          { title: t("common.phone"), dataIndex: "phone" },
          {
            title: t("customers.idProofs"), dataIndex: "idProofs",
            render: (entries: Guarantor["idProofs"]) => (
              <Space direction="vertical" size={2}>
                {entries.map((p) => (
                  <Space key={p.type} size={6}>
                    <Tag style={{ margin: 0 }}>{idProofTypeLabel(p.type, p.otherTypeName)}</Tag>
                    {p.documentUrl && (
                      <Button type="link" href={p.documentUrl} target="_blank" rel="noreferrer" style={{ padding: 0 }}>{t("customers.viewCurrent")}</Button>
                    )}
                  </Space>
                ))}
              </Space>
            ),
          },
          { title: t("common.status"), dataIndex: "status", render: (s: string) => <Tag color={s === "ACTIVE" ? "success" : "default"}>{t(`common.${s.toLowerCase()}`)}</Tag> },
          {
            title: "", dataIndex: "actions", width: 140,
            render: (_: unknown, g: Guarantor) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => { setEditing(g); setDrawerOpen(true); }} />
                <Button size="small" icon={<PoweroffOutlined />} loading={statusMutation.isPending} onClick={() => statusMutation.mutate(g)} />
                <Popconfirm
                  title={t("customers.deleteGuarantorConfirm")}
                  okButtonProps={{ danger: true }}
                  onConfirm={() => deleteMutation.mutate(g.id)}
                >
                  <Button size="small" danger icon={<DeleteOutlined />} loading={deleteMutation.isPending} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      <GuarantorFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        customerId={customerId}
        guarantor={editing}
        onSaved={() => {}}
      />
    </div>
  );
}

function CustomerDefaultsForm({ customer, onSaved }: { customer: Customer; onSaved: () => void }) {
  const { t } = useTranslation();
  const [form] = Form.useForm();

  const mutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const { penalty, ...loanDefaultFields } = values as Record<string, unknown> & { penalty?: unknown };
      return api.put(`/customers/${customer.id}/defaults`, {
        loanDefaults: loanDefaultFields,
        penaltyProfile: penalty,
      });
    },
    onSuccess: () => { message.success(t("common.save")); onSaved(); },
    onError: (e) => message.error(t(`errors.${apiErrorCode(e)}`)),
  });

  return (
    <Form form={form} layout="vertical" initialValues={{ ...customer.loanDefaults, penalty: customer.penaltyProfile }} onFinish={(v) => mutation.mutate(v)}>
      <Form.Item name="method" label={t("loans.method")}>
        <Select allowClear options={["FLAT", "REDUCING_BALANCE", "INTEREST_ONLY", "COMPOUND", "CUSTOM_SCHEDULE"].map((m) => ({ value: m, label: t(`loans.${camel(m)}`) }))} />
      </Form.Item>
      <Form.Item name="ratePercent" label={t("loans.rate")}>
        <InputNumber style={{ width: "100%" }} />
      </Form.Item>
      <Form.Item name="frequency" label={t("loans.frequency")}>
        <Select allowClear options={["DAILY", "WEEKLY", "MONTHLY"].map((f) => ({ value: f, label: t(`loans.${f.toLowerCase()}`) }))} />
      </Form.Item>
      <Form.Item label={t("customers.defaultPenalty")} name="penalty">
        <PenaltyConfigForm />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={mutation.isPending}>{t("common.save")}</Button>
    </Form>
  );
}

function ApplyToLoansSection({ customer }: { customer: Customer }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  const affectedQuery = useQuery({
    queryKey: ["customer-affected-loans", customer.id],
    queryFn: async () => (await api.get<Loan[]>(`/customers/${customer.id}/defaults/affected-loans`)).data,
    enabled: open,
  });

  const applyMutation = useMutation({
    mutationFn: async () => api.post(`/customers/${customer.id}/defaults/apply-to-loans`, { reason }),
    onSuccess: () => {
      message.success(t("customers.appliedToLoans"));
      setOpen(false);
      setReason("");
    },
    onError: (e) => message.error(t(`errors.${apiErrorCode(e)}`)),
  });

  const hasPenaltyProfile = !!customer.penaltyProfile && customer.penaltyProfile.type !== "NONE";
  const affectedLoans = affectedQuery.data || [];

  return (
    <>
      <Button disabled={!hasPenaltyProfile} onClick={() => setOpen(true)} style={{ marginTop: 16 }}>
        {t("customers.applyToExistingLoans")}
      </Button>
      <Modal
        title={t("customers.applyToExistingLoans")}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => applyMutation.mutate()}
        okButtonProps={{ loading: applyMutation.isPending, disabled: !reason.trim() || affectedLoans.length === 0 }}
        okText={t("common.confirm")}
      >
        <p>{t("customers.applyToExistingLoansHint")}</p>
        <Table
          rowKey="id"
          size="small"
          loading={affectedQuery.isLoading}
          dataSource={affectedLoans}
          pagination={false}
          locale={{ emptyText: t("customers.noActiveLoans") }}
          style={{ marginBottom: 16 }}
          columns={[
            { title: t("loans.loanNo"), dataIndex: "loanNo" },
            { title: t("loans.outstanding"), dataIndex: "totalPayableAmount", render: (_: number, l: Loan) => formatInr(l.totalPayableAmount - l.paidAmount) },
          ]}
        />
        <Input.TextArea rows={2} placeholder={t("common.reason")} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Modal>
    </>
  );
}

function camel(upperSnake: string) {
  return upperSnake.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
