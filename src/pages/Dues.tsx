import { useMemo, useState } from "react";
import { Tabs, Table, Tag, Button, Space, Modal, Drawer, Form, InputNumber, Select, DatePicker, Input, message, Card, Badge, Checkbox, Empty, Descriptions, Row, Col } from "antd";
import { WalletOutlined, SearchOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import { api, apiErrorCode } from "@/api/client";
import type { DueRow, PageResponse, PaymentRow } from "@/api/types";
import { formatInr } from "@/utils/format";
import { useAuth } from "@/auth/AuthContext";

const DUE_TABS = ["today", "upcoming", "overdue", "paid", "all"] as const;
const TABS = [...DUE_TABS, "history"] as const;
const statusColor: Record<string, string> = { PAID: "success", UPCOMING: "processing", DUE_TODAY: "warning", PARTIALLY_PAID: "warning", OVERDUE: "error" };
const METHODS = ["FLAT", "REDUCING_BALANCE", "INTEREST_ONLY", "COMPOUND", "CUSTOM_SCHEDULE"];

function camel(upperSnake: string) {
  return upperSnake.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

interface Filters {
  search: string;
  frequency?: string;
  method?: string;
  from?: Dayjs;
  to?: Dayjs;
}

export default function Dues() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<string>(params.get("tab") || "today");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [payModal, setPayModal] = useState<DueRow | null>(null);
  const [waiveModal, setWaiveModal] = useState<DueRow | null>(null);
  const [historyFor, setHistoryFor] = useState<{ installmentId?: string; row?: PaymentRow; title: string } | null>(null);
  const [filters, setFilters] = useState<Filters>({ search: "" });
  const [reverseTarget, setReverseTarget] = useState<PaymentRow | null>(null);

  const isHistoryTab = tab === "history";
  const isPaidTab = tab === "paid";
  const allowBulk = !isHistoryTab && !isPaidTab;

  const dueParams = useMemo(
    () => ({
      tab, page, size: 25,
      search: filters.search || undefined,
      frequency: filters.frequency,
      method: filters.method,
      from: filters.from ? filters.from.format("YYYY-MM-DD") : undefined,
      to: filters.to ? filters.to.format("YYYY-MM-DD") : undefined,
    }),
    [tab, page, filters]
  );

  const { data, isLoading } = useQuery({
    queryKey: ["dues", dueParams],
    queryFn: async () => (await api.get<PageResponse<DueRow>>("/dues", { params: dueParams })).data,
    enabled: !isHistoryTab,
  });

  const historyParams = useMemo(
    () => ({
      page, size: 25,
      search: filters.search || undefined,
      from: filters.from ? filters.from.format("YYYY-MM-DD") : undefined,
      to: filters.to ? filters.to.format("YYYY-MM-DD") : undefined,
    }),
    [page, filters]
  );

  const { data: paymentHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["payment-history", historyParams],
    queryFn: async () => (await api.get<PageResponse<PaymentRow>>("/payments", { params: historyParams })).data,
    enabled: isHistoryTab,
  });

  const installmentHistoryQuery = useQuery({
    queryKey: ["payment-history-installment", historyFor?.installmentId],
    queryFn: async () => (await api.get<PaymentRow[]>(`/payments/by-installment/${historyFor!.installmentId}`)).data,
    enabled: !!historyFor?.installmentId,
  });

  const payMutation = useMutation({
    mutationFn: async (values: { amount: number; paidOn: any; mode: string; reference?: string; note?: string }) =>
      api.post(`/dues/${payModal!.installmentId}/payments`, {
        amount: values.amount, paidOn: dayjs(values.paidOn).format("YYYY-MM-DD"), mode: values.mode, reference: values.reference, note: values.note,
      }),
    onSuccess: () => { message.success(t("common.save")); setPayModal(null); queryClient.invalidateQueries({ queryKey: ["dues"] }); },
    onError: (e) => message.error(t(`errors.${apiErrorCode(e)}`)),
  });

  const waiveMutation = useMutation({
    mutationFn: async (values: { amount: number; reason: string }) => api.post(`/dues/${waiveModal!.installmentId}/penalty-waiver`, values),
    onSuccess: () => { message.success(t("common.save")); setWaiveModal(null); queryClient.invalidateQueries({ queryKey: ["dues"] }); },
    onError: (e) => message.error(t(`errors.${apiErrorCode(e)}`)),
  });

  const bulkMutation = useMutation({
    mutationFn: async () => api.post("/dues/bulk-pay", { installmentIds: selected, paidOn: dayjs().format("YYYY-MM-DD"), mode: "CASH" }),
    onSuccess: () => { message.success(t("common.save")); setSelected([]); queryClient.invalidateQueries({ queryKey: ["dues"] }); },
    onError: (e) => message.error(t(`errors.${apiErrorCode(e)}`)),
  });

  const reverseMutation = useMutation({
    mutationFn: async (values: { reason: string }) => api.post(`/payments/${reverseTarget!.id}/reverse`, values),
    onSuccess: () => {
      message.success(t("common.save"));
      setReverseTarget(null);
      queryClient.invalidateQueries({ queryKey: ["dues"] });
      queryClient.invalidateQueries({ queryKey: ["payment-history"] });
      queryClient.invalidateQueries({ queryKey: ["payment-history-installment"] });
    },
    onError: (e) => message.error(t(`errors.${apiErrorCode(e)}`)),
  });

  const openHistoryForRow = (r: DueRow) => setHistoryFor({ installmentId: r.installmentId, title: `${r.customerName} · ${r.loanNo}` });
  const openHistoryForPayment = (p: PaymentRow) => setHistoryFor({ row: p, title: `${p.customerName || p.customerId} · ${p.loanNo || p.loanId}` });

  const columns = [
    {
      title: t("dues.customer"), dataIndex: "customerName",
      render: (n: string, r: DueRow) => (
        <div>
          <div style={{ fontWeight: 600 }}>{n}</div>
          <div style={{ fontSize: 12.5, color: "var(--c-text-faint)" }}>{r.customerNo}</div>
        </div>
      ),
    },
    { title: t("dues.loanOrChit"), dataIndex: "loanNo" },
    { title: t("loans.dueDate"), dataIndex: "dueDate" },
    { title: t("dues.instalmentDue"), dataIndex: "instalmentDue", render: formatInr },
    { title: t("dues.penaltyDue"), dataIndex: "penaltyDue", render: (v: number) => v > 0 ? <span style={{ color: "var(--c-danger)", fontWeight: 600 }}>{formatInr(v)}</span> : formatInr(v) },
    { title: t("dues.balance"), dataIndex: "balance", render: (v: number) => <span style={{ fontWeight: 700 }}>{formatInr(v)}</span> },
    {
      title: t("common.status"), dataIndex: "status",
      render: (s: string, r: DueRow) => (
        <Space size={6}>
          <Tag color={statusColor[s] || "default"}>{t(`dues.${s.toLowerCase()}`, s)}</Tag>
          {r.provisional && <Tag color="purple">{t("dues.auctionPending")}</Tag>}
          {r.reminderActive && <Badge status="processing" />}
        </Space>
      ),
    },
    {
      title: t("common.actions"),
      render: (_: unknown, r: DueRow) =>
        r.status === "PAID" || r.status === "PARTIALLY_PAID" ? (
          <Button size="small" onClick={(e) => { e.stopPropagation(); openHistoryForRow(r); }}>{t("dues.viewHistory")}</Button>
        ) : (
          <Space>
            <Button size="small" type="primary" ghost onClick={(e) => { e.stopPropagation(); setPayModal(r); }}>{t("dues.recordPayment")}</Button>
            {user?.role === "ADM" && r.penaltyDue > 0 && (
              <Button size="small" onClick={(e) => { e.stopPropagation(); setWaiveModal(r); }}>{t("dues.waivePenalty")}</Button>
            )}
          </Space>
        ),
    },
  ];

  const historyColumns = [
    { title: t("dues.receiptNo"), dataIndex: "receiptNo" },
    {
      title: t("dues.customer"), dataIndex: "customerName",
      render: (n: string, r: PaymentRow) => (
        <div>
          <div style={{ fontWeight: 600 }}>{n || r.customerId}</div>
          <div style={{ fontSize: 12.5, color: "var(--c-text-faint)" }}>{r.customerNo}</div>
        </div>
      ),
    },
    { title: t("dues.loanOrChit"), dataIndex: "loanNo", render: (v: string, r: PaymentRow) => v || r.loanId },
    { title: t("dues.paymentAmount"), dataIndex: "amount", render: formatInr },
    { title: t("common.date"), dataIndex: "paidOn" },
    { title: t("dues.paymentMode"), dataIndex: "mode", render: (m: string) => t(`dues.${m.toLowerCase()}`, m) },
    { title: t("dues.reference"), dataIndex: "reference" },
    {
      title: t("common.status"), dataIndex: "reversed",
      render: (rev: boolean) => rev ? <Tag color="error">{t("dues.reversePayment")}</Tag> : <Tag color="success">{t("dues.paid")}</Tag>,
    },
    ...(user?.role === "ADM" ? [{
      title: t("common.actions"),
      render: (_: unknown, r: PaymentRow) =>
        !r.reversed && (
          <Button danger size="small" onClick={(e) => { e.stopPropagation(); setReverseTarget(r); }}>{t("dues.reversePayment")}</Button>
        ),
    }] : []),
  ];

  const total = isHistoryTab ? paymentHistory?.totalElements : data?.totalElements;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t("dues.title")}</h1>
          <p>{total != null ? `${total} ${t("dues.title").toLowerCase()}` : ""}</p>
        </div>
      </div>

      <Card styles={{ body: { padding: 0 } }}>
        <div style={{ padding: "4px 20px 0" }}>
          <Tabs
            activeKey={tab}
            onChange={(k) => { setTab(k); setPage(0); setSelected([]); }}
            items={TABS.map((tb) => ({ key: tb, label: t(`dues.${tb}`) }))}
          />
        </div>

        <div style={{ padding: "0 20px 14px", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <Input
            allowClear
            style={{ width: 260 }}
            prefix={<SearchOutlined style={{ color: "var(--c-text-faint)" }} />}
            placeholder={t("dues.searchPlaceholder")}
            value={filters.search}
            onChange={(e) => { setFilters((f) => ({ ...f, search: e.target.value })); setPage(0); }}
          />
          {!isHistoryTab && (
            <>
              <Select
                allowClear
                style={{ width: 160 }}
                placeholder={t("dues.allFrequencies")}
                value={filters.frequency}
                onChange={(v) => { setFilters((f) => ({ ...f, frequency: v })); setPage(0); }}
                options={["DAILY", "WEEKLY", "MONTHLY"].map((f) => ({ value: f, label: t(`loans.${f.toLowerCase()}`) }))}
              />
              <Select
                allowClear
                style={{ width: 180 }}
                placeholder={t("dues.allMethods")}
                value={filters.method}
                onChange={(v) => { setFilters((f) => ({ ...f, method: v })); setPage(0); }}
                options={METHODS.map((m) => ({ value: m, label: t(`loans.${camel(m)}`) }))}
              />
            </>
          )}
          {tab !== "today" && (
            <>
              <DatePicker placeholder={t("dues.dateFrom")} value={filters.from} onChange={(v) => { setFilters((f) => ({ ...f, from: v ?? undefined })); setPage(0); }} />
              <DatePicker placeholder={t("dues.dateTo")} value={filters.to} onChange={(v) => { setFilters((f) => ({ ...f, to: v ?? undefined })); setPage(0); }} />
            </>
          )}
          {(filters.search || filters.frequency || filters.method || filters.from || filters.to) && (
            <Button size="small" onClick={() => { setFilters({ search: "" }); setPage(0); }}>{t("dues.clearFilters")}</Button>
          )}
        </div>

        {allowBulk && selected.length > 0 && (
          <div style={{ margin: "0 20px 14px", padding: "10px 16px", background: "var(--c-primary-light)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <span style={{ color: "var(--c-primary-dark)", fontWeight: 500, fontSize: 13.5 }}>{t("dues.selectedRows", { count: selected.length })}</span>
            <Button type="primary" size="small" onClick={() => bulkMutation.mutate()} loading={bulkMutation.isPending}>{t("dues.bulkMarkPaid")}</Button>
          </div>
        )}

        {isHistoryTab ? (
          <Table
            className="desktop-only"
            rowKey="id"
            columns={historyColumns}
            dataSource={paymentHistory?.content}
            loading={historyLoading}
            onRow={(r) => ({ onClick: () => openHistoryForPayment(r), style: { cursor: "pointer" } })}
            pagination={{ current: page + 1, pageSize: 25, total: paymentHistory?.totalElements, onChange: (p) => setPage(p - 1), style: { paddingInline: 20 } }}
            locale={{ emptyText: <Empty description={t("dues.noPayments")} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 32 }} /> }}
          />
        ) : (
          <Table
            className="desktop-only"
            rowKey="installmentId"
            columns={columns}
            dataSource={data?.content}
            loading={isLoading}
            onRow={(r) => (r.status === "PAID" || r.status === "PARTIALLY_PAID" ? { onClick: () => openHistoryForRow(r), style: { cursor: "pointer" } } : {})}
            rowSelection={allowBulk ? { selectedRowKeys: selected, onChange: (keys) => setSelected(keys as string[]) } : undefined}
            pagination={{ current: page + 1, pageSize: 25, total: data?.totalElements, onChange: (p) => setPage(p - 1), style: { paddingInline: 20 } }}
            locale={{ emptyText: <Empty description={t("common.noData")} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 32 }} /> }}
          />
        )}
      </Card>

      <div className="phone-only" style={{ marginTop: 16 }}>
        {isHistoryTab ? (
          <>
            {!paymentHistory?.content.length && <Empty description={t("dues.noPayments")} />}
            {paymentHistory?.content.map((p) => (
              <Card key={p.id} className="card-row" onClick={() => openHistoryForPayment(p)}>
                <Space style={{ width: "100%", justifyContent: "space-between" }}>
                  <b>{p.receiptNo}</b>
                  {p.reversed ? <Tag color="error">{t("dues.reversePayment")}</Tag> : <Tag color="success">{t("dues.paid")}</Tag>}
                </Space>
                <div style={{ marginTop: 6 }}>{p.customerName || p.customerId} <span style={{ color: "var(--c-text-faint)", fontSize: 12.5 }}>({p.customerNo})</span></div>
                <div style={{ fontSize: 13, color: "var(--c-text-secondary)" }}>{p.loanNo || p.loanId} &middot; {p.paidOn}</div>
                <div style={{ fontWeight: 700, marginTop: 4 }}>{formatInr(p.amount)}</div>
              </Card>
            ))}
          </>
        ) : (
          <>
            {!data?.content.length && <Empty description={t("common.noData")} />}
            {data?.content.map((r) => (
              <Card key={r.installmentId} className="card-row" onClick={() => (r.status === "PAID" || r.status === "PARTIALLY_PAID") && openHistoryForRow(r)}>
                <Space style={{ width: "100%", justifyContent: "space-between" }}>
                  {allowBulk ? (
                    <Checkbox
                      checked={selected.includes(r.installmentId)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setSelected(e.target.checked ? [...selected, r.installmentId] : selected.filter((x) => x !== r.installmentId))}
                    />
                  ) : <span />}
                  <Tag color={statusColor[r.status] || "default"}>{t(`dues.${r.status.toLowerCase()}`, r.status)}</Tag>
                </Space>
                <div style={{ marginTop: 6 }}><b>{r.customerName}</b> <span style={{ color: "var(--c-text-faint)", fontSize: 12.5 }}>({r.customerNo})</span></div>
                <div style={{ fontSize: 13, color: "var(--c-text-secondary)" }}>{r.loanNo} &middot; {r.dueDate}</div>
                <div style={{ fontWeight: 700, marginTop: 4 }}>{formatInr(r.balance)} <span style={{ fontWeight: 400, fontSize: 12, color: "var(--c-text-faint)" }}>{t("dues.balance")}</span></div>
                {r.status !== "PAID" && r.status !== "PARTIALLY_PAID" && (
                  <Space style={{ marginTop: 10 }}>
                    <Button size="small" type="primary" ghost className="touch-target" onClick={(e) => { e.stopPropagation(); setPayModal(r); }}>{t("dues.recordPayment")}</Button>
                  </Space>
                )}
              </Card>
            ))}
          </>
        )}
      </div>

      <Modal title={t("dues.recordPayment")} open={!!payModal} onCancel={() => setPayModal(null)} footer={null}>
        <Form layout="vertical" initialValues={{ amount: payModal?.balance, paidOn: dayjs(), mode: "CASH" }} onFinish={(v) => payMutation.mutate(v)}>
          <Form.Item name="amount" label={t("dues.paymentAmount")} rules={[{ required: true }]}><InputNumber style={{ width: "100%" }} prefix={<WalletOutlined style={{ color: "var(--c-text-faint)" }} />} min={0.01} /></Form.Item>
          <Form.Item name="paidOn" label={t("common.date")} rules={[{ required: true }]}><DatePicker style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="mode" label={t("dues.paymentMode")}>
            <Select options={[{ value: "CASH", label: t("dues.cash") }, { value: "UPI", label: t("dues.upi") }, { value: "BANK", label: t("dues.bank") }]} />
          </Form.Item>
          <Form.Item name="reference" label={t("dues.reference")}><Input /></Form.Item>
          <Form.Item name="note" label={t("common.notes")}><Input.TextArea rows={2} /></Form.Item>
          <Button type="primary" htmlType="submit" block loading={payMutation.isPending} size="large">{t("common.save")}</Button>
        </Form>
      </Modal>

      <Modal title={t("dues.waivePenalty")} open={!!waiveModal} onCancel={() => setWaiveModal(null)} footer={null}>
        <Form layout="vertical" initialValues={{ amount: waiveModal?.penaltyDue }} onFinish={(v) => waiveMutation.mutate(v)}>
          <Form.Item name="amount" label={t("dues.waiverAmount")} rules={[{ required: true }]}><InputNumber style={{ width: "100%" }} min={0.01} /></Form.Item>
          <Form.Item name="reason" label={t("common.reason")} rules={[{ required: true }]}><Input.TextArea rows={2} /></Form.Item>
          <Button type="primary" htmlType="submit" block loading={waiveMutation.isPending} size="large">{t("common.save")}</Button>
        </Form>
      </Modal>

      <Drawer title={historyFor ? `${t("dues.paymentDetails")} — ${historyFor.title}` : t("dues.paymentDetails")} open={!!historyFor} onClose={() => setHistoryFor(null)} width={460}>
        {historyFor?.row && <PaymentCard payment={historyFor.row} highlightInstallmentId={undefined} t={t} isAdm={user?.role === "ADM"} onReverse={setReverseTarget} />}
        {historyFor?.installmentId && (
          installmentHistoryQuery.isLoading ? null : (installmentHistoryQuery.data || []).length === 0 ? (
            <Empty description={t("dues.noPayments")} />
          ) : (
            <Space direction="vertical" style={{ width: "100%" }} size={16}>
              {(installmentHistoryQuery.data || []).map((p) => (
                <PaymentCard key={p.id} payment={p} highlightInstallmentId={historyFor.installmentId} t={t} isAdm={user?.role === "ADM"} onReverse={setReverseTarget} />
              ))}
            </Space>
          )
        )}
      </Drawer>

      <Modal title={t("dues.reversePayment")} open={!!reverseTarget} onCancel={() => setReverseTarget(null)} footer={null}>
        <Form layout="vertical" onFinish={(v) => reverseMutation.mutate(v)}>
          <p style={{ color: "var(--c-text-secondary)" }}>{t("dues.reversePaymentConfirm", { receiptNo: reverseTarget?.receiptNo })}</p>
          <Form.Item name="reason" label={t("common.reason")} rules={[{ required: true }]}><Input.TextArea rows={2} /></Form.Item>
          <Button danger type="primary" htmlType="submit" block loading={reverseMutation.isPending} size="large">{t("dues.reversePayment")}</Button>
        </Form>
      </Modal>
    </div>
  );
}

function PaymentCard({ payment, highlightInstallmentId, t, isAdm, onReverse }: {
  payment: PaymentRow; highlightInstallmentId?: string; t: (k: string, d?: any) => string;
  isAdm: boolean; onReverse: (p: PaymentRow) => void;
}) {
  const relevant = highlightInstallmentId ? payment.allocations.filter((a) => a.installmentId === highlightInstallmentId) : payment.allocations;
  return (
    <Card size="small" style={{ marginBottom: 12 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 8 }}>
        <Col><b>{payment.receiptNo}</b></Col>
        <Col>{payment.reversed ? <Tag color="error">{t("dues.reversePayment")}</Tag> : <Tag color="success">{t("dues.paid")}</Tag>}</Col>
      </Row>
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label={t("common.date")}>{payment.paidOn}</Descriptions.Item>
        <Descriptions.Item label={t("dues.paymentAmount")}>{formatInr(payment.amount)}</Descriptions.Item>
        <Descriptions.Item label={t("dues.paymentMode")}>{t(`dues.${payment.mode.toLowerCase()}`, payment.mode)}</Descriptions.Item>
        {payment.reference && <Descriptions.Item label={t("dues.reference")}>{payment.reference}</Descriptions.Item>}
        {payment.note && <Descriptions.Item label={t("common.notes")}>{payment.note}</Descriptions.Item>}
        {payment.reversed && payment.reversedReason && <Descriptions.Item label={t("dues.reversePayment")}>{payment.reversedReason}</Descriptions.Item>}
      </Descriptions>
      {relevant.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {relevant.map((a, idx) => (
            <Row key={idx} gutter={8} style={{ fontSize: 12.5, color: "var(--c-text-secondary)", marginTop: 4 }}>
              <Col span={8}>{t("dues.penaltyPaid")}: {formatInr(a.penaltyAmount)}</Col>
              <Col span={8}>{t("dues.interestPaid")}: {formatInr(a.interestAmount)}</Col>
              <Col span={8}>{t("dues.principalPaid")}: {formatInr(a.principalAmount)}</Col>
            </Row>
          ))}
        </div>
      )}
      {isAdm && !payment.reversed && (
        <Button danger size="small" style={{ marginTop: 12 }} onClick={() => onReverse(payment)}>{t("dues.reversePayment")}</Button>
      )}
    </Card>
  );
}
