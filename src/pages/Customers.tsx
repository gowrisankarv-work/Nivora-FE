import { useState } from "react";
import { Table, Input, Button, Switch, Tag, Space, Card, Avatar, Empty } from "antd";
import { PlusOutlined, SearchOutlined, PhoneOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Customer, PageResponse } from "@/api/types";
import { CustomerFormDrawer } from "@/components/CustomerFormDrawer";

export default function Customers() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["customers", search, includeInactive, page],
    queryFn: async () =>
      (await api.get<PageResponse<Customer>>("/customers", { params: { q: search, includeInactive, page, size: 25 } })).data,
  });

  const initials = (name: string) => name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  const columns = [
    {
      title: t("common.name"), dataIndex: "name",
      render: (name: string, c: Customer) => (
        <Space>
          <Avatar size={34} style={{ background: "var(--c-primary-light)", color: "var(--c-primary-dark)", fontWeight: 600, fontSize: 12.5 }}>
            {initials(name)}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>{name}</div>
            <div style={{ fontSize: 12.5, color: "var(--c-text-faint)" }}>{c.customerNo}</div>
          </div>
        </Space>
      ),
    },
    { title: t("common.phone"), dataIndex: "phone" },
    { title: t("common.village"), dataIndex: ["addressCurrent", "village"], render: (v?: string) => v || <span style={{ color: "var(--c-text-faint)" }}>—</span> },
    {
      title: t("common.status"), dataIndex: "status",
      render: (s: string) => <Tag color={s === "ACTIVE" ? "success" : "default"}>{t(`common.${s.toLowerCase()}`)}</Tag>,
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t("customers.title")}</h1>
          <p>{data ? t("customers.totalCount", { count: data.totalElements }) : ""}</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawerOpen(true)} size="large" className="touch-target">
          {t("customers.addCustomer")}
        </Button>
      </div>

      <Card styles={{ body: { padding: 0 } }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--c-border)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <Input
            placeholder={t("common.search")}
            prefix={<SearchOutlined style={{ color: "var(--c-text-faint)" }} />}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 280 }}
            allowClear
          />
          <Space>
            <Switch checked={includeInactive} onChange={setIncludeInactive} size="small" />
            <span style={{ fontSize: 13.5, color: "var(--c-text-secondary)" }}>{t("common.inactive")}</span>
          </Space>
        </div>

        <Table
          className="desktop-only"
          rowKey="id"
          columns={columns}
          dataSource={data?.content}
          loading={isLoading}
          onRow={(record) => ({ onClick: () => navigate(`/customers/${record.id}`), style: { cursor: "pointer" } })}
          pagination={{ current: page + 1, pageSize: 25, total: data?.totalElements, onChange: (p) => setPage(p - 1), style: { paddingInline: 20 } }}
          locale={{ emptyText: <Empty description={t("common.noData")} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 32 }} /> }}
        />
      </Card>

      <div className="phone-only" style={{ marginTop: 16 }}>
        {!data?.content.length && <Empty description={t("common.noData")} />}
        {data?.content.map((c) => (
          <Card key={c.id} className="card-row" onClick={() => navigate(`/customers/${c.id}`)}>
            <Space align="start">
              <Avatar size={38} style={{ background: "var(--c-primary-light)", color: "var(--c-primary-dark)", fontWeight: 600 }}>{initials(c.name)}</Avatar>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{c.name}</div>
                <div style={{ fontSize: 12.5, color: "var(--c-text-faint)" }}>{c.customerNo}</div>
                <div style={{ fontSize: 13, color: "var(--c-text-secondary)", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                  <PhoneOutlined /> {c.phone} {c.addressCurrent?.village && <>&middot; {c.addressCurrent.village}</>}
                </div>
                <Tag color={c.status === "ACTIVE" ? "success" : "default"} style={{ marginTop: 6 }}>{t(`common.${c.status.toLowerCase()}`)}</Tag>
              </div>
            </Space>
          </Card>
        ))}
      </div>

      <CustomerFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={(c) => navigate(`/customers/${c.id}`)}
      />
    </div>
  );
}
