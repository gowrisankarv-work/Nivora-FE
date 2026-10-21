import { useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Layout, Menu, Badge, Dropdown, Avatar, Drawer, Button } from "antd";
import {
  DashboardOutlined, TeamOutlined, FileTextOutlined, ScheduleOutlined, GoldOutlined,
  CalculatorOutlined, UserOutlined, BellOutlined, SettingOutlined, AuditOutlined,
  MenuOutlined, LogoutOutlined, KeyOutlined, DownOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthContext";
import { LanguageToggle } from "./LanguageToggle";
import { api } from "@/api/client";

const { Header, Sider, Content } = Layout;

export function AppLayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdm = user?.role === "ADM";

  const items = useMemo(() => {
    const base = [
      { key: "/", icon: <DashboardOutlined />, label: t("nav.dashboard") },
      { key: "/customers", icon: <TeamOutlined />, label: t("nav.customers") },
      { key: "/loans", icon: <FileTextOutlined />, label: t("nav.loans") },
      { key: "/dues", icon: <ScheduleOutlined />, label: t("nav.dues") },
      { key: "/calculator", icon: <CalculatorOutlined />, label: t("nav.calculator") },
      { key: "/notifications", icon: <BellOutlined />, label: t("nav.notifications") },
    ];
    if (isAdm) {
      // Chit groups UI disabled - base.splice(4, 0, { key: "/chit-groups", icon: <GoldOutlined />, label: t("nav.chitGroups") });
      base.push(
        { key: "/users", icon: <UserOutlined />, label: t("nav.users") },
        { key: "/settings", icon: <SettingOutlined />, label: t("nav.settings") },
        { key: "/reports", icon: <AuditOutlined />, label: t("nav.reports") }
      );
    }
    return base;
  }, [isAdm, t]);

  const { data: unread } = useQuery({
    queryKey: ["unread-count"],
    queryFn: async () => (await api.get<{ count: number }>("/notifications/unread-count")).data.count,
    refetchInterval: 60000,
  });

  const selectedKey = items.map((i) => i.key).filter((k) => location.pathname === k || (k !== "/" && location.pathname.startsWith(k)))[0] || "/";

  const bottomNavItems = items.slice(0, 5);

  const userMenu = {
    items: [
      { key: "change-password", icon: <KeyOutlined />, label: t("common.changePassword") },
      { type: "divider" as const },
      { key: "logout", icon: <LogoutOutlined />, label: t("common.logout"), danger: true },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === "logout") {
        logout().then(() => navigate("/login"));
      } else if (key === "change-password") {
        navigate("/change-password");
      }
    },
  };

  const initials = (user?.name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sidebarContent = (
    <>
      <div className="sider-brand">
        <span className="sider-brand-mark">
          <img src="/logo-mark.svg" alt="" />
        </span>
        <span className="sider-brand-name">{t("app.name")}</span>
      </div>
      <Menu mode="inline" selectedKeys={[selectedKey]} items={items} onClick={({ key }) => navigate(key)} />
    </>
  );

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider breakpoint="md" collapsedWidth="0" width={248} className="desktop-only app-sider" trigger={null} theme="light">
        {sidebarContent}
      </Sider>
      <Layout>
        <Header className="app-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Button className="phone-only" type="text" icon={<MenuOutlined />} onClick={() => setMobileOpen(true)} />
            <span className="app-header-title phone-only">{t("app.name")}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <LanguageToggle />
            <Badge count={unread || 0} size="small" offset={[-2, 2]}>
              <Button type="text" shape="circle" className="icon-btn" icon={<BellOutlined />} onClick={() => navigate("/notifications")} />
            </Badge>
            <Dropdown menu={userMenu} trigger={["click"]}>
              <div className="user-chip">
                <Avatar size={34} style={{ background: "var(--c-primary)", fontWeight: 600, fontSize: 13 }}>{initials}</Avatar>
                <span className="desktop-only user-chip-info">
                  <span className="user-chip-name">{user?.name}</span>
                  <span className="user-chip-role">{user?.role === "ADM" ? t("users.adm") : t("users.staff")}</span>
                </span>
                <DownOutlined className="desktop-only" style={{ fontSize: 10, color: "var(--c-text-faint)" }} />
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="app-content">
          <Outlet />
        </Content>
      </Layout>
      <Drawer placement="left" open={mobileOpen} onClose={() => setMobileOpen(false)} styles={{ body: { padding: 0 } }} width={260} closable={false}>
        {sidebarContent}
      </Drawer>
      <div className="phone-only bottom-nav">
        {bottomNavItems.map((item) => (
          <div
            key={item.key}
            className={`bottom-nav-item touch-target ${selectedKey === item.key ? "active" : ""}`}
            onClick={() => navigate(item.key)}
          >
            {item.icon}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </Layout>
  );
}
