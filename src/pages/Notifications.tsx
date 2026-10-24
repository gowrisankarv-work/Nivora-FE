import type { ReactNode } from "react";
import { Table, Button, Switch, Space, Tag, Card, Avatar, Modal } from "antd";
import type { ColumnsType } from "antd/es/table";
import { BellOutlined, MailOutlined, WarningOutlined, EyeOutlined, LinkOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/api/client";
import type { Notification, PageResponse } from "@/api/types";
import { formatDateTime } from "@/utils/format";

const iconFor: Record<string, { icon: ReactNode; tone: string }> = {
  DIGEST: { icon: <MailOutlined />, tone: "var(--c-info)" },
  EMAIL_FAILED: { icon: <WarningOutlined />, tone: "var(--c-danger)" },
  SYSTEM: { icon: <BellOutlined />, tone: "var(--c-primary)" },
};

export default function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications-list", unreadOnly, page, pageSize],
    queryFn: async () =>
      (
        await api.get<PageResponse<Notification>>("/notifications", {
          params: { unreadOnly, page: page - 1, size: pageSize },
        })
      ).data,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-list"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: async () => api.post("/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-list"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });

  const handleOpenNotification = (n: Notification) => {
    if (!n.read) {
      markReadMutation.mutate(n.id);
      n.read = true;
    }
    setSelectedNotification(n);
  };

  const columns: ColumnsType<Notification> = [
    {
      title: t("notifications.type"),
      dataIndex: "type",
      width: 70,
      align: "center",
      render: (type: string) => {
        const cfg = iconFor[type] || iconFor.SYSTEM;
        return (
          <Avatar
            style={{
              background: "#fff",
              border: `1px solid ${cfg.tone}33`,
              color: cfg.tone,
            }}
            icon={cfg.icon}
          />
        );
      },
    },
    {
      title: t("notifications.subject"),
      dataIndex: "title",
      render: (_: unknown, record: Notification) => (
        <div>
          <Space size={6} wrap>
            <span
              style={{
                fontWeight: record.read ? 500 : 700,
                color: "var(--c-text-primary)",
              }}
            >
              {record.title}
            </span>
            {!record.read && <Tag color="success">New</Tag>}
          </Space>
          {record.message && (
            <div
              style={{
                fontSize: 13,
                color: "var(--c-text-secondary)",
                marginTop: 2,
              }}
            >
              {record.message}
            </div>
          )}
        </div>
      ),
    },
    {
      title: t("notifications.date"),
      dataIndex: "createdAt",
      width: 200,
      render: (d: string) => (
        <span style={{ fontSize: 13, color: "var(--c-text-secondary)" }}>
          {formatDateTime(d, i18n.language)}
        </span>
      ),
    },
    {
      title: t("notifications.status"),
      dataIndex: "read",
      width: 110,
      render: (read: boolean) => (
        <Tag color={read ? "default" : "processing"}>
          {read ? t("notifications.read") : t("notifications.unread")}
        </Tag>
      ),
    },
    {
      title: t("common.actions"),
      key: "actions",
      width: 120,
      render: (_: unknown, record: Notification) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            handleOpenNotification(record);
          }}
        >
          {t("notifications.viewMail")}
        </Button>
      ),
    },
  ];

  const modalIcon = selectedNotification
    ? (iconFor[selectedNotification.type] || iconFor.SYSTEM).icon
    : null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t("notifications.title")}</h1>
          <p>{data ? `${data.totalElements}` : ""}</p>
        </div>
        <Space>
          <Switch
            checked={unreadOnly}
            onChange={(checked) => {
              setUnreadOnly(checked);
              setPage(1);
            }}
            size="small"
          />
          <span style={{ fontSize: 13.5, color: "var(--c-text-secondary)" }}>
            {t("notifications.unreadOnly")}
          </span>
          <Button onClick={() => markAllMutation.mutate()}>
            {t("notifications.markAllRead")}
          </Button>
        </Space>
      </div>

      <Card styles={{ body: { padding: 0 } }}>
        <Table<Notification>
          rowKey="id"
          columns={columns}
          dataSource={data?.content || []}
          loading={isLoading}
          onRow={(record) => ({
            onClick: () => handleOpenNotification(record),
            style: {
              cursor: "pointer",
              backgroundColor: record.read ? undefined : "rgba(37, 99, 235, 0.03)",
            },
          })}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: data?.totalElements || 0,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50"],
            onChange: (newPage, newPageSize) => {
              setPage(newPage);
              setPageSize(newPageSize);
            },
            showTotal: (total) => `${total} ${t("notifications.title")}`,
          }}
        />
      </Card>

      <Modal
        open={!!selectedNotification}
        onCancel={() => setSelectedNotification(null)}
        width={760}
        title={
          <Space align="center">
            {modalIcon}
            <span style={{ fontSize: 16 }}>{selectedNotification?.title}</span>
          </Space>
        }
        footer={[
          selectedNotification?.link ? (
            <Button
              key="link"
              type="primary"
              icon={<LinkOutlined />}
              onClick={() => {
                navigate(selectedNotification.link!);
                setSelectedNotification(null);
              }}
            >
              {t("notifications.openLink")}
            </Button>
          ) : null,
          <Button key="close" onClick={() => setSelectedNotification(null)}>
            {t("common.close")}
          </Button>,
        ]}
      >
        {selectedNotification && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 12px",
                background: "var(--c-bg-subtle, #f9fafb)",
                borderRadius: 6,
                marginBottom: 16,
                fontSize: 13,
                color: "var(--c-text-secondary)",
              }}
            >
              <span>
                <strong>{t("notifications.date")}:</strong>{" "}
                {formatDateTime(selectedNotification.createdAt, i18n.language)}
              </span>
              <Tag color={selectedNotification.read ? "default" : "processing"}>
                {selectedNotification.read ? t("notifications.read") : t("notifications.unread")}
              </Tag>
            </div>

            {selectedNotification.mailContent ? (
              <div
                style={{
                  border: "1px solid var(--c-border, #e5e7eb)",
                  borderRadius: 8,
                  padding: 20,
                  background: "#fff",
                  maxHeight: "60vh",
                  overflowY: "auto",
                  color: "#1f2937",
                }}
                dangerouslySetInnerHTML={{ __html: selectedNotification.mailContent }}
              />
            ) : (
              <div
                style={{
                  border: "1px solid var(--c-border, #e5e7eb)",
                  borderRadius: 8,
                  padding: 20,
                  background: "#fff",
                }}
              >
                <h4 style={{ margin: "0 0 8px 0" }}>{selectedNotification.title}</h4>
                <p style={{ color: "var(--c-text-secondary)", margin: "0 0 16px 0" }}>
                  {selectedNotification.message}
                </p>
                {selectedNotification.counts && (
                  <div
                    style={{
                      background: "var(--c-bg-subtle, #f9fafb)",
                      borderRadius: 6,
                      padding: "12px 16px",
                      marginBottom: 16,
                    }}
                  >
                    <strong>Summary:</strong>
                    <div style={{ marginTop: 4 }}>
                      Due today: {selectedNotification.counts.today ?? 0} | Overdue: {selectedNotification.counts.overdue ?? 0}
                    </div>
                  </div>
                )}
                {selectedNotification.link && (
                  <Button
                    type="primary"
                    icon={<LinkOutlined />}
                    onClick={() => {
                      navigate(selectedNotification.link!);
                      setSelectedNotification(null);
                    }}
                  >
                    {t("notifications.openLink")}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
