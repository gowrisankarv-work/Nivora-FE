import type { ReactNode } from "react";
import { List, Button, Switch, Space, Empty, Tag, Card, Avatar } from "antd";
import { BellOutlined, MailOutlined, WarningOutlined } from "@ant-design/icons";
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

  const { data } = useQuery({
    queryKey: ["notifications-list", unreadOnly],
    queryFn: async () => (await api.get<PageResponse<Notification>>("/notifications", { params: { unreadOnly, size: 50 } })).data,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["notifications-list"] }); queryClient.invalidateQueries({ queryKey: ["unread-count"] }); },
  });

  const markAllMutation = useMutation({
    mutationFn: async () => api.post("/notifications/read-all"),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["notifications-list"] }); queryClient.invalidateQueries({ queryKey: ["unread-count"] }); },
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t("notifications.title")}</h1>
          <p>{data ? `${data.totalElements}` : ""}</p>
        </div>
        <Space>
          <Switch checked={unreadOnly} onChange={setUnreadOnly} size="small" />
          <span style={{ fontSize: 13.5, color: "var(--c-text-secondary)" }}>{t("notifications.unreadOnly")}</span>
          <Button onClick={() => markAllMutation.mutate()}>{t("notifications.markAllRead")}</Button>
        </Space>
      </div>

      <Card styles={{ body: { padding: data?.content.length ? 0 : 24 } }}>
        {!data?.content.length ? (
          <Empty description={t("notifications.noNotifications")} />
        ) : (
          <List
            dataSource={data.content}
            renderItem={(n) => {
              const cfg = iconFor[n.type] || iconFor.SYSTEM;
              return (
                <List.Item
                  style={{ background: n.read ? undefined : "var(--c-primary-light)", cursor: "pointer", padding: "14px 20px" }}
                  onClick={() => { markReadMutation.mutate(n.id); if (n.link) navigate(n.link); }}
                >
                  <List.Item.Meta
                    avatar={<Avatar style={{ background: "#fff", border: `1px solid ${cfg.tone}33`, color: cfg.tone }} icon={cfg.icon} />}
                    title={<Space>{n.title} {!n.read && <Tag color="success">New</Tag>}</Space>}
                    description={<>{n.message}<br /><small style={{ color: "var(--c-text-faint)" }}>{formatDateTime(n.createdAt, i18n.language)}</small></>}
                  />
                </List.Item>
              );
            }}
          />
        )}
      </Card>
    </div>
  );
}
