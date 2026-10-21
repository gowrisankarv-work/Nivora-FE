import { useState } from "react";
import { Table, Select, Button, Tag, Card, Empty } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Loan, PageResponse } from "@/api/types";
import { formatInr } from "@/utils/format";

const statusColor: Record<string, string> = { ACTIVE: "success", CLOSED: "blue", CANCELLED: "default" };

function camel(upperSnake: string) {
  return upperSnake.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

export default function Loans() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState<string | undefined>(params.get("status") || undefined);
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["loans-page", status, page],
    queryFn: async () => (await api.get<PageResponse<Loan>>("/loans", { params: { status, page, size: 25 } })).data,
  });

  const columns = [
    { title: t("loans.loanNo"), dataIndex: "loanNo", render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: t("loans.method"), dataIndex: "method", render: (m: string) => <Tag>{t(`loans.${camel(m)}`, m)}</Tag> },
    { title: t("loans.frequency"), dataIndex: "frequency" },
    { title: t("loans.principal"), dataIndex: "principalAmount", render: formatInr },
    { title: t("loans.outstanding"), render: (_: unknown, l: Loan) => <span style={{ fontWeight: 600 }}>{formatInr(l.totalPayableAmount - l.paidAmount)}</span> },
    { title: t("common.status"), dataIndex: "status", render: (s: string) => <Tag color={statusColor[s] || "default"}>{t(`loans.${s.toLowerCase()}`, s)}</Tag> },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t("loans.title")}</h1>
          <p>{data ? `${data.totalElements} ${t("loans.title").toLowerCase()}` : ""}</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/loans/new")} size="large" className="touch-target">
          {t("loans.newLoan")}
        </Button>
      </div>

      <Card styles={{ body: { padding: 0 } }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--c-border)" }}>
          <Select
            allowClear
            placeholder={t("common.status")}
            style={{ width: 180 }}
            value={status}
            onChange={setStatus}
            options={["ACTIVE", "CLOSED", "CANCELLED"].map((s) => ({ value: s, label: t(`loans.${s.toLowerCase()}`, s) }))}
          />
        </div>
        <Table
          className="desktop-only"
          rowKey="id"
          columns={columns}
          dataSource={data?.content}
          loading={isLoading}
          onRow={(l) => ({ onClick: () => navigate(`/loans/${l.id}`), style: { cursor: "pointer" } })}
          pagination={{ current: page + 1, pageSize: 25, total: data?.totalElements, onChange: (p) => setPage(p - 1), style: { paddingInline: 20 } }}
          locale={{ emptyText: <Empty description={t("common.noData")} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 32 }} /> }}
        />
      </Card>

      <div className="phone-only" style={{ marginTop: 16 }}>
        {!data?.content.length && <Empty description={t("common.noData")} />}
        {data?.content.map((l) => (
          <Card key={l.id} className="card-row" onClick={() => navigate(`/loans/${l.id}`)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <b>{l.loanNo}</b>
              <Tag color={statusColor[l.status] || "default"}>{t(`loans.${l.status.toLowerCase()}`, l.status)}</Tag>
            </div>
            <div style={{ color: "var(--c-text-secondary)", fontSize: 13, margin: "4px 0" }}>{t(`loans.${camel(l.method)}`, l.method)}</div>
            <div style={{ fontWeight: 600 }}>{formatInr(l.totalPayableAmount - l.paidAmount)} <span style={{ fontWeight: 400, color: "var(--c-text-faint)", fontSize: 12.5 }}>{t("loans.outstanding")}</span></div>
          </Card>
        ))}
      </div>
    </div>
  );
}
