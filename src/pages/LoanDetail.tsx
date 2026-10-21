import { useParams, useNavigate } from "react-router-dom";
import { Card, Descriptions, Table, Tag, Button, Space, Modal, Form, Input, message } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, apiErrorCode } from "@/api/client";
import type { Installment, Loan } from "@/api/types";
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

  const { data: loan } = useQuery({ queryKey: ["loan", id], queryFn: async () => (await api.get<Loan>(`/loans/${id}`)).data });
  const { data: schedule } = useQuery({ queryKey: ["loan-schedule", id], queryFn: async () => (await api.get<Installment[]>(`/loans/${id}/schedule`)).data });

  const cancelMutation = useMutation({
    mutationFn: async (reason: string) => api.post(`/loans/${id}/cancel`, { reason }),
    onSuccess: () => { message.success(t("common.save")); setCancelOpen(false); queryClient.invalidateQueries({ queryKey: ["loan", id] }); },
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

  return (
    <div>
      <div className="page-header">
        <Space align="center" size={14}>
          <Button type="text" shape="circle" className="icon-btn" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} />
          <div>
            <h1 style={{ marginBottom: 0 }}>{loan.loanNo}</h1>
            <p>{t(`loans.${camel(loan.method)}`, loan.method)}</p>
          </div>
        </Space>
        {user?.role === "ADM" && loan.status === "ACTIVE" && (
          <Button danger onClick={() => setCancelOpen(true)} size="large">{t("loans.cancel")}</Button>
        )}
      </div>
      <Card>
        <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label={t("loans.method")}>{t(`loans.${camel(loan.method)}`, loan.method)}</Descriptions.Item>
          <Descriptions.Item label={t("common.status")}><Tag color={statusColor[loan.status] || "default"}>{t(`loans.${loan.status.toLowerCase()}`, loan.status)}</Tag></Descriptions.Item>
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
        <Table style={{ marginTop: 16 }} rowKey="id" columns={columns} dataSource={schedule} pagination={{ pageSize: 20 }} scroll={{ x: true }} />
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
