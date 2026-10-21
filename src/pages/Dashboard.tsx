import type { ReactNode } from "react";
import { Row, Col, Skeleton } from "antd";
import {
  ScheduleOutlined, CheckCircleOutlined, WarningOutlined, CalendarOutlined,
  FileTextOutlined, WalletOutlined, ExclamationCircleOutlined, TrophyOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import type { DashboardSummary } from "@/api/types";
import { formatInr } from "@/utils/format";
import { useAuth } from "@/auth/AuthContext";

type Tone = "primary" | "success" | "danger" | "info" | "neutral" | "warning";

const toneStyles: Record<Tone, { bg: string; fg: string }> = {
  primary: { bg: "var(--c-primary-light)", fg: "var(--c-primary-dark)" },
  success: { bg: "var(--c-success-bg)", fg: "var(--c-success)" },
  danger: { bg: "var(--c-danger-bg)", fg: "var(--c-danger)" },
  info: { bg: "var(--c-info-bg)", fg: "var(--c-info)" },
  warning: { bg: "var(--c-warning-bg)", fg: "var(--c-warning)" },
  neutral: { bg: "#f0f2f3", fg: "#475569" },
};

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => (await api.get<DashboardSummary>("/dashboard/summary")).data,
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("dashboard.greetingMorning") : hour < 17 ? t("dashboard.greetingAfternoon") : t("dashboard.greetingEvening");

  if (isLoading || !data) {
    return (
      <div>
        <Skeleton.Input active style={{ width: 240, marginBottom: 24 }} size="large" />
        <Row gutter={[16, 16]}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Col xs={12} sm={12} md={8} lg={6} key={i}>
              <div className="stat-card" style={{ cursor: "default" }}>
                <Skeleton active paragraph={{ rows: 1 }} />
              </div>
            </Col>
          ))}
        </Row>
      </div>
    );
  }

  const cards: { title: string; value: string; sub?: string; link: string; tone: Tone; icon: ReactNode }[] = [
    { title: t("dashboard.dueToday"), value: formatInr(data.dueTodayAmount), sub: `${data.dueTodayCount} ${t("dues.title").toLowerCase()}`, link: "/dues?tab=today", tone: "info", icon: <CalendarOutlined /> },
    { title: t("dashboard.collectedToday"), value: formatInr(data.collectedToday), link: "/dues?tab=paid", tone: "success", icon: <CheckCircleOutlined /> },
    { title: t("dashboard.overdue"), value: formatInr(data.overdueAmount), sub: `${data.overdueCount} ${t("dues.title").toLowerCase()}`, link: "/dues?tab=overdue", tone: "danger", icon: <WarningOutlined /> },
    { title: t("dashboard.upcoming7Days"), value: formatInr(data.upcoming7DaysAmount), sub: `${data.upcoming7DaysCount} ${t("dues.title").toLowerCase()}`, link: "/dues?tab=upcoming", tone: "primary", icon: <ScheduleOutlined /> },
    { title: t("dashboard.activeLoans"), value: String(data.activeLoans), link: "/loans?status=ACTIVE", tone: "neutral", icon: <FileTextOutlined /> },
    { title: t("dashboard.totalOutstanding"), value: formatInr(data.totalOutstanding), link: "/loans", tone: "neutral", icon: <WalletOutlined /> },
    { title: t("dashboard.penaltyAccrued"), value: formatInr(data.penaltyAccruedUnpaid), link: "/dues?tab=overdue", tone: "warning", icon: <ExclamationCircleOutlined /> },
    { title: t("dashboard.penaltyCollectedFy"), value: formatInr(data.penaltyCollectedThisFy), link: "/reports", tone: "primary", icon: <TrophyOutlined /> },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{greeting}{user?.name ? `, ${user.name.split(" ")[0]}` : ""}</h1>
          <p>{t("dashboard.subtitle")}</p>
        </div>
      </div>
      <Row gutter={[16, 16]}>
        {cards.map((c) => {
          const tone = toneStyles[c.tone];
          return (
            <Col xs={12} sm={12} md={8} lg={6} key={c.title}>
              <div className="stat-card" onClick={() => navigate(c.link)}>
                <div className="stat-icon" style={{ background: tone.bg, color: tone.fg }}>
                  {c.icon}
                </div>
                <div className="stat-label">{c.title}</div>
                <div className="stat-value">{c.value}</div>
                {c.sub && <div className="stat-sub">{c.sub}</div>}
              </div>
            </Col>
          );
        })}
      </Row>
    </div>
  );
}
