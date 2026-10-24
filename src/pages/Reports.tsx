import { useState } from "react";
import { Card, Table, Tabs, Space, Button, DatePicker, Select, Input, Tag, message } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import { api } from "@/api/client";
import type { AuditLogEntry, PageResponse, ReportResult } from "@/api/types";
import { formatDate, formatDateTime } from "@/utils/format";

const METHODS = ["FLAT", "REDUCING_BALANCE", "INTEREST_ONLY", "COMPOUND", "CUSTOM_SCHEDULE"];

function camel(upperSnake: string) {
  return upperSnake.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

export default function Reports() {
  const { t } = useTranslation();
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t("reports.title")}</h1>
        </div>
      </div>
      <Card>
        <Tabs
          items={[
            { key: "audit", label: t("reports.auditLog"), children: <AuditTab /> },
            { key: "collections", label: t("reports.collections"), children: <CollectionsTab /> },
            { key: "penalties", label: t("reports.penalties"), children: <PenaltiesTab /> },
            { key: "loans", label: t("reports.loanPortfolio"), children: <LoanPortfolioTab /> },
            { key: "overdue", label: t("reports.overdueAging"), children: <OverdueAgingTab /> },
            { key: "customers", label: t("reports.customersTab"), children: <CustomersReportTab /> },
          ]}
        />
      </Card>
    </div>
  );
}

/** Renders a report's summary tags + a generic table from its string[][] rows - shared by every report tab. */
function ReportBody({ data, isLoading }: { data?: ReportResult; isLoading: boolean }) {
  const { t } = useTranslation();
  const columns = (data?.columns || []).map((c, i) => ({ title: c, dataIndex: String(i), key: i, ellipsis: true }));
  const dataSource = (data?.rows || []).map((row, idx) => {
    const obj: Record<string, string | number> = { key: idx };
    row.forEach((cell, i) => { obj[String(i)] = cell; });
    return obj;
  });
  return (
    <>
      {!!data?.summary.length && (
        <Space wrap style={{ marginBottom: 14 }}>
          {data.summary.map((line, i) => <Tag key={i} style={{ fontSize: 13, padding: "4px 10px" }}>{line}</Tag>)}
        </Space>
      )}
      <Table
        size="small" columns={columns} dataSource={dataSource} loading={isLoading}
        scroll={{ x: true }} pagination={{ pageSize: 20 }} locale={{ emptyText: t("common.noData") }}
      />
    </>
  );
}

/** Downloads /reports/{type}/export as a file - needs the auth header, so a plain <a href> won't work. */
function ExportButtons({ type, params }: { type: string; params: Record<string, unknown> }) {
  const { t } = useTranslation();
  const [downloading, setDownloading] = useState<"xlsx" | "pdf" | null>(null);

  const download = async (format: "xlsx" | "pdf") => {
    setDownloading(format);
    try {
      const response = await api.get(`/reports/${type}/export`, { params: { ...params, format }, responseType: "blob" });
      const blob = new Blob([response.data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}-report.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      message.error(t("common.somethingWentWrong"));
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Space>
      <Button icon={<DownloadOutlined />} loading={downloading === "xlsx"} onClick={() => download("xlsx")}>{t("reports.downloadXlsx")}</Button>
      <Button icon={<DownloadOutlined />} loading={downloading === "pdf"} onClick={() => download("pdf")}>{t("reports.downloadPdf")}</Button>
    </Space>
  );
}

function FrequencySelect({ value, onChange }: { value?: string; onChange: (v?: string) => void }) {
  const { t } = useTranslation();
  return (
    <Select allowClear style={{ width: 160 }} placeholder={t("dues.allFrequencies")} value={value} onChange={onChange}
      options={["DAILY", "WEEKLY", "MONTHLY"].map((f) => ({ value: f, label: t(`loans.${f.toLowerCase()}`) }))} />
  );
}

function MethodSelect({ value, onChange }: { value?: string; onChange: (v?: string) => void }) {
  const { t } = useTranslation();
  return (
    <Select allowClear style={{ width: 180 }} placeholder={t("dues.allMethods")} value={value} onChange={onChange}
      options={METHODS.map((m) => ({ value: m, label: t(`loans.${camel(m)}`) }))} />
  );
}

function VillageInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation();
  return <Input style={{ width: 160 }} placeholder={t("common.village")} value={value} onChange={(e) => onChange(e.target.value)} allowClear />;
}

function CollectionsTab() {
  const { t } = useTranslation();
  const [from, setFrom] = useState<Dayjs>();
  const [to, setTo] = useState<Dayjs>();
  const [frequency, setFrequency] = useState<string>();
  const [method, setMethod] = useState<string>();
  const [village, setVillage] = useState("");

  const params = { from: from?.format("YYYY-MM-DD"), to: to?.format("YYYY-MM-DD"), frequency, method, village: village || undefined };
  const { data, isLoading } = useQuery({
    queryKey: ["report-collections", params],
    queryFn: async () => (await api.get<ReportResult>("/reports/collections", { params })).data,
  });

  return (
    <div>
      <Space wrap style={{ marginBottom: 14 }}>
        <DatePicker placeholder={t("common.from")} value={from} onChange={(v) => setFrom(v ?? undefined)} />
        <DatePicker placeholder={t("common.to")} value={to} onChange={(v) => setTo(v ?? undefined)} />
        <FrequencySelect value={frequency} onChange={setFrequency} />
        <MethodSelect value={method} onChange={setMethod} />
        <VillageInput value={village} onChange={setVillage} />
        <ExportButtons type="collections" params={params} />
      </Space>
      <ReportBody data={data} isLoading={isLoading} />
    </div>
  );
}

function PenaltiesTab() {
  const { t } = useTranslation();
  const [from, setFrom] = useState<Dayjs>();
  const [to, setTo] = useState<Dayjs>();
  const [frequency, setFrequency] = useState<string>();
  const [method, setMethod] = useState<string>();
  const [village, setVillage] = useState("");

  const params = { from: from?.format("YYYY-MM-DD"), to: to?.format("YYYY-MM-DD"), frequency, method, village: village || undefined };
  const { data, isLoading } = useQuery({
    queryKey: ["report-penalties", params],
    queryFn: async () => (await api.get<ReportResult>("/reports/penalties", { params })).data,
  });

  return (
    <div>
      <Space wrap style={{ marginBottom: 14 }}>
        <DatePicker placeholder={t("common.from")} value={from} onChange={(v) => setFrom(v ?? undefined)} />
        <DatePicker placeholder={t("common.to")} value={to} onChange={(v) => setTo(v ?? undefined)} />
        <FrequencySelect value={frequency} onChange={setFrequency} />
        <MethodSelect value={method} onChange={setMethod} />
        <VillageInput value={village} onChange={setVillage} />
        <ExportButtons type="penalties" params={params} />
      </Space>
      <ReportBody data={data} isLoading={isLoading} />
    </div>
  );
}

function LoanPortfolioTab() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<string>();
  const [method, setMethod] = useState<string>();

  const params = { status, method };
  const { data, isLoading } = useQuery({
    queryKey: ["report-loans", params],
    queryFn: async () => (await api.get<ReportResult>("/reports/loans", { params })).data,
  });

  return (
    <div>
      <Space wrap style={{ marginBottom: 14 }}>
        <Select allowClear style={{ width: 160 }} placeholder={t("reports.allStatuses")} value={status} onChange={setStatus}
          options={["ACTIVE", "CLOSED", "CANCELLED"].map((s) => ({ value: s, label: t(`loans.${s.toLowerCase()}`) }))} />
        <MethodSelect value={method} onChange={setMethod} />
        <ExportButtons type="loans" params={params} />
      </Space>
      <ReportBody data={data} isLoading={isLoading} />
    </div>
  );
}

function OverdueAgingTab() {
  const { t } = useTranslation();
  const [frequency, setFrequency] = useState<string>();
  const [method, setMethod] = useState<string>();
  const [village, setVillage] = useState("");

  const params = { frequency, method, village: village || undefined };
  const { data, isLoading } = useQuery({
    queryKey: ["report-overdue", params],
    queryFn: async () => (await api.get<ReportResult>("/reports/overdue", { params })).data,
  });

  return (
    <div>
      <Space wrap style={{ marginBottom: 14 }}>
        <FrequencySelect value={frequency} onChange={setFrequency} />
        <MethodSelect value={method} onChange={setMethod} />
        <VillageInput value={village} onChange={setVillage} />
        <ExportButtons type="overdue" params={params} />
      </Space>
      <ReportBody data={data} isLoading={isLoading} />
    </div>
  );
}

function CustomersReportTab() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<string>();
  const [village, setVillage] = useState("");

  const params = { status, village: village || undefined };
  const { data, isLoading } = useQuery({
    queryKey: ["report-customers", params],
    queryFn: async () => (await api.get<ReportResult>("/reports/customers", { params })).data,
  });

  return (
    <div>
      <Space wrap style={{ marginBottom: 14 }}>
        <Select allowClear style={{ width: 160 }} placeholder={t("reports.allStatuses")} value={status} onChange={setStatus}
          options={["ACTIVE", "INACTIVE"].map((s) => ({ value: s, label: t(`common.${s.toLowerCase()}`) }))} />
        <VillageInput value={village} onChange={setVillage} />
        <ExportButtons type="customers" params={params} />
      </Space>
      <ReportBody data={data} isLoading={isLoading} />
    </div>
  );
}

function AuditTab() {
  const { t, i18n } = useTranslation();
  const { data } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => (await api.get<PageResponse<AuditLogEntry>>("/audit-logs", { params: { size: 50 } })).data,
  });

  const columns = [
    { title: t("reports.at"), dataIndex: "at", render: (d: string) => formatDateTime(d, i18n.language) },
    { title: t("reports.user"), dataIndex: "userId" },
    { title: t("reports.entity"), dataIndex: "entity" },
    { title: t("reports.action"), dataIndex: "action" },
    { title: t("reports.summary"), dataIndex: "summary" },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 14 }}>
        <ExportButtons type="audit" params={{}} />
      </Space>
      <Table rowKey="id" columns={columns} dataSource={data?.content} scroll={{ x: true }} />
    </div>
  );
}
