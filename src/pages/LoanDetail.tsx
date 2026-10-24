import { useParams, useNavigate } from "react-router-dom";
import { Card, Descriptions, Table, Tag, Button, Space, Modal, Form, Input, message, Tabs, Avatar, Empty } from "antd";
import { ArrowLeftOutlined, FileTextOutlined, EyeOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, apiErrorCode } from "@/api/client";
import type { Installment, Loan, Customer, Guarantor } from "@/api/types";
import { formatInr } from "@/utils/format";
import { useAuth } from "@/auth/AuthContext";
import { PENALTY_TYPE_LABEL_KEY } from "@/components/PenaltyConfigForm";

function camel(upperSnake: string) {
  return upperSnake.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function penaltySourceLabel(source: string | undefined, t: (k: string) => string) {
  if (source === "CUSTOMER") return t("loans.fromCustomer");
  if (source === "TENANT") return t("loans.fromTenant");
  if (source === "LOAN") return t("penalty.sourceLoan");
  return source || "";
}

export default function LoanDetail() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);

  const { data: loan } = useQuery({
    queryKey: ["loan", id],
    queryFn: async () => (await api.get<Loan>(`/loans/${id}`)).data,
  });

  const { data: schedule } = useQuery({
    queryKey: ["loan-schedule", id],
    queryFn: async () => (await api.get<Installment[]>(`/loans/${id}/schedule`)).data,
  });

  const { data: customer } = useQuery({
    queryKey: ["customer", loan?.customerId],
    queryFn: async () => (await api.get<Customer>(`/customers/${loan!.customerId}`)).data,
    enabled: !!loan?.customerId,
  });

  const { data: guarantors } = useQuery({
    queryKey: ["guarantors", loan?.customerId],
    queryFn: async () => (await api.get<Guarantor[]>(`/customers/${loan!.customerId}/guarantors`)).data,
    enabled: !!loan?.customerId,
  });

  const cancelMutation = useMutation({
    mutationFn: async (reason: string) => api.post(`/loans/${id}/cancel`, { reason }),
    onSuccess: () => {
      message.success(t("common.save"));
      setCancelOpen(false);
      queryClient.invalidateQueries({ queryKey: ["loan", id] });
    },
    onError: (e) => message.error(t(`errors.${apiErrorCode(e)}`)),
  });

  if (!loan) return null;

  const statusColor: Record<string, string> = { ACTIVE: "success", CLOSED: "blue", CANCELLED: "default" };
  const dueStatusColor: Record<string, string> = { PAID: "success", UPCOMING: "processing", DUE_TODAY: "warning", PARTIALLY_PAID: "warning", OVERDUE: "error" };

  const columns = [
    { title: "#", dataIndex: "seq" },
    { title: t("loans.dueDate"), dataIndex: "dueDate" },
    { title: t("dues.instalmentDue"), render: (_: unknown, i: Installment) => formatInr(i.amountDue - i.amountPaid) },
    { title: t("dues.penaltyDue"), render: (_: unknown, i: Installment) => formatInr(i.penaltyAccrued - i.penaltyPaid - i.penaltyWaived) },
    { title: t("common.status"), dataIndex: "status", render: (s: string) => <Tag color={dueStatusColor[s] || "default"}>{t(`dues.${s.toLowerCase()}`, s)}</Tag> },
  ];

  const formatAddress = (a?: Customer["addressCurrent"]) =>
    a ? [a.line, a.village, a.taluk, a.district, a.pincode].filter(Boolean).join(", ") : "";

  const idProofTypeLabel = (type?: string, otherName?: string) => {
    if (!type) return "";
    if (type === "OTHER") return otherName || t("customers.idProofOther");
    return t(`customers.idProof${type.charAt(0) + type.slice(1).toLowerCase()}`);
  };

  const guarantorColumns = [
    {
      title: t("common.name"),
      dataIndex: "name",
      render: (name: string, g: Guarantor) => (
        <Space>
          <Avatar size={32} src={g.photoUrl}>{!g.photoUrl && name[0]}</Avatar>
          <span style={{ fontWeight: 600 }}>{name}</span>
        </Space>
      ),
    },
    { title: t("common.phone"), dataIndex: "phone" },
    {
      title: t("customers.currentAddress"),
      dataIndex: "addressCurrent",
      render: (a?: Guarantor["addressCurrent"]) => formatAddress(a) || "—",
    },
    {
      title: t("customers.idProofs"),
      dataIndex: "idProofs",
      render: (entries: Guarantor["idProofs"]) => (
        <Space direction="vertical" size={2}>
          {(entries || []).map((p) => (
            <Space key={p.type} size={6}>
              <Tag style={{ margin: 0 }}>{idProofTypeLabel(p.type, p.otherTypeName)}</Tag>
              <span>{p.number}</span>
              {p.documentUrl && (
                <Button type="link" href={p.documentUrl} target="_blank" rel="noreferrer" style={{ padding: 0 }}>
                  {t("customers.viewCurrent")}
                </Button>
              )}
            </Space>
          ))}
        </Space>
      ),
    },
    {
      title: t("common.status"),
      dataIndex: "status",
      render: (s: string) => <Tag color={s === "ACTIVE" ? "success" : "default"}>{t(`common.${s.toLowerCase()}`)}</Tag>,
    },
  ];

  const customerName = customer?.name || loan.customerName;
  const customerNo = customer?.customerNo || loan.customerNo;

  const tabs = [
    {
      key: "schedule",
      label: t("loans.schedule"),
      children: (
        <div>
          <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label={t("dues.customer")}>
              {loan.customerId ? (
                <a onClick={() => navigate(`/customers/${loan.customerId}`)} style={{ fontWeight: 600 }}>
                  {customerName || "—"} {customerNo ? `(${customerNo})` : ""}
                </a>
              ) : "—"}
            </Descriptions.Item>
            <Descriptions.Item label={t("common.phone")}>
              {customer?.phone || loan.customerPhone || "—"}
            </Descriptions.Item>
            <Descriptions.Item label={t("loans.method")}>{t(`loans.${camel(loan.method)}`, loan.method)}</Descriptions.Item>
            <Descriptions.Item label={t("common.status")}>
              <Tag color={statusColor[loan.status] || "default"}>{t(`loans.${loan.status.toLowerCase()}`, loan.status)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t("loans.principal")}>{formatInr(loan.principalAmount)}</Descriptions.Item>
            <Descriptions.Item label={t("loans.totalPayable")}>{formatInr(loan.totalPayableAmount)}</Descriptions.Item>
            <Descriptions.Item label={t("loans.instalmentAmount")}>{formatInr(loan.instalmentAmount)}</Descriptions.Item>
            <Descriptions.Item label={t("loans.outstanding")}>{formatInr(loan.totalPayableAmount - loan.paidAmount)}</Descriptions.Item>
            <Descriptions.Item label={t("loans.penaltyOverride")} span={2}>
              {loan.penalty && loan.penalty.type !== "NONE"
                ? `${t(`penalty.${PENALTY_TYPE_LABEL_KEY[loan.penalty.type]}`)} (${penaltySourceLabel(loan.penalty.source, t)})`
                : t("common.no")}
            </Descriptions.Item>
          </Descriptions>
          <Table
            style={{ marginTop: 16 }}
            rowKey="id"
            columns={columns}
            dataSource={schedule}
            pagination={{ pageSize: 20 }}
            scroll={{ x: true }}
          />
        </div>
      ),
    },
    {
      key: "customer",
      label: t("customers.detail"),
      children: customer ? (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
            <Space align="center" size={12}>
              <Avatar
                size={44}
                src={customer.photoUrl}
                style={{ background: "var(--c-primary-light)", color: "var(--c-primary-dark)", fontWeight: 700 }}
              >
                {!customer.photoUrl && customer.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
              </Avatar>
              <div>
                <h3 style={{ margin: 0 }}>{customer.name}</h3>
                <span style={{ color: "var(--c-text-faint)", fontSize: 13 }}>{customer.customerNo} &middot; {customer.phone}</span>
              </div>
            </Space>
            <Button type="primary" ghost icon={<EyeOutlined />} onClick={() => navigate(`/customers/${customer.id}`)}>
              {t("customers.detail")}
            </Button>
          </div>
          <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
            <Descriptions.Item label={t("customers.customerNo")}>{customer.customerNo}</Descriptions.Item>
            <Descriptions.Item label={t("common.name")}>{customer.name}</Descriptions.Item>
            <Descriptions.Item label={t("common.phone")}>{customer.phone}</Descriptions.Item>
            <Descriptions.Item label={t("customers.altPhone")}>{customer.altPhone || "—"}</Descriptions.Item>
            <Descriptions.Item label={t("customers.currentAddress")} span={2}>{formatAddress(customer.addressCurrent) || "—"}</Descriptions.Item>
            <Descriptions.Item label={t("customers.permanentAddress")} span={2}>{formatAddress(customer.addressPermanent) || "—"}</Descriptions.Item>
            <Descriptions.Item label={t("customers.occupation")}>{customer.occupation || "—"}</Descriptions.Item>
            <Descriptions.Item label={t("common.status")}>
              <Tag color={customer.status === "ACTIVE" ? "success" : "default"}>{t(`common.${customer.status.toLowerCase()}`)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t("customers.idProofs")} span={2}>
              <Space direction="vertical" size={4}>
                {(customer.idProofs || []).map((p) => (
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
            {customer.notes && <Descriptions.Item label={t("common.notes")} span={2}>{customer.notes}</Descriptions.Item>}
          </Descriptions>
        </div>
      ) : (
        <Empty description={t("common.loading")} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ),
    },
    {
      key: "guarantors",
      label: `${t("customers.guarantors")}${guarantors ? ` (${guarantors.length})` : ""}`,
      children: (
        <Table
          rowKey="id"
          columns={guarantorColumns}
          dataSource={guarantors}
          pagination={false}
          locale={{ emptyText: <Empty description={t("customers.noGuarantors")} image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <Space align="center" size={14}>
          <Button type="text" shape="circle" className="icon-btn" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} />
          <div>
            <h1 style={{ marginBottom: 0 }}>{loan.loanNo}</h1>
            <p>
              {t(`loans.${camel(loan.method)}`, loan.method)}
              {customerName && (
                <>
                  {" "}&middot;{" "}
                  <a onClick={() => navigate(`/customers/${loan.customerId}`)} style={{ fontWeight: 600 }}>
                    {customerName} ({customerNo})
                  </a>
                </>
              )}
            </p>
          </div>
        </Space>
        {user?.role === "ADM" && loan.status === "ACTIVE" && (
          <Button danger onClick={() => setCancelOpen(true)} size="large">{t("loans.cancel")}</Button>
        )}
      </div>

      <Card>
        <Tabs items={tabs} />
      </Card>

      <Modal title={t("loans.cancel")} open={cancelOpen} onCancel={() => setCancelOpen(false)} footer={null}>
        <Form layout="vertical" onFinish={(v) => cancelMutation.mutate(v.reason)}>
          <Form.Item name="reason" label={t("loans.cancelReason")} rules={[{ required: true }]}><Input.TextArea /></Form.Item>
          <Button type="primary" danger htmlType="submit" loading={cancelMutation.isPending}>{t("common.confirm")}</Button>
        </Form>
      </Modal>
    </div>
  );
}
